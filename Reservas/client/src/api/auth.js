import axios from "./axios";

export const registerRequest = async (user) => axios.post(`/auth/register`, user);

export const loginRequest = async (user) => axios.post(`/auth/login`, user);

export const verifyTokenRequest = async () => axios.get(`/auth/verify`);

export const updatePerfilRequest = async (id, data) => axios.put(`/auth/${id}`, data);

export const deleteBloqueHorarioRequest = async (id, bloque) => axios.put(`/auth/${id}/timetable/${bloque}`);

export const getProfileRequest = async (id) => axios.get(`/auth/${id}`);

export const getAllUsersRequest = async () => axios.get(`/auth`);

export const updateNotificationsRequest = async (id, data) => axios.post(`/auth/notifications/${id}`, data);

export const deleteNotificationsRequest = async (id) => axios.delete(`/auth/notifications/${id}`);