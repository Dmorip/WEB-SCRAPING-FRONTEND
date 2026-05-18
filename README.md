# Practica Scraping Frontend

Este proyecto es una aplicación frontend en React + Vite que consume datos de un backend de scraping/ETL para mostrar información de laptops extraídas y limpiadas.

## Descripción

La aplicación ofrece:

- Dashboard de laptops con métricas clave (KPIs).
- Filtrado por nombre, marca, tienda, rango de precios y fecha de extracción.
- Visualización de la distribución de stock por marca.
- Botón para ejecutar el pipeline de scraping/ETL.
- Selección de fechas de extracción disponibles desde el backend.

## Estructura del proyecto

- `/frontend`
  - `src/` - código fuente de la aplicación React.
  - `public/` - activos públicos.
  - `package.json` - dependencias y scripts de desarrollo.
  - `README.md` - plantilla de Vite existente.
- `package.json` - archivo de dependencias generales del proyecto.
- `activacion_desactivacion.txt` - archivo extra en la raíz.

## Tecnologías

- React
- Vite
- Axios
- Chart.js + react-chartjs-2
- Recharts
- ESLint

## Instalación y ejecución

1. Instala dependencias en el frontend:

```bash
cd frontend
npm install
```

2. Inicia la aplicación en desarrollo:

```bash
npm run dev
```

3. Abre la URL que muestra Vite en el navegador (por defecto `http://127.0.0.1:5173`).

## Backend esperado

El frontend consume un backend REST en `http://127.0.0.1:8000` y espera los siguientes endpoints:

- `GET /gold/kpis`
- `GET /gold/nombre_canonico`
- `GET /gold/marcas`
- `GET /gold/fechas_extraccion_limpieza`
- `POST /run-pipeline`

> El endpoint de fechas de extracción ya está implementado en el backend y debe devolver un array de fechas válidas para alimentar el filtro de fechas.

## Uso

- Usa el botón `↻ Sincronizar Base de Datos` para recargar los datos desde el backend.
- Usa el botón `⚙️ Ejecutar Scraping & ETL` para disparar el pipeline.
- Filtra la lista de laptops por nombre, marca, tienda, precio o fecha de extracción.
- Cambia entre la vista de tablas y gráficos con las pestañas superiores.

## Notas

- Si la aplicación no muestra fechas de extracción, verifica que el backend devuelva un arreglo de objetos con `fecha_activa` o valores de fecha legibles.
- El código del frontend está en `frontend/src/App.jsx` y `frontend/src/api.js`.
