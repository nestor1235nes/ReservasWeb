import axios from "./axios";

export const obtenerHorasDisponiblesRequest = async (id, fecha) => axios.get(`/horas-disponibles`, { params: { id, fecha } });
export const liberarHorasRequest = async (data) => axios.post(`/liberar-horas`, data);
export const getBlockedDaysRequest = async (id) => axios.get(`/blocked-days`, { params: { id } });