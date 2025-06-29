import axios from "./axios";

export const registerRequest = async (user) => axios.post(`/auth/register`, user);

export const registerUserOnlyRequest = async (user) => axios.post(`/auth/register-only`, user);

export const loginRequest = async (user) => axios.post(`/auth/login`, user);

export const deleteUserRequest = async (id) => axios.delete(`/auth/${id}`);

export const verifyTokenRequest = async () => axios.get(`/auth/verify`);

export const updatePerfilRequest = async (id, data) => axios.put(`/auth/${id}`, data);

export const deleteBloqueHorarioRequest = async (id, index) => axios.put(`/auth/${id}/timetable/${index}`);

export const getProfileRequest = async (id) => axios.get(`/auth/${id}`);

export const getAllUsersRequest = async () => axios.get(`/auth`);

export const updateNotificationsRequest = async (id, data) => axios.post(`/auth/notifications/${id}`, data);

export const deleteNotificationsRequest = async (id) => axios.delete(`/auth/notifications/${id}`);

// Servicios
export const addServicioRequest = async (id, servicioData) => axios.post(`/auth/servicios/${id}`, servicioData);

export const updateServicioRequest = async (id, index, servicioData) => axios.put(`/auth/servicios/${id}/${index}`, servicioData);

export const deleteServicioRequest = async (id, index) => axios.delete(`/auth/servicios/${id}/${index}`);