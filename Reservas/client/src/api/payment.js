import axios from "./axios";

export const createPaymentRequest = async (reservaId, amount, patientRut) => 
  axios.post('/transbank/create', { reservaId, amount, patientRut });

export const confirmPaymentRequest = async (token) => 
  axios.post('/transbank/confirm', { token_ws: token });

export const getPaymentStatusRequest = async (reservaId) => 
  axios.get(`/transbank/status/${reservaId}`);