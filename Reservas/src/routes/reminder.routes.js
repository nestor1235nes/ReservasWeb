import { Router } from 'express';
import { auth } from '../middlewares/auth.middleware.js';
import {
    processReminders,
    getReminderStats,
    getPendingReminders,
    cancelReminder
} from '../controllers/reminder.controller.js';

const router = Router();

/**
 * Rutas públicas (para cron jobs externos)
 */

// POST /api/reminders/process - Procesar recordatorios pendientes
// Este endpoint debe ser llamado periódicamente (cada 1-5 minutos) por un cron job
// Para seguridad en producción, considera agregar un token secreto en headers
router.post('/process', processReminders);

// GET /api/reminders/process - También permitir GET para facilitar llamadas desde servicios de cron
router.get('/process', processReminders);

/**
 * Rutas autenticadas (para el panel del profesional)
 */

// GET /api/reminders/stats - Obtener estadísticas de recordatorios
router.get('/stats', auth, getReminderStats);

// GET /api/reminders/pending - Obtener recordatorios pendientes del profesional
router.get('/pending', auth, getPendingReminders);

// DELETE /api/reminders/:id - Cancelar un recordatorio específico
router.delete('/:id', auth, cancelReminder);

export default router;
