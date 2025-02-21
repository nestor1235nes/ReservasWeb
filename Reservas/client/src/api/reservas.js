import axios from "axios";

export const getReservasRequest = async () => axios.get(`/api/reserva/`);
export const getReservaRequest = async (rut) => axios.get(`/api/reserva/${rut}`);
export const createReservaRequest = async (rut, reserva) => axios.post(`/api/reserva/${rut}`, reserva);
export const deleteReservaRequest = async (id) => axios.delete(`/api/reserva/${id}`);
export const updateReservaRequest = async (rut, reserva) => axios.put(`/api/reserva/${rut}`, reserva);
export const getHistorialRequest = async (rut) => axios.get(`/api/reserva/${rut}/historial`);
export const addHistorialRequest = async (rut, data) => axios.post(`/api/reserva/${rut}/historial`, data);

// Funciones

export const obtenerPacientesSinSesionesRequest = async () => axios.get(`/api/pacientes-sin-sesiones`);