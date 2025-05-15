import axios from 'axios';

export const getSucursalesRequest = async () => axios.get(`/api/obtener-sucursales/`);
export const getSucursalRequest = async (id) => axios.get(`/api/obtener-sucursal/${id}`);
export const createSucursalRequest = async (sucursal) => axios.post(`/api/crear-sucursal`, sucursal);
export const updateSucursalRequest = async (id, sucursal) => axios.put(`/api/actualizar-sucursal/${id}`, sucursal);
export const deleteSucursalRequest = async (id) => axios.delete(`/api/eliminar-sucursal/${id}`);
export const getReservasSucursalRequest = async (id) => axios.get(`/api/obtener-reservas-sucursal/${id}`);
export const esAdminRequest = async (id) => axios.get(`/api/es-admin/${id}`);