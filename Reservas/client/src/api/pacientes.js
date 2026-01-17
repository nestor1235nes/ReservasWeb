import axios from "./axios";

export const getPacientePorRutRequest = async (rut, token) =>
	axios.get(`ficha/rut/${rut}`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);

export const updatePacientePublicPorRutRequest = async (rut, data, token) =>
	axios.put(`public/ficha/rut/${rut}`, data, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
export const getPacientesRequest = async () => axios.get(`ficha/`);
export const getPacienteRequest = async (id) => axios.get(`ficha/${id}`);
export const createPacienteRequest = async (paciente) => axios.post(`ficha`, paciente);
export const updatePacienteRequest = async (id, paciente) => axios.put(`ficha/${id}`, paciente); // Cambiar de rut a id
export const getPacientesUsuarioRequest = async () => axios.get(`pacientes-usuario`);