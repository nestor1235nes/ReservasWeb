import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import { sendEmail } from '../controllers/notification.controller.js';

const router = Router();

// Send an email using configured SMTP (Brevo by default)
router.post('/email', auth, sendEmail);

export default router;
