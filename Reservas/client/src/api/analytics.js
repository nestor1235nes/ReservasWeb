import axios from "./axios";

export const getEstadisticasGeneralesRequest = async () => 
  axios.get('/analytics/estadisticas-generales');

export const getEstadisticasPorPeriodoRequest = async (periodo) => 
  axios.get(`/analytics/estadisticas-periodo?periodo=${periodo}`);

export const getTendenciasMensualesRequest = async () => 
  axios.get('/analytics/tendencias-mensuales');
