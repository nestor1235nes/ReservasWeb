import axios from './axios';

/**
 * Unirse a la lista de espera de un profesional (autenticado)
 * @param {string} profesionalId - ID del profesional
 * @param {string} pacienteId - ID del paciente
 * @param {string} [reservaId] - ID de la reserva actual (opcional)
 */
export const joinWaitlistRequest = (profesionalId, pacienteId, reservaId) => 
    axios.post('/waitlist/join', { profesionalId, pacienteId, reservaId });

/**
 * Unirse a la lista de espera de un profesional (público, sin autenticación)
 * @param {string} profesionalId - ID del profesional
 * @param {string} pacienteId - ID del paciente
 * @param {string} [reservaId] - ID de la reserva actual (opcional)
 */
export const joinWaitlistPublicRequest = (profesionalId, pacienteId, reservaId) => 
    axios.post('/waitlist/public/join', { profesionalId, pacienteId, reservaId });

/**
 * Abandonar la lista de espera
 * @param {string} profesionalId - ID del profesional
 * @param {string} pacienteId - ID del paciente
 */
export const leaveWaitlistRequest = (profesionalId, pacienteId) => 
    axios.post('/waitlist/leave', { profesionalId, pacienteId });

/**
 * Obtener mi posición en la lista de espera
 * @param {string} profesionalId - ID del profesional
 * @param {string} pacienteId - ID del paciente
 */
export const getWaitlistPositionRequest = (profesionalId, pacienteId) => 
    axios.get(`/waitlist/position/${profesionalId}/${pacienteId}`);

/**
 * Verificar si un paciente está en la lista de espera
 * @param {string} profesionalId - ID del profesional
 * @param {string} pacienteId - ID del paciente
 */
export const checkPatientInWaitlistRequest = (profesionalId, pacienteId) => 
    axios.get(`/waitlist/check/${profesionalId}/${pacienteId}`);

/**
 * Obtener estado de la lista de espera de un profesional (público)
 * @param {string} profesionalId - ID del profesional
 */
export const getWaitlistStatusRequest = (profesionalId) => 
    axios.get(`/waitlist/status/${profesionalId}`);

/**
 * Resolver token de oferta (obtener datos de hora liberada) - público
 * @param {string} token - Token de oferta
 */
export const resolveOfferTokenRequest = (token) => 
    axios.get(`/waitlist/offer/${token}`);

/**
 * Aceptar hora ofertada - público
 * @param {string} token - Token de oferta
 */
export const acceptOfferRequest = (token) => 
    axios.post(`/waitlist/offer/${token}/accept`);

/**
 * Rechazar hora ofertada - público
 * @param {string} token - Token de oferta
 */
export const rejectOfferRequest = (token) => 
    axios.post(`/waitlist/offer/${token}/reject`);

/**
 * Procesar ofertas expiradas (admin/cron)
 */
export const processExpiredOffersRequest = () => 
    axios.post('/waitlist/process-expired');
