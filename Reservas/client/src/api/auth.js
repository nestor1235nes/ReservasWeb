import axios from "./axios";

export const registerRequest = async (user) => axios.post(`/auth/register`, user);

export const loginRequest = async (user) => axios.post(`/auth/login`, user);

export const verifyTokenRequest = async () => axios.get(`/auth/verify`);

export const updatePerfilRequest = async (id, data) => axios.put(`/auth/${id}`, data);

export const getProfileRequest = async (id) => axios.get(`/auth/${id}`);