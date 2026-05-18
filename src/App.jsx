import { useState, useEffect } from 'react'
import { getGoldData, getKpis, scrapeGoldData, getFechas_extraccion } from './api'
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js'
import { Doughnut } from 'react-chartjs-2'
import './App.css'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function App() {
  const [goldData, setGoldData] = useState(null)
  const [kpis, setKpis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vistaActual, setVistaActual] = useState('monitor')
  
  // Estados para los Filtros del Buscador
  const [searchNombre, setSearchNombre] = useState('')
  const [searchFechaDesde, setSearchFechaDesde] = useState('')
  const [searchFechaHasta, setSearchFechaHasta] = useState('')
  const [filtroMarca, setFiltroMarca] = useState('')
  const [fechasExtraccion, setFechasExtraccion] = useState([])
  const [selectedFechaExtraccion, setSelectedFechaExtraccion] = useState('')
  const [filtroTienda, setFiltroTienda] = useState('')
  const [filtroPrecioMin, setFiltroPrecioMin] = useState('')
  const [filtroPrecioMax, setFiltroPrecioMax] = useState('')

  // Estilos de la barra de navegación interna
  const navBtn = {
    padding: '10px 20px',
    backgroundColor: '#e0e0e0',
    color: '#666',
    border: 'none',
    borderRadius: '5px 5px 0 0',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s'
  }
  const navBtnActive = { ...navBtn, backgroundColor: '#2196F3', color: 'white', fontWeight: 'bold' }

  // Agrupación dinámica para el gráfico de Donas usando los datos del catálogo
  const obtenerCantidadPorMarca = () => {
    if (!goldData || goldData.length === 0) return []
    const marcas = {}
    goldData.forEach(item => {
      const marca = item.marca || 'Sin marca'
      marcas[marca] = (marcas[marca] || 0) + (item.cantidad || 0)
    })
    return Object.entries(marcas)
                 .map(([marca, cantidad]) => ({ marca, cantidad }))
                 .sort((a, b) => b.cantidad - a.cantidad)
  }

  const cantidadPorMarca = obtenerCantidadPorMarca()
  
  const chartData = {
    labels: cantidadPorMarca.map(item => item.marca),
    datasets: [{
      label: 'Cantidad por Marca',
      data: cantidadPorMarca.map(item => item.cantidad),
      backgroundColor: ['#2196F3', '#4CAF50', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#9E9E9E', '#FFC107', '#3F51B5'],
      borderColor: '#ffffff',
      borderWidth: 2
    }]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          label: context => `${context.label}: ${context.formattedValue} unidades`
        }
      }
    }
  }

  const getRecordDate = (item) => {
    const raw = item.fecha || item.fecha_registro || item.created_at || item.date || item.fecha_extraccion
    if (!raw) return null
    const parsed = new Date(raw)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  // Lógica de filtrado en tiempo real en el cliente
  const filteredGoldData = () => {
    if (!goldData || goldData.length === 0) return []

    return goldData.filter(item => {
      const nombre = String(item.nombre_canonico || '').toLowerCase()
      const marca = String(item.marca || '').toLowerCase()
      const tienda = String(item.tienda || '').toLowerCase()
      const fecha = getRecordDate(item)
      const precioMin = parseFloat(item.precio_minimo) || 0
      const precioMax = parseFloat(item.precio_maximo) || 0

      if (searchNombre.trim() && !nombre.includes(searchNombre.trim().toLowerCase())) return false
      if (filtroMarca && !marca.includes(filtroMarca.toLowerCase())) return false
      if (filtroTienda && !tienda.includes(filtroTienda.toLowerCase())) return false
      
      if (searchFechaDesde) {
        const desde = new Date(searchFechaDesde)
        if (!fecha || fecha < desde) return false
      }
      if (searchFechaHasta) {
        const hasta = new Date(searchFechaHasta + 'T23:59:59')
        if (!fecha || fecha > hasta) return false
      }
      if (filtroPrecioMin !== '' && precioMax < parseFloat(filtroPrecioMin)) return false
      if (filtroPrecioMax !== '' && precioMin > parseFloat(filtroPrecioMax)) return false

      return true
    })
  }

  const filteredData = filteredGoldData()
  const marcasDisponibles = Array.from(new Set((goldData || []).map(item => item.marca).filter(Boolean)))
  const tiendasDisponibles = Array.from(new Set((goldData || []).map(item => item.tienda).filter(Boolean)))

  const clearFilters = () => {
    setSearchNombre(''); setSearchFechaDesde(''); setSearchFechaHasta('')
    setFiltroMarca(''); setFiltroTienda(''); setFiltroPrecioMin(''); setFiltroPrecioMax('')
  }

  // Carga concurrente de los datos de la API usando Axios
  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [tablaData, kpisData] = await Promise.all([getGoldData(), getKpis()])
      setGoldData(Array.isArray(tablaData) ? tablaData : [tablaData])
      setKpis(kpisData)
    } catch (err) {
      setError(`Error al cargar datos desde el backend: ${err.response?.data?.detail || err.message}`)
    } finally {
      setLoading(false)
    }
  }

const loadFechas = async () => {
  try {
    const res = await getFechas_extraccion()
    // Normalizar la respuesta: puede ser array de strings o array de objetos {fecha_activa: ...}
    if (Array.isArray(res)) {
      const normalized = res.map(item => {
        if (!item) return null
        if (typeof item === 'string') return item
        if (typeof item === 'object') return item.fecha_activa ?? item.fecha ?? Object.values(item)[0]
        return String(item)
      }).filter(Boolean)
      setFechasExtraccion(normalized)
    } else {
      setFechasExtraccion([])
    }
  } catch (err) {
    console.error('No se pudieron cargar las fechas de extracción:', err)
  }
}

useEffect(() => { loadData(); loadFechas() }, [])

  // Ejecución asíncrona del Pipeline de Scraping
  const handleScrape = async () => {
    setLoading(true)
    try {
      const res = await scrapeGoldData()
      alert(res.message)
    } catch (err) {
      setError(`Error en ejecución del pipeline: ${err.response?.data?.detail || err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '30px', color: '#333' }}>📊 Laptops Insight Dashboard</h1>
      
      <nav style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
        <button onClick={() => setVistaActual('monitor')} style={vistaActual === 'monitor' ? navBtnActive : navBtn}>📊 Monitor de Modelos</button>
        <button onClick={() => setVistaActual('graficos')} style={vistaActual === 'graficos' ? navBtnActive : navBtn}>📈 Gráficos de Distribución</button>
      </nav>

      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <button onClick={loadData} disabled={loading} style={{ padding: '12px 24px', margin: '5px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>↻ Sincronizar Base de Datos</button>
        <button onClick={handleScrape} disabled={loading} style={{ padding: '12px 24px', margin: '5px', backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '5px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>⚙️ Ejecutar Scraping & ETL</button>
      </div>

      {loading && <p style={{ textAlign: 'center', color: '#666', fontSize: '16px' }}>⏳ Esperando respuesta de Axios y PostgreSQL...</p>}
      {error && <p style={{ color: '#d32f2f', textAlign: 'center', backgroundColor: '#ffebee', padding: '15px', borderRadius: '5px' }}>❌ {error}</p>}

      {goldData && goldData.length > 0 && !loading && vistaActual === 'monitor' && (
        <div>
          {/* Tarjetas informativas basadas en la respuesta /gold/kpis */}
          {kpis && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '15px', marginBottom: '30px' }}>
              <div style={{ backgroundColor: '#e8f5e9', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #4CAF50' }}>
                <span style={{ color: '#2e7d32', fontSize: '13px', fontWeight: 'bold' }}>Precio Mínimo Encontrado</span>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50', margin: 0 }}>
                ${Math.min(...kpis.map(item => item.precio_minimo_mercado || 0)).toFixed(2)}
                </p>
              </div>
              <div style={{ backgroundColor: '#ffebee', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #F44336' }}>
                <span style={{ color: '#c62828', fontSize: '13px', fontWeight: 'bold' }}>Precio Máximo Encontrado</span>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#F44336', margin: 0 }}>
                ${Math.max(...kpis.map(item => item.precio_maximo_mercado || 0)).toFixed(2)}
                </p>
              </div>
              <div style={{ backgroundColor: '#fff3e0', padding: '20px', borderRadius: '8px', textAlign: 'center', border: '2px solid #FF9800' }}>
                <h3 style={{ color: '#e65100', marginBottom: '10px' }}>📊 Total general</h3>
                <p style={{ fontSize: '28px', fontWeight: 'bold', color: '#FF9800', margin: 0 }}>
                  {kpis.map(item => item.total_equipos || 'N/A').pop()}
                </p>
              </div>
              <div style={{ backgroundColor: '#e3f2fd', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #2196F3' }}>
                <span style={{ color: '#1565c0', fontSize: '13px', fontWeight: 'bold' }}>Líder de Stock Volumétrico</span>
                <p style={{ fontSize: '22px', fontWeight: 'bold', color: '#2196F3', margin: '5px 0 0 0' }}>{kpis.map(item => item.marca_top || 'N/A').pop()}</p>
              </div>
              <div style={{ backgroundColor: '#fff3e0', padding: '15px', borderRadius: '8px', textAlign: 'center', border: '1px solid #FF9800' }}>
                <span style={{ color: '#e65100', fontSize: '13px', fontWeight: 'bold' }}>Hardware Promedio</span>
                <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#FF9800', margin: '5px 0 0 0' }}>RAM: {kpis.map(item => item.avg_ram || 'N/A').pop()}GB | SSD: {kpis.map(item => item.avg_ssd || 'N/A').pop()}GB</p>
              </div>
            </div>
          )}

          {/* Formulario de Parámetros de Filtrado */}
          <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>🔍 Buscar por Nombre Canónico</label>
                <input
                  type="text"
                  value={searchNombre}
                  onChange={e => setSearchNombre(e.target.value)}
                  placeholder="Escribe un nombre de laptop..."
                  style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>🏷️ Filtrar Fabricante</label>
                <select value={filtroMarca} onChange={e => setFiltroMarca(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }}>
                  <option value="">Todos</option>
                  {marcasDisponibles.map((m, idx) => <option key={idx} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>🏪 Filtrar Retailer</label>
                <select value={filtroTienda} onChange={e => setFiltroTienda(e.target.value)} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', width: '100%', boxSizing: 'border-box' }}>
                  <option value="">Todas</option>
                  {tiendasDisponibles.map((t, idx) => <option key={idx} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '15px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600' }}>📅 fecheas extraccion</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={selectedFechaExtraccion} onChange={e => {
                      const val = e.target.value
                      setSelectedFechaExtraccion(val)
                      if (!val) {
                        setSearchFechaDesde('')
                        setSearchFechaHasta('')
                      } else {
                        // normalizar a yyyy-mm-dd si viene con timestamp
                        const d = new Date(val)
                        if (!Number.isNaN(d.getTime())) {
                          const iso = d.toISOString().slice(0,10)
                          setSearchFechaDesde(iso)
                          setSearchFechaHasta(iso)
                        } else {
                          setSearchFechaDesde(val)
                          setSearchFechaHasta(val)
                        }
                      }
                    }} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: 'white' }}>
                    <option value="">Todas</option>
                    {fechasExtraccion.map((f, idx) => {
                      const d = new Date(f)
                      const label = Number.isNaN(d.getTime()) ? String(f) : d.toISOString().slice(0,10)
                      return <option key={idx} value={f}>{label}</option>
                    })}
                  </select>
                  <input type="date" value={searchFechaDesde} onChange={e => { setSearchFechaDesde(e.target.value); setSelectedFechaExtraccion('') }} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ccc' }} />
                </div>
              </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#27ae60' }}>💰 Precio mínimo (S/)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={filtroPrecioMin}
                  onChange={e => setFiltroPrecioMin(e.target.value)}
                  placeholder="Ej: 500"
                  style={{ padding: '10px', borderRadius: '6px', border: '2px solid #4CAF50', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#c0392b' }}>💰 Precio máximo (S/)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  value={filtroPrecioMax}
                  onChange={e => setFiltroPrecioMax(e.target.value)}
                  placeholder="Ej: 3000"
                  style={{ padding: '10px', borderRadius: '6px', border: '2px solid #F44336', width: '100%', boxSizing: 'border-box' }}
                />
              </div>
              <button onClick={clearFilters} style={{ padding: '10px 18px', backgroundColor: '#607D8B', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>✕ Limpiar</button>
            </div>

            {/* Resumen de filtros activos */}
            {(searchNombre || filtroMarca || filtroTienda || searchFechaDesde || searchFechaHasta || filtroPrecioMin || filtroPrecioMax) && (
              <div style={{ backgroundColor: '#e3f2fd', border: '1px solid #90caf9', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#1565c0', marginTop: '15px' }}>
                ℹ️ Mostrando <strong>{filteredData.length}</strong> de <strong>{goldData.length}</strong> registros con los filtros activos.
              </div>
            )}
          </div>

          {/* Tabla Desplegable de Modelos */}
          <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#444' }}>📋 Catálogo Canónico Agrupado (Muestra de 15 ítems)</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#e0e0e0' }}>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Nombre Canónico</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Marca</th>
                    <th style={{ padding: '12px', textAlign: 'left' }}>Tienda</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Disponibles</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Precio Mín</th>
                    <th style={{ padding: '12px', textAlign: 'right' }}>Precio Máx</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 15).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #ddd', backgroundColor: i % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '12px', color: '#333', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre_canonico}</td>
                      <td style={{ padding: '12px', color: '#555' }}>{item.marca}</td>
                      <td style={{ padding: '12px', color: '#555' }}>{item.tienda}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#FF9800' }}>{item.cantidad}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#4CAF50' }}>S/{Number(item.precio_minimo).toFixed(2)}</td>
                      <td style={{ padding: '12px', textAlign: 'right', fontWeight: 'bold', color: '#d32f2f' }}>S/{Number(item.precio_maximo).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sección del Gráfico de Donas */}
      {goldData && goldData.length > 0 && !loading && vistaActual === 'graficos' && (
        <div style={{ backgroundColor: '#f5f5f5', padding: '20px', borderRadius: '8px', minHeight: '400px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#444' }}>Distribución Porcentual del Mercado por Marca</h3>
          {cantidadPorMarca.length > 0 ? (
            <div style={{ height: '320px' }}>
              <Doughnut data={chartData} options={chartOptions} />
            </div>
          ) : (
            <p style={{ textAlign: 'center', color: '#666' }}>No hay marcas procesadas en la capa Silver Clean.</p>
          )}
        </div>
      )}
    </div>
  )
}