import axios from "./axios";

export const getReservasRequest = async () => axios.get(`/reserva/`);
export const getReservaRequest = async (rut) => axios.get(`/reserva/${rut}`);
export const createReservaRequest = async (rut, reserva) => axios.post(`/reserva/${rut}`, reserva);
export const deleteReservaRequest = async (id) => axios.delete(`/reserva/${id}`);
export const updateReservaRequest = async (rut, reserva) => axios.put(`/reserva/${rut}`, reserva);
export const getHistorialRequest = async (rut) => axios.get(`/reserva/${rut}/historial`);
export const addHistorialRequest = async (rut, data) => axios.post(`/reserva/${rut}/historial`, data);

// Funciones

export const obtenerPacientesSinSesionesRequest = async () => axios.get(`/pacientes-sin-sesiones`);
export const getFeriadosRequest = async (year, country) => axios.get(`/feriados`, { params: { year, country } });
export const getReservasPorRutRequest = async (rut) => axios.get(`/reserva/${rut}/todas`);
export const getReservasParaExportacionRequest = async () => axios.get(`/reservas-exportacion`);