import axios from './axios';

export const requestPatientOtpRequest = async (rut) => axios.post('patient-auth/request-otp', { rut });
export const verifyPatientOtpRequest = async (rut, code) => axios.post('patient-auth/verify-otp', { rut, code });
