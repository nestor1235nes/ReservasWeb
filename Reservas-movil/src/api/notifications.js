import api from './axios';

export const sendWhatsAppRequest = async ({ phoneNumber, message }) =>
  api.post('/notifications/whatsapp', { phoneNumber, message });
