import api from './axios';

// Registro de usuario profesional
export const registerRequest = async (user) => api.post('/auth/register', user);

// Login de usuario profesional
export const loginRequest = async (user) => api.post('/auth/login', user);

// Cerrar sesión
export const logoutRequest = async () => api.post('/auth/logout');

// Verificar token
export const verifyTokenRequest = async () => api.get('/auth/verify');

// Obtener perfil
export const getProfileRequest = async (id) => api.get(`/auth/${id}`);

// Actualizar perfil
export const updatePerfilRequest = async (id, data) => api.put(`/auth/${id}`, data);

// Obtener todos los usuarios (para admin)
export const getAllUsersRequest = async () => api.get('/auth');

// Eliminar usuario
export const deleteUserRequest = async (id) => api.delete(`/auth/${id}`);

// Notificaciones
export const updateNotificationsRequest = async (id, data) => api.post(`/auth/notifications/${id}`, data);
export const deleteNotificationsRequest = async (id) => api.delete(`/auth/notifications/${id}`);

// Servicios
export const addServicioRequest = async (id, servicioData) => api.post(`/auth/servicios/${id}`, servicioData);
export const updateServicioRequest = async (id, index, servicioData) => api.put(`/auth/servicios/${id}/${index}`, servicioData);
export const deleteServicioRequest = async (id, index) => api.delete(`/auth/servicios/${id}/${index}`);

// Enlace público
export const generateEnlaceRequest = async (id) => api.post(`/auth/${id}/generar-enlace`);
export const getUserBySlugRequest = async (slug) => api.get(`/auth/by-slug/${encodeURIComponent(slug)}`);

// Password reset / change
export const requestPasswordResetRequest = async (email) => api.post('/auth/request-password-reset', { email });
export const resetPasswordRequest = async ({ email, code, password }) => api.post('/auth/reset-password', { email, code, password });
export const changePasswordRequest = async ({ currentPassword, newPassword }) => api.post('/auth/change-password', { currentPassword, newPassword });
