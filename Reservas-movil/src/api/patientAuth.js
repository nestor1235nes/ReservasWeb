import api from './axios';

// Solicitar OTP para paciente
export const requestPatientOtpRequest = async (rut) => 
  api.post('/patient-auth/request-otp', { rut });

// Verificar OTP de paciente
export const verifyPatientOtpRequest = async (rut, code) => 
  api.post('/patient-auth/verify-otp', { rut, code });
