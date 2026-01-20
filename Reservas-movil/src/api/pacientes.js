import api from './axios';

// Nota: el backend expone pacientes vía ficha.controller:
// - GET /pacientes-usuario (auth)
// - POST /ficha (auth)
// - GET /ficha/:id
// - GET /ficha/rut/:rut (portalRutAuth)
// - PUT /ficha/:id

export const getPacientesUsuarioRequest = async () => api.get('/pacientes-usuario');

export const getPacienteRequest = async (id) => api.get(`/ficha/${id}`);

export const getPacientePorRutRequest = async (rut) => api.get(`/ficha/rut/${encodeURIComponent(rut)}/`);

export const createPacienteRequest = async (paciente) => api.post('/ficha', paciente);

export const updatePacienteRequest = async (id, paciente) => api.put(`/ficha/${id}`, paciente);

export const deletePacienteRequest = async (id) => api.delete(`/ficha/${id}`);
