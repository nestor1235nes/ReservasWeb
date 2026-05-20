import axios from './axios';

// --- Boxes CRUD ---
export const getBoxesSucursalRequest = (sucursalId, soloActivos = false) =>
  axios.get(`/sucursal/${sucursalId}/boxes${soloActivos ? '?activo=true' : ''}`);

export const getBoxRequest = (id) => axios.get(`/boxes/${id}`);

export const crearBoxRequest = (sucursalId, data) =>
  axios.post(`/sucursal/${sucursalId}/boxes`, data);

export const actualizarBoxRequest = (id, data) => axios.put(`/boxes/${id}`, data);

export const eliminarBoxRequest = (id) => axios.delete(`/boxes/${id}`);

export const toggleActivoBoxRequest = (id) => axios.patch(`/boxes/${id}/toggle-activo`);

// --- Agenda / Ocupación ---
export const getAgendaSucursalRequest = (sucursalId, fecha) =>
  axios.get(`/sucursal/${sucursalId}/boxes/agenda`, { params: { fecha } });

export const getOcupacionesBoxRequest = (boxId, fecha) =>
  axios.get(`/boxes/${boxId}/ocupaciones`, { params: { fecha } });

export const verificarDisponibilidadRequest = (boxId, { fecha, horaInicio, horaFin }) =>
  axios.get(`/boxes/${boxId}/disponibilidad`, { params: { fecha, horaInicio, horaFin } });

export const crearOcupacionRequest = (boxId, data) =>
  axios.post(`/boxes/${boxId}/ocupaciones`, data);

export const actualizarOcupacionRequest = (id, data) =>
  axios.put(`/boxes-ocupaciones/${id}`, data);

export const cambiarEstadoOcupacionRequest = (id, estado, horaFin = undefined) =>
  axios.patch(`/boxes-ocupaciones/${id}/estado`, { estado, ...(horaFin ? { horaFin } : {}) });

export const cancelarOcupacionRequest = (id) =>
  axios.delete(`/boxes-ocupaciones/${id}`);
