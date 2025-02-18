import axios from "axios";

export const getReservasRequest = async () => axios.get(`/api/reserva/`);
export const getReservaRequest = async (id) => axios.get(`/api/reserva/${id}`);
export const createReservaRequest = async (rut, reserva) => axios.post(`/api/reserva/${rut}`, reserva);
export const deleteReservaRequest = async (id) => axios.delete(`/api/reserva/${id}`);
export const updateReservaRequest = async (rut, reserva) => axios.put(`/api/reserva/${rut}`, reserva);
export const getHistorialRequest = async (id) => axios.get(`/api/reserva/${id}/historial`);
export const addHistorialRequest = async (id, historial) => axios.post(`/api/reserva/${id}/historial`, historial);

// Funciones

export const obtenerPacientesSinSesionesRequest = async () => axios.get(`/api/pacientes-sin-sesiones`);