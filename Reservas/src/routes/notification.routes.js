import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import { sendWhatsApp } from '../controllers/whatsapp.controller.js';
import { 
  getNotifications, 
  getUnreadCount, 
  markAsRead, 
  deleteAllNotifications,
  triggerSubscriptionCheck
} from '../controllers/notification.controller.js';

const router = Router();

// Enviar WhatsApp (single o batch)
// POST /api/notifications/whatsapp { phoneNumber, message }
// ó { messages: [{ phoneNumber, message }, ...] }
router.post('/whatsapp', auth, sendWhatsApp);

// ========== Rutas de notificaciones in-app ==========

// Obtener notificaciones del usuario autenticado
// GET /api/notifications?limit=20&skip=0&unreadOnly=false
router.get('/', auth, getNotifications);

// Obtener conteo de notificaciones no leídas
// GET /api/notifications/unread-count
router.get('/unread-count', auth, getUnreadCount);

// Marcar notificaciones como leídas
// POST /api/notifications/mark-read { notificationIds: [] } (vacío = todas)
router.post('/mark-read', auth, markAsRead);

// Eliminar todas las notificaciones
// DELETE /api/notifications
router.delete('/', auth, deleteAllNotifications);

// Verificar suscripciones próximas a vencer (puede ser usado por admin o cron)
// POST /api/notifications/check-subscriptions
router.post('/check-subscriptions', auth, triggerSubscriptionCheck);

export default router;
