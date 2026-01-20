import api from './axios';

export const getMeRequest = async () => api.get('/auth/me');

export const updateMeRequest = async (data) => api.put('/auth/me', data);
