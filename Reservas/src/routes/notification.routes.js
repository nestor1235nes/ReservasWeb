import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import { sendWhatsApp } from '../controllers/whatsapp.controller.js';

const router = Router();

// Enviar WhatsApp (single o batch)
// POST /api/notifications/whatsapp { phoneNumber, message }
// ó { messages: [{ phoneNumber, message }, ...] }
router.post('/whatsapp', auth, sendWhatsApp);

export default router;
