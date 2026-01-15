import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import {
    joinWaitlist,
    getMyWaitlistPosition,
    leaveWaitlist,
    resolveOfferToken,
    acceptOffer,
    rejectOffer,
    processExpiredOffers,
    getWaitlistStatus,
    checkPatientInWaitlist
} from '../controllers/waitlist.controller.js';

const router = Router();

// ============== Rutas públicas (para aceptar/rechazar ofertas via link WhatsApp) ==============

// Resolver token de oferta (obtener datos de la hora ofertada)
router.get('/offer/:token', resolveOfferToken);

// Aceptar hora ofertada
router.post('/offer/:token/accept', acceptOffer);

// Rechazar hora ofertada (quedarse en la lista para futuras)
router.post('/offer/:token/reject', rejectOffer);

// Obtener estado de la lista de espera de un profesional (público)
router.get('/status/:profesionalId', getWaitlistStatus);

// Unirse a la lista de espera (público - para reservas públicas)
router.post('/public/join', joinWaitlist);

// ============== Rutas con autenticación (para gestión desde la app) ==============

// Unirse a la lista de espera (autenticado)
router.post('/join', auth, joinWaitlist);

// Abandonar la lista de espera
router.post('/leave', auth, leaveWaitlist);

// Obtener posición en la lista de espera
router.get('/position/:profesionalId/:pacienteId', auth, getMyWaitlistPosition);

// Verificar si un paciente está en la lista de espera
router.get('/check/:profesionalId/:pacienteId', auth, checkPatientInWaitlist);

// ============== Ruta para procesamiento de ofertas expiradas (cron/admin) ==============

// Procesar ofertas expiradas manualmente (también se puede usar con cron)
router.post('/process-expired', auth, processExpiredOffers);

export default router;
