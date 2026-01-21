import api from './axios';

// Obtener notificaciones del usuario
export const getNotificationsRequest = (params = {}) => 
  api.get('/notifications', { params });

// Obtener conteo de notificaciones no leídas
export const getUnreadCountRequest = () => 
  api.get('/notifications/unread-count');

// Marcar notificaciones como leídas
export const markAsReadRequest = (notificationIds = []) => 
  api.post('/notifications/mark-read', { notificationIds });

// Eliminar todas las notificaciones
export const deleteAllNotificationsRequest = () => 
  api.delete('/notifications');

export default {
  getNotificationsRequest,
  getUnreadCountRequest,
  markAsReadRequest,
  deleteAllNotificationsRequest
};
