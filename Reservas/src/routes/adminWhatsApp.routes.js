import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import { platformAdminOnly } from '../middlewares/platformAdmin.middleware.js';
import {
  getWhatsAppPlatformCredentials,
  setWhatsAppPlatformCredentials,
} from '../controllers/adminWhatsApp.controller.js';

const router = Router();

// Admin-only: credenciales GreenAPI globales (un solo número para toda la plataforma)
router.get('/whatsapp-credentials', auth, platformAdminOnly, getWhatsAppPlatformCredentials);
router.put('/whatsapp-credentials', auth, platformAdminOnly, setWhatsAppPlatformCredentials);

export default router;
