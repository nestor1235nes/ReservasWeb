import api from './axios';

// CRUD de boxes (salas) — todas requieren auth; crear/editar/eliminar/toggle
// exigen además ser administrador de la sucursal (el backend responde 403 si no).

export const getBoxesSucursalRequest = async (sucursalId, params) =>
  api.get(`/sucursal/${sucursalId}/boxes`, { params });

export const getBoxRequest = async (id) => api.get(`/boxes/${id}`);

export const crearBoxRequest = async (sucursalId, data) =>
  api.post(`/sucursal/${sucursalId}/boxes`, data);

export const actualizarBoxRequest = async (id, data) => api.put(`/boxes/${id}`, data);

export const eliminarBoxRequest = async (id) => api.delete(`/boxes/${id}`);

export const toggleActivoBoxRequest = async (id) => api.patch(`/boxes/${id}/toggle-activo`);

// Agenda / ocupaciones. Crear exige ser admin/profesional/asistente de la sucursal;
// editar/cambiar estado/cancelar exige ser admin o dueño (solicitadoPor).

export const getAgendaSucursalRequest = async (sucursalId, params) =>
  api.get(`/sucursal/${sucursalId}/boxes/agenda`, { params }); // ?fecha=YYYY-MM-DD

export const getOcupacionesBoxRequest = async (boxId, params) =>
  api.get(`/boxes/${boxId}/ocupaciones`, { params }); // ?fecha=YYYY-MM-DD

export const verificarDisponibilidadRequest = async (boxId, params) =>
  api.get(`/boxes/${boxId}/disponibilidad`, { params }); // ?fecha=&horaInicio=&horaFin=

export const crearOcupacionRequest = async (boxId, data) =>
  api.post(`/boxes/${boxId}/ocupaciones`, data); // { fecha, horaInicio, horaFin, tipo?, motivo?, notas?, paciente? }

export const actualizarOcupacionRequest = async (id, data) =>
  api.put(`/boxes-ocupaciones/${id}`, data);

export const cambiarEstadoOcupacionRequest = async (id, data) =>
  api.patch(`/boxes-ocupaciones/${id}/estado`, data); // { estado, horaFin? }

// No borra: el backend hace soft-cancel (estado = "cancelado").
export const cancelarOcupacionRequest = async (id) => api.delete(`/boxes-ocupaciones/${id}`);
