import axios from './axios.js';

export const generateConfirmLink = (reservaId) =>
  axios.post(`/reserva/${reservaId}/confirm-link`).then(r => r.data);

export const resendConfirmLink = (reservaId) =>
  axios.post(`/reserva/${reservaId}/confirm-link/resend`).then(r => r.data);

export const resolveToken = (token) =>
  axios.get(`/confirmacion/${token}`).then(r => r.data);

export const confirmByToken = (token) =>
  axios.post(`/confirmacion/${token}/confirm`).then(r => r.data);

export const cancelByToken = (token) =>
  axios.post(`/confirmacion/${token}/cancel`).then(r => r.data);

export const requestReschedule = (token, payload) =>
  axios.post(`/confirmacion/${token}/reschedule`, payload).then(r => r.data);

export const updateConfirmStatus = (reservaId, status) =>
  axios.patch(`/reserva/${reservaId}/confirm-status`, { status }).then(r => r.data);

export default {
  generateConfirmLink,
  resendConfirmLink,
  resolveToken,
  confirmByToken,
  cancelByToken,
  requestReschedule,
  updateConfirmStatus
};