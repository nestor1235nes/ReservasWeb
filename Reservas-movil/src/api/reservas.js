import api from './axios';

// Nota: el backend usa las rutas singular "reserva" y algunas rutas auxiliares.

// Reservas visibles para el usuario autenticado
export const getReservasRequest = async () => api.get('/reserva');

// Reserva "principal" del paciente por RUT (legacy)
export const getReservaPorRutRequest = async (rut) => api.get(`/reserva/${encodeURIComponent(rut)}`);

// Crear/actualizar reserva para paciente por RUT
export const createReservaRequest = async (rut, reserva) => api.post(`/reserva/${encodeURIComponent(rut)}`, reserva);
export const updateReservaRequest = async (rut, reserva) => api.put(`/reserva/${encodeURIComponent(rut)}`, reserva);

// Historial clínico (casos clínicos + sesiones) por RUT
export const getHistorialRequest = async (rut, params = {}) =>
  api.get(`/reserva/${encodeURIComponent(rut)}/historial`, { params });

// Agregar sesión al caso clínico activo (historial)
export const addHistorialRequest = async (rut, payload) =>
  api.post(`/reserva/${encodeURIComponent(rut)}/historial`, payload);

// Todas las reservas asociadas a un paciente por RUT (portalRutAuth)
export const getReservasPorRutRequest = async (rut) => api.get(`/reserva/${encodeURIComponent(rut)}/todas`);
