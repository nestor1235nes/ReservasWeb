import axios from "axios";

export const createPaymentRequest = async (reservaId, amount, patientRut) => 
  axios.post('/api/transbank/create', { reservaId, amount, patientRut });

export const confirmPaymentRequest = async (token) => 
  axios.post('/api/transbank/confirm', { token_ws: token });

export const getPaymentStatusRequest = async (reservaId) => 
  axios.get(`/api/transbank/status/${reservaId}`);