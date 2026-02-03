import { API_URL } from '../config';

// Helper para hacer requests sin fetch/axios (usa XMLHttpRequest)
// Esto evita errores del runtime en algunos builds Android.
const xhrJson = (endpoint, { method = 'GET', body, timeout = 15000 } = {}) => {
  const url = `${API_URL}${endpoint}`;

  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.timeout = timeout;
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;

        const status = xhr.status;
        let data = null;
        try {
          data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
        } catch {
          data = xhr.responseText;
        }

        if (status >= 200 && status < 300) {
          resolve({ data, status });
        } else {
          const error = new Error(
            (data && typeof data === 'object' && data.message) || `HTTP ${status}`
          );
          error.response = { status, data };
          error.__where = `xhr ${method} ${url}`;
          reject(error);
        }
      };

      xhr.ontimeout = () => {
        const error = new Error('timeout');
        error.code = 'ETIMEDOUT';
        error.__where = `xhr ${method} ${url}`;
        reject(error);
      };

      xhr.onerror = () => {
        const error = new Error('network error');
        error.code = 'ENETWORK';
        error.__where = `xhr ${method} ${url}`;
        reject(error);
      };

      xhr.send(body ?? null);
    } catch (e) {
      if (e && typeof e === 'object') {
        e.__where = `xhr ${method} ${url}`;
      }
      reject(e);
    }
  });
};

// Registro de usuario profesional (usa fetch nativo)
export const registerRequest = async (user) => 
  xhrJson('/auth/register', { method: 'POST', body: JSON.stringify(user) });

// Login de usuario profesional (usa fetch nativo)
export const loginRequest = async (user) => 
  xhrJson('/auth/login', { method: 'POST', body: JSON.stringify(user) });

// Las siguientes usan el cliente API común
import api from './axios';

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
