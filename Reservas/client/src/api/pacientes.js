import axios from "./axios";

export const getPacientePorRutRequest = async (rut) => axios.get(`/ficha/rut/${rut}`);
export const getPacientesRequest = async () => axios.get(`/ficha/`);
export const getPacienteRequest = async (id) => axios.get(`/ficha/${id}`);
export const createPacienteRequest = async (paciente) => axios.post(`/ficha`, paciente);
export const updatePacienteRequest = async (id, paciente) => axios.put(`/ficha/${id}`, paciente); // Cambiar de rut a id
export const getPacientesUsuarioRequest = async () => axios.get(`/pacientes-usuario`);