import api from './axios';

export const updateConfirmStatusRequest = async (reservaId, status) =>
  api.patch(`/reserva/${encodeURIComponent(reservaId)}/confirm-status`, { status });
