import axios from 'axios';

export const getSucursalesRequest = async () => axios.get(`/api/obtener-sucursales/`);
export const getSucursalRequest = async () => axios.get(`/api/obtener-sucursal-usuario`);
export const createSucursalRequest = async (sucursal) => axios.post(`/api/crear-sucursal`, sucursal);
export const updateSucursalRequest = async (id, sucursal) => axios.put(`/api/actualizar-sucursal/${id}`, sucursal);
export const deleteSucursalRequest = async (id) => axios.delete(`/api/eliminar-sucursal/${id}`);
export const getReservasSucursalRequest = async (id) => axios.get(`/api/obtener-reservas-sucursal/${id}`);
export const esAdminRequest = async (id) => axios.get(`/api/es-admin/${id}`);

export const getAsistentesSucursalRequest = async (id) => axios.get(`/api/obtener-asistentes-sucursal/${id}`);
export const agregarProfesionalRequest = async (sucursalId, profesionalId) =>
  axios.post(`/api/sucursal/${sucursalId}/profesionales`, { profesionalId });

export const quitarProfesionalRequest = async (sucursalId, profesionalId) =>
  axios.delete(`/api/sucursal/${sucursalId}/profesionales`, { data: { profesionalId } });

export const getProfesionalesSucursalRequest = async (sucursalId) =>
  axios.get(`/api/sucursal/${sucursalId}/profesionales`);

export const agregarAsistenteRequest = async (sucursalId, asistenteId) =>
  axios.post(`/api/sucursal/${sucursalId}/asistentes`, { asistenteId });

export const eliminarAsistenteRequest = async (sucursalId, asistenteId) =>
  axios.delete(`/api/sucursal/${sucursalId}/asistentes/${asistenteId}`);

export const esAsistenteRequest = async (id) => axios.get(`/api/es-asistente/${id}`);