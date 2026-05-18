import axios from 'axios';

// Esta es la URL donde corre tu FastAPI
const API_BASE_URL = 'http://127.0.0.1:8000';

/**
 * Obtiene los KPIs globales unificados (Precio min/max, promedios, marca líder, etc.)
 * Mapeado a: GET /gold/kpis
 */
export const getKpis = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/gold/kpis`);
    return response.data;
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    throw error;
  }
};

/**
 * Obtiene el listado de laptops agrupado por su nombre canónico
 * Mapeado a: GET /gold/nombre_canonico
 */
export const getGoldData = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/gold/nombre_canonico`);
    return response.data;
  } catch (error) {
    console.error('Error fetching canonical gold data:', error);
    throw error;
  }
};

/**
 * Obtiene las estadísticas resumidas por marcas
 * Mapeado a: GET /gold/marcas
 */
export const getStatsMarcas = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/gold/marcas`);
    return response.data;
  } catch (error) {
    console.error('Error fetching stats marcas:', error);
    throw error;
  }
};

export const getFechas_extraccion = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/gold/fechas_extraccion_limpieza`);
    return response.data;
  } catch (error) {
    console.error('Error fetching extraction dates:', error);
    throw error;
  }
};

/**
 * Dispara el pipeline completo de scraping y limpieza de datos (Capa Silver Clean)
 * Mapeado a: POST /run-pipeline
 */
export const scrapeGoldData = async () => {
  try {
    const response = await axios.post(`${API_BASE_URL}/run-pipeline`);
    return response.data;
  } catch (error) {
    console.error('Error executing pipeline:', error);
    throw error;
  }
};