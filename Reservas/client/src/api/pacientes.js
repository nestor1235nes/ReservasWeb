import axios from "axios";

export const getPacientePorRutRequest = async (rut) => axios.get(`/api/ficha/rut/${rut}`);
export const getPacientesRequest = async () => axios.get(`/api/ficha/`);
export const getPacienteRequest = async (id) => axios.get(`/api/ficha/${id}`);
export const createPacienteRequest = async (paciente) => axios.post(`/api/ficha`, paciente);
export const updatePacienteRequest = async (id, paciente) => axios.put(`/api/ficha/${id}`, paciente);