import crypto from 'crypto';
import axios from 'axios';
import Waitlist from '../models/waitlist.model.js';
import Reserva from '../models/ficha.model.js';
import Paciente from '../models/paciente.model.js';
import User from '../models/user.model.js';
import Sucursal from '../models/sucursal.model.js';
import { FRONTEND_URL } from '../config.js';
import { resolveWhatsAppCredentialsForUser } from '../libs/whatsappCredentials.js';
import { DEFAULT_MESSAGE_TEMPLATES, mergeTemplates, renderMessageTemplate } from '../libs/messageTemplates.js';

// Constantes
const OFFER_TOKEN_BYTES = 24;
const OFFER_TOKEN_TTL_MINUTES = 20; // 20 minutos para aceptar

// Helpers
const base64UrlEncode = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const normalizarTelefono = (telefono) => {
    if (!telefono) return '';
    let tel = String(telefono).replace(/\D/g, '');
    if (tel.length === 11 && tel.startsWith('569')) return tel;
    if (tel.length === 9 && tel.startsWith('9')) return '56' + tel;
    if (tel.length === 8) return '569' + tel;
    if (tel.startsWith('56') && !tel.startsWith('569')) return '569' + tel.slice(2);
    if (tel.length === 12 && tel.startsWith('0569')) return tel.slice(1);
    return tel;
};

const formatFecha = (fecha) => {
    try {
        if (!fecha) return '';
        let y, m, d;
        if (typeof fecha === 'string') {
            if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
                const parts = fecha.split('-').map(Number);
                [y, m, d] = parts;
                const local = new Date(y, m - 1, d);
                y = local.getFullYear();
                m = local.getMonth() + 1;
                d = local.getDate();
            } else if (fecha.endsWith('Z') && fecha.includes('T00:00:00')) {
                const [yy, mm, dd] = fecha.slice(0, 10).split('-').map(Number);
                const local = new Date(yy, mm - 1, dd);
                y = local.getFullYear();
                m = local.getMonth() + 1;
                d = local.getDate();
            } else {
                const dt = new Date(fecha);
                if (isNaN(dt.getTime())) return '';
                y = dt.getFullYear();
                m = dt.getMonth() + 1;
                d = dt.getDate();
            }
        } else if (fecha instanceof Date) {
            y = fecha.getFullYear();
            m = fecha.getMonth() + 1;
            d = fecha.getDate();
        } else {
            const dt = new Date(fecha);
            if (isNaN(dt.getTime())) return '';
            y = dt.getFullYear();
            m = dt.getMonth() + 1;
            d = dt.getDate();
        }
        const ddStr = String(d).padStart(2, '0');
        const mmStr = String(m).padStart(2, '0');
        const yyyyStr = String(y);
        return `${ddStr}-${mmStr}-${yyyyStr}`;
    } catch { return ''; }
};

// ¿Suscripción vigente? (igual criterio que subscription.controller)
const hasActiveSubscription = (end) => !!end && new Date(end) > new Date();

// Verificar si un profesional tiene lista de espera habilitada
const checkWaitlistEnabled = async (profesionalId) => {
    const profesional = await User.findById(profesionalId)
        .populate('suscriptionPlan')
        .populate({ path: 'sucursal', populate: { path: 'suscriptionPlan' } });
    if (!profesional) return { enabled: false, reason: 'professional_not_found' };

    // Resolver el plan EFECTIVO: individual (USER) o de la empresa (SUCURSAL),
    // siempre que la suscripción correspondiente esté vigente.
    let planName = null;
    if (profesional.suscriptionPlan && hasActiveSubscription(profesional.suscriptionEndDate)) {
        planName = profesional.suscriptionPlan?.name;
    } else if (profesional.sucursal?.suscriptionPlan && hasActiveSubscription(profesional.sucursal?.suscriptionEndDate)) {
        planName = profesional.sucursal?.suscriptionPlan?.name;
    }

    // Verificar suscripción Standard o Teams
    const isValidPlan = planName === 'Standard' || planName === 'Teams';

    if (!isValidPlan) return { enabled: false, reason: 'plan_not_allowed' };
    if (!profesional.waitlistEnabled) return { enabled: false, reason: 'waitlist_disabled' };

    return { enabled: true, profesional };
};

// Enviar WhatsApp con oferta de hora liberada
async function enviarWhatsAppOfertaHora({ profesional, paciente, waitlistEntry, ofertaToken }) {
    try {
        const creds = await resolveWhatsAppCredentialsForUser(profesional);
        if (!creds?.idInstance || !creds?.apiTokenInstance) {
            return { ok: false, reason: 'missing_credentials' };
        }

        const phone = normalizarTelefono(waitlistEntry.telefonoPaciente || paciente?.telefono);
        if (!/^569\d{8}$/.test(String(phone))) {
            return { ok: false, reason: 'invalid_phone' };
        }

        const nombre = waitlistEntry.nombrePaciente || paciente?.nombre || '';
        const profesionalNombre = profesional?.username || '';
        const fecha = formatFecha(waitlistEntry.horaOfertada?.fecha);
        const hora = waitlistEntry.horaOfertada?.hora || '';

        const baseUrl = (process.env.FRONTEND_BASE_URL || FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const acceptLink = `${baseUrl}/lista-espera/aceptar/${ofertaToken}`;

        let sucursal = null;
        if (profesional?.sucursal) {
            try {
                sucursal = await Sucursal.findById(profesional.sucursal).lean();
            } catch {
                sucursal = null;
            }
        }

        const templates = mergeTemplates({
            defaults: DEFAULT_MESSAGE_TEMPLATES,
            userTemplates: profesional?.messageTemplates,
            sucursalTemplates: sucursal?.messageTemplates,
        });

        const template = templates?.waitlist?.offer || DEFAULT_MESSAGE_TEMPLATES.waitlist.offer;
        const message = renderMessageTemplate(template, {
            nombre,
            profesional: profesionalNombre,
            fecha,
            hora,
            enlaceOferta: acceptLink,
            minutosVigencia: OFFER_TOKEN_TTL_MINUTES,
            sucursal: sucursal?.nombre || '',
        });

        const url = `https://api.green-api.com/waInstance${creds.idInstance}/sendMessage/${creds.apiTokenInstance}`;
        const data = { chatId: `${phone}@c.us`, message };
        const resp = await axios.post(url, data);
        
        if (resp?.status >= 200 && resp?.status < 300) return { ok: true };
        return { ok: false, reason: `http_${resp?.status}` };
    } catch (e) {
        return { ok: false, reason: 'request_error', detail: e?.response?.data || e?.message || String(e) };
    }
}

/**
 * Unirse a la lista de espera de un profesional
 */
export const joinWaitlist = async (req, res) => {
    try {
        const { profesionalId, pacienteId, reservaId } = req.body;

        if (!profesionalId || !pacienteId) {
            return res.status(400).json({ message: 'Se requiere profesionalId y pacienteId' });
        }

        // Verificar que el profesional tiene lista de espera habilitada
        const check = await checkWaitlistEnabled(profesionalId);
        if (!check.enabled) {
            return res.status(403).json({ 
                message: 'Este profesional no tiene lista de espera habilitada',
                reason: check.reason 
            });
        }

        const paciente = await Paciente.findById(pacienteId);
        if (!paciente) {
            return res.status(404).json({ message: 'Paciente no encontrado' });
        }

        // Verificar si ya está en la lista activa
        const existing = await Waitlist.findOne({
            paciente: pacienteId,
            profesional: profesionalId,
            estado: 'activo'
        });

        if (existing) {
            return res.status(409).json({ message: 'Ya estás en la lista de espera de este profesional' });
        }

        // Obtener reserva si se proporciona
        let reserva = null;
        if (reservaId) {
            reserva = await Reserva.findById(reservaId);
        }

        // Obtener sucursal del profesional
        const profesional = check.profesional;
        const sucursalId = profesional?.sucursal || null;

        // Crear entrada en la lista de espera
        const waitlistEntry = new Waitlist({
            paciente: pacienteId,
            profesional: profesionalId,
            reservaActual: reservaId || null,
            sucursal: sucursalId,
            telefonoPaciente: paciente.telefono,
            nombrePaciente: paciente.nombre,
            estado: 'activo',
            fechaIngreso: new Date(),
        });

        await waitlistEntry.save();

        res.status(201).json({
            message: 'Te has unido a la lista de espera exitosamente',
            waitlistId: waitlistEntry._id,
            position: await getPositionInWaitlist(waitlistEntry._id, profesionalId)
        });
    } catch (error) {
        console.error('Error en joinWaitlist:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Obtener posición en la lista de espera
 */
const getPositionInWaitlist = async (waitlistId, profesionalId) => {
    const entry = await Waitlist.findById(waitlistId);
    if (!entry) return null;

    const count = await Waitlist.countDocuments({
        profesional: profesionalId,
        estado: 'activo',
        fechaIngreso: { $lt: entry.fechaIngreso }
    });

    return count + 1;
};

/**
 * Obtener mi posición en la lista de espera
 */
export const getMyWaitlistPosition = async (req, res) => {
    try {
        const { profesionalId, pacienteId } = req.params;

        const entry = await Waitlist.findOne({
            paciente: pacienteId,
            profesional: profesionalId,
            estado: 'activo'
        });

        if (!entry) {
            return res.status(404).json({ message: 'No estás en la lista de espera' });
        }

        const position = await getPositionInWaitlist(entry._id, profesionalId);
        const total = await Waitlist.countDocuments({
            profesional: profesionalId,
            estado: 'activo'
        });

        res.json({
            position,
            total,
            fechaIngreso: entry.fechaIngreso
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Abandonar la lista de espera
 */
export const leaveWaitlist = async (req, res) => {
    try {
        const { profesionalId, pacienteId } = req.body;

        const entry = await Waitlist.findOne({
            paciente: pacienteId,
            profesional: profesionalId,
            estado: 'activo'
        });

        if (!entry) {
            return res.status(404).json({ message: 'No estás en la lista de espera' });
        }

        entry.estado = 'removido';
        entry.historialOfertas.push({
            accion: 'removido',
            meta: { reason: 'user_request' }
        });
        await entry.save();

        res.json({ message: 'Has salido de la lista de espera' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Procesar cancelación de cita - Notificar al primero en la lista
 * Esta función se llama cuando un paciente cancela su cita
 */
export const processCancelledAppointment = async (reservaCancelada) => {
    try {
        const profesionalId = reservaCancelada.profesional;
        
        // Verificar si el profesional tiene lista de espera habilitada
        const check = await checkWaitlistEnabled(profesionalId);
        if (!check.enabled) {
            console.log('Lista de espera no habilitada para este profesional');
            return { notified: false, reason: check.reason };
        }

        // Buscar el primer paciente activo en la lista de espera (FIFO)
        const nextInLine = await Waitlist.findOne({
            profesional: profesionalId,
            estado: 'activo'
        }).sort({ fechaIngreso: 1 });

        if (!nextInLine) {
            console.log('No hay pacientes en lista de espera');
            return { notified: false, reason: 'empty_waitlist' };
        }

        // Generar token de oferta
        const tokenRaw = base64UrlEncode(crypto.randomBytes(OFFER_TOKEN_BYTES));
        const tokenHash = hashToken(tokenRaw);
        const tokenExpires = new Date(Date.now() + OFFER_TOKEN_TTL_MINUTES * 60 * 1000);

        // Actualizar entrada de lista de espera
        nextInLine.estado = 'ofertado';
        nextInLine.ofertaTokenHash = tokenHash;
        nextInLine.ofertaTokenExpires = tokenExpires;
        nextInLine.horaOfertada = {
            reservaCancelada: reservaCancelada._id,
            fecha: reservaCancelada.siguienteCita,
            hora: reservaCancelada.hora,
            servicio: reservaCancelada.servicio,
            modalidad: reservaCancelada.modalidad,
        };
        nextInLine.historialOfertas.push({
            accion: 'ofertado',
            horaOfertada: {
                fecha: reservaCancelada.siguienteCita,
                hora: reservaCancelada.hora
            },
            meta: { reservaCanceladaId: reservaCancelada._id }
        });
        await nextInLine.save();

        // Cargar paciente para datos de contacto
        const paciente = await Paciente.findById(nextInLine.paciente);
        const profesional = check.profesional;

        // Enviar WhatsApp
        const result = await enviarWhatsAppOfertaHora({
            profesional,
            paciente,
            waitlistEntry: nextInLine,
            ofertaToken: tokenRaw
        });

        return {
            notified: true,
            waitlistEntryId: nextInLine._id,
            pacienteId: nextInLine.paciente,
            whatsappResult: result
        };
    } catch (error) {
        console.error('Error en processCancelledAppointment:', error);
        return { notified: false, reason: 'error', detail: error.message };
    }
};

/**
 * Resolver token de oferta (obtener datos de la hora ofertada)
 */
export const resolveOfferToken = async (req, res) => {
    try {
        const { token } = req.params;
        const hash = hashToken(token);

        const entry = await Waitlist.findOne({ ofertaTokenHash: hash })
            .populate('paciente')
            .populate('profesional')
            .populate('reservaActual');

        if (!entry) {
            return res.status(404).json({ message: 'Token inválido' });
        }

        if (entry.estado !== 'ofertado') {
            return res.status(410).json({ 
                message: 'Esta oferta ya no está disponible',
                estado: entry.estado 
            });
        }

        if (!entry.ofertaTokenExpires || entry.ofertaTokenExpires < new Date()) {
            return res.status(410).json({ message: 'El tiempo para aceptar esta hora ha expirado' });
        }

        const timeRemaining = Math.max(0, Math.floor((entry.ofertaTokenExpires - new Date()) / 1000));

        res.json({
            waitlistId: entry._id,
            paciente: {
                nombre: entry.nombrePaciente || entry.paciente?.nombre,
                rut: entry.paciente?.rut
            },
            profesional: {
                nombre: entry.profesional?.username,
                especialidad: entry.profesional?.especialidad
            },
            horaOfertada: {
                fecha: entry.horaOfertada?.fecha,
                hora: entry.horaOfertada?.hora,
                servicio: entry.horaOfertada?.servicio,
                modalidad: entry.horaOfertada?.modalidad
            },
            reservaActual: entry.reservaActual ? {
                fecha: entry.reservaActual.siguienteCita,
                hora: entry.reservaActual.hora
            } : null,
            timeRemaining,
            expiresAt: entry.ofertaTokenExpires
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Aceptar hora ofertada
 */
export const acceptOffer = async (req, res) => {
    try {
        const { token } = req.params;
        const hash = hashToken(token);

        const entry = await Waitlist.findOne({ ofertaTokenHash: hash })
            .populate('reservaActual')
            .populate('profesional');

        if (!entry) {
            return res.status(404).json({ message: 'Token inválido' });
        }

        if (entry.estado !== 'ofertado') {
            return res.status(410).json({ 
                message: 'Esta oferta ya no está disponible',
                estado: entry.estado 
            });
        }

        if (!entry.ofertaTokenExpires || entry.ofertaTokenExpires < new Date()) {
            // Marcar como expirado y procesar siguiente en la lista
            entry.estado = 'expirado';
            entry.historialOfertas.push({ accion: 'expirado' });
            await entry.save();
            
            return res.status(410).json({ message: 'El tiempo para aceptar esta hora ha expirado' });
        }

        // Obtener la reserva cancelada original para copiar datos
        const reservaCancelada = await Reserva.findById(entry.horaOfertada?.reservaCancelada);
        
        if (entry.reservaActual) {
            // Mover la reserva actual a la nueva fecha/hora
            const reservaActual = entry.reservaActual;
            
            // Guardar datos anteriores ANTES de modificar
            const previousDate = reservaActual.siguienteCita;
            const previousHora = reservaActual.hora;
            
            // Actualizar con la nueva fecha/hora
            reservaActual.siguienteCita = entry.horaOfertada.fecha;
            reservaActual.hora = entry.horaOfertada.hora;
            if (entry.horaOfertada.servicio) {
                reservaActual.servicio = entry.horaOfertada.servicio;
            }
            if (entry.horaOfertada.modalidad) {
                reservaActual.modalidad = entry.horaOfertada.modalidad;
            }
            reservaActual.confirmStatus = 'pending';
            reservaActual.confirmationLog = reservaActual.confirmationLog || [];
            reservaActual.confirmationLog.push({
                action: 'moved_from_waitlist',
                at: new Date(),
                meta: { 
                    previousDate: previousDate,
                    previousHora: previousHora 
                }
            });
            await reservaActual.save();
        } else {
            // Si no tiene reserva actual, crear una nueva
            const newReserva = new Reserva({
                paciente: entry.paciente,
                profesional: entry.profesional._id,
                sucursal: entry.sucursal,
                siguienteCita: entry.horaOfertada.fecha,
                hora: entry.horaOfertada.hora,
                servicio: entry.horaOfertada.servicio,
                modalidad: entry.horaOfertada.modalidad,
                confirmStatus: 'pending'
            });
            await newReserva.save();
        }

        // Actualizar estado de la entrada en lista de espera
        entry.estado = 'aceptado';
        entry.historialOfertas.push({
            accion: 'aceptado',
            horaOfertada: {
                fecha: entry.horaOfertada.fecha,
                hora: entry.horaOfertada.hora
            }
        });
        await entry.save();

        res.json({
            message: '¡Hora aceptada exitosamente!',
            nuevaCita: {
                fecha: entry.horaOfertada.fecha,
                hora: entry.horaOfertada.hora,
                profesional: entry.profesional?.username
            }
        });
    } catch (error) {
        console.error('Error en acceptOffer:', error);
        res.status(500).json({ message: error.message });
    }
};

/**
 * Rechazar oferta (quedarse en la lista)
 */
export const rejectOffer = async (req, res) => {
    try {
        const { token } = req.params;
        const hash = hashToken(token);

        const entry = await Waitlist.findOne({ ofertaTokenHash: hash });

        if (!entry) {
            return res.status(404).json({ message: 'Token inválido' });
        }

        if (entry.estado !== 'ofertado') {
            return res.status(410).json({ message: 'Esta oferta ya no está disponible' });
        }

        // Guardar datos de la reserva cancelada antes de limpiar
        const reservaCanceladaId = entry.horaOfertada?.reservaCancelada;

        // Marcar como rechazado y volver a activo para futuras oportunidades
        entry.estado = 'activo';
        entry.historialOfertas.push({
            accion: 'rechazado',
            horaOfertada: {
                fecha: entry.horaOfertada?.fecha,
                hora: entry.horaOfertada?.hora
            }
        });
        entry.ofertaTokenHash = null;
        entry.ofertaTokenExpires = null;
        entry.horaOfertada = null;
        await entry.save();

        // Buscar la reserva cancelada original para ofertar al siguiente
        if (reservaCanceladaId) {
            const reservaCancelada = await Reserva.findById(reservaCanceladaId);
            if (reservaCancelada) {
                // Notificar al siguiente en la lista
                setTimeout(() => {
                    processCancelledAppointment(reservaCancelada);
                }, 100);
            }
        }

        res.json({ 
            message: 'Has rechazado esta hora. Seguirás en la lista de espera para futuras oportunidades.' 
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Procesar ofertas expiradas (llamar periódicamente via cron o similar)
 */
export const processExpiredOffers = async (req, res) => {
    try {
        const now = new Date();
        
        // Buscar ofertas expiradas
        const expiredEntries = await Waitlist.find({
            estado: 'ofertado',
            ofertaTokenExpires: { $lt: now }
        });

        let processed = 0;
        for (const entry of expiredEntries) {
            // Guardar datos de la hora que se ofertó
            const reservaCanceladaId = entry.horaOfertada?.reservaCancelada;
            
            // Marcar como expirado
            entry.estado = 'expirado';
            entry.historialOfertas.push({ accion: 'expirado' });
            await entry.save();

            // Notificar al siguiente en la lista
            if (reservaCanceladaId) {
                const reservaCancelada = await Reserva.findById(reservaCanceladaId);
                if (reservaCancelada) {
                    await processCancelledAppointment(reservaCancelada);
                }
            }
            processed++;
        }

        if (res) {
            res.json({ message: `Procesadas ${processed} ofertas expiradas` });
        }
        return { processed };
    } catch (error) {
        console.error('Error en processExpiredOffers:', error);
        if (res) {
            res.status(500).json({ message: error.message });
        }
        return { error: error.message };
    }
};

/**
 * Obtener estado de lista de espera de un profesional
 */
export const getWaitlistStatus = async (req, res) => {
    try {
        const { profesionalId } = req.params;

        const check = await checkWaitlistEnabled(profesionalId);
        
        const count = await Waitlist.countDocuments({
            profesional: profesionalId,
            estado: 'activo'
        });

        res.json({
            enabled: check.enabled,
            reason: check.reason,
            activeCount: count,
            planName: check.profesional?.suscriptionPlan?.name
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

/**
 * Verificar si un paciente está en la lista de espera de un profesional
 */
export const checkPatientInWaitlist = async (req, res) => {
    try {
        const { profesionalId, pacienteId } = req.params;

        const entry = await Waitlist.findOne({
            paciente: pacienteId,
            profesional: profesionalId,
            estado: { $in: ['activo', 'ofertado'] }
        });

        if (!entry) {
            return res.json({ inWaitlist: false });
        }

        const position = await getPositionInWaitlist(entry._id, profesionalId);

        res.json({
            inWaitlist: true,
            estado: entry.estado,
            position,
            fechaIngreso: entry.fechaIngreso
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export default {
    joinWaitlist,
    getMyWaitlistPosition,
    leaveWaitlist,
    processCancelledAppointment,
    resolveOfferToken,
    acceptOffer,
    rejectOffer,
    processExpiredOffers,
    getWaitlistStatus,
    checkPatientInWaitlist
};
