import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import { 
  generateConfirmationLink,
  resolveToken,
  confirmReserva,
  cancelReservaByToken,
  requestReschedule,
  resendLink
} from '../controllers/confirmation.controller.js';
import { updateConfirmStatus } from '../controllers/confirmation.controller.js';

const router = Router();

// Rutas protegidas (profesional / asistente): generar o reenviar link
router.post('/reserva/:id/confirm-link', auth, generateConfirmationLink); // genera nuevo link
router.post('/reserva/:id/confirm-link/resend', auth, resendLink); // reenvía o regenera
router.patch('/reserva/:id/confirm-status', auth, updateConfirmStatus); // cambio manual de estado

// Rutas públicas por token (paciente)
router.get('/confirmacion/:token', resolveToken); // obtener info
router.post('/confirmacion/:token/confirm', confirmReserva); // confirmar
router.post('/confirmacion/:token/cancel', cancelReservaByToken); // cancelar
router.post('/confirmacion/:token/reschedule', requestReschedule); // solicitar cambio

export default router;