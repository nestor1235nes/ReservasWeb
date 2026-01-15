import api from './axios';

/**
 * Obtener estadísticas de recordatorios del profesional
 */
export const getReminderStats = async () => {
    const response = await api.get('/reminders/stats');
    return response.data;
};

/**
 * Obtener recordatorios pendientes del profesional
 */
export const getPendingReminders = async () => {
    const response = await api.get('/reminders/pending');
    return response.data;
};

/**
 * Cancelar un recordatorio específico
 */
export const cancelReminder = async (reminderId) => {
    const response = await api.delete(`/reminders/${reminderId}`);
    return response.data;
};

/**
 * Forzar procesamiento de recordatorios (útil para testing)
 * En producción esto lo hace el cron job
 */
export const processReminders = async () => {
    const response = await api.post('/reminders/process');
    return response.data;
};
