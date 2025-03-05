import axios from "./axios";

export const obtenerHorasDisponiblesRequest = async (id, fecha) => axios.get(`/horas-disponibles`, { params: { id, fecha } });
export const liberarHorasRequest = async (data) => axios.post(`/liberar-horas`, data);