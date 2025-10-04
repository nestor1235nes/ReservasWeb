import axios from './axios';

export const getSucursalesRequest = async () => axios.get(`/obtener-sucursales/`);
export const getSucursalRequest = async () => axios.get(`/obtener-sucursal-usuario`);
export const createSucursalRequest = async (sucursal) => axios.post(`/crear-sucursal`, sucursal);
export const updateSucursalRequest = async (id, sucursal) => axios.put(`/actualizar-sucursal/${id}`, sucursal);
export const deleteSucursalRequest = async (id) => axios.delete(`/eliminar-sucursal/${id}`);
export const getReservasSucursalRequest = async (id) => axios.get(`/obtener-reservas-sucursal/${id}`);
export const esAdminRequest = async (id) => axios.get(`/es-admin/${id}`);

export const getAsistentesSucursalRequest = async (id) => axios.get(`/obtener-asistentes-sucursal/${id}`);
export const agregarProfesionalRequest = async (sucursalId, profesionalId) =>
  axios.post(`/sucursal/${sucursalId}/profesionales`, { profesionalId });

export const quitarProfesionalRequest = async (sucursalId, profesionalId) =>
  axios.delete(`/sucursal/${sucursalId}/profesionales`, { data: { profesionalId } });

export const getProfesionalesSucursalRequest = async (sucursalId) =>
  axios.get(`/sucursal/${sucursalId}/profesionales`);

export const agregarAsistenteRequest = async (sucursalId, asistenteId) =>
  axios.post(`/sucursal/${sucursalId}/asistentes`, { asistenteId });

export const eliminarAsistenteRequest = async (sucursalId, asistenteId) =>
  axios.delete(`/sucursal/${sucursalId}/asistentes/${asistenteId}`);

export const esAsistenteRequest = async (id) => axios.get(`/es-asistente/${id}`);