import crypto from 'crypto';
import axios from 'axios';
import ScheduledReminder from '../models/scheduledReminder.model.js';
import Reserva from '../models/ficha.model.js';
import User from '../models/user.model.js';
import Paciente from '../models/paciente.model.js';
import Sucursal from '../models/sucursal.model.js';
import { FRONTEND_URL } from '../config.js';
import { resolveWhatsAppCredentialsForUser } from '../libs/whatsappCredentials.js';
import { DEFAULT_MESSAGE_TEMPLATES, mergeTemplates, renderMessageTemplate } from '../libs/messageTemplates.js';

// Constantes para tokens de confirmación
const TOKEN_BYTES = 24;
const TOKEN_TTL_HOURS = 48;
const base64UrlEncode = (buf) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Normalizar teléfono a formato 569XXXXXXXX
const normalizarTelefono = (telefono) => {
    if (!telefono) return '';
    let tel = telefono.toString().replace(/\D/g, '');
    if (tel.length === 11 && tel.startsWith('569')) return tel;
    if (tel.length === 9 && tel.startsWith('9')) return '56' + tel;
    if (tel.length === 8) return '569' + tel;
    if (tel.startsWith('56') && !tel.startsWith('569')) return '569' + tel.slice(2);
    return '';
};

// Formatear fecha a DD-MM-YYYY (sin desfase UTC)
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

// Obtener nombre del día de la semana
const getNombreDia = (fecha) => {
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dt = new Date(fecha);
    return dias[dt.getDay()];
};

/**
 * Generar o renovar token de confirmación para una reserva
 */
async function ensureConfirmationToken(reserva) {
    const now = new Date();
    const expired = !reserva.confirmTokenExpires || reserva.confirmTokenExpires < now;
    
    // Siempre generamos un nuevo token para tener el valor raw
    const tokenRaw = base64UrlEncode(crypto.randomBytes(TOKEN_BYTES));
    reserva.confirmTokenHash = hashToken(tokenRaw);
    reserva.confirmTokenExpires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
    
    if (reserva.confirmStatus === 'cancelled' || !reserva.confirmStatus) {
        reserva.confirmStatus = 'pending';
    }
    
    await reserva.save();
    
    const baseUrl = (process.env.FRONTEND_BASE_URL || FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    return `${baseUrl}/confirmacion/${tokenRaw}`;
}

/**
 * Enviar WhatsApp usando credenciales del profesional
 */
async function enviarWhatsApp(profesional, telefono, mensaje) {
    try {
        const creds = await resolveWhatsAppCredentialsForUser(profesional);
        if (!creds?.idInstance || !creds?.apiTokenInstance) {
            return { ok: false, reason: 'missing_credentials' };
        }
        
        const phone = normalizarTelefono(telefono);
        if (!/^569\d{8}$/.test(String(phone))) {
            return { ok: false, reason: 'invalid_phone' };
        }
        
        const url = `https://api.green-api.com/waInstance${creds.idInstance}/sendMessage/${creds.apiTokenInstance}`;
        const data = { chatId: `${phone}@c.us`, message: mensaje };
        const resp = await axios.post(url, data);
        
        if (resp?.status >= 200 && resp?.status < 300) {
            return { ok: true };
        }
        return { ok: false, reason: `http_${resp?.status}` };
    } catch (e) {
        return { ok: false, reason: 'request_error', detail: e?.response?.data || e?.message || String(e) };
    }
}

/**
 * Construir mensaje según el tipo de recordatorio
 */
function resolveReminderTemplateKey(tipo) {
    switch (tipo) {
        case 'registro_informativo':
            return 'registroInformativo';
        case 'registro_confirmacion':
            return 'registroConfirmacion';
        case 'recordatorio_48h':
            return 'recordatorio48h';
        case 'recordatorio_24h':
            return 'recordatorio24h';
        default:
            return null;
    }
}

/**
 * Programar el recordatorio AUTOMÁTICO de la reserva.
 *
 * Separación de responsabilidades:
 * - Mensaje INMEDIATO al registrar/reagendar (informativo o confirmación): se envía de forma
 *   síncrona con enviarMensajeRegistroInmediato() desde el controlador de reservas.
 * - Mensaje AUTOMÁTICO: única confirmación 24h antes de la cita (recordatorio_24h).
 *
 * Se reprograma de forma idempotente: cancela recordatorios pendientes previos de la reserva
 * (re-agendamiento) y deja un único recordatorio_24h pendiente cuando faltan >= 24h.
 */
export async function programarRecordatorios(reservaId, profesionalId, pacienteId, fechaCita, horaCita) {
    try {
        const now = new Date();
        const fechaCitaDate = new Date(fechaCita);
        // siguienteCita se guarda a medianoche local; combinar con la hora (HH:mm) para
        // ubicar el datetime real de la cita y programar el recordatorio 24h con precisión.
        const [hhCita, mmCita] = String(horaCita || '00:00').split(':').map(Number);
        const citaDateTime = isNaN(fechaCitaDate.getTime())
            ? fechaCitaDate
            : new Date(fechaCitaDate.getFullYear(), fechaCitaDate.getMonth(), fechaCitaDate.getDate(), hhCita || 0, mmCita || 0);
        const diffHours = (citaDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        // Cancelar cualquier recordatorio pendiente previo de esta reserva (re-agendamiento).
        await ScheduledReminder.updateMany(
            { reserva: reservaId, estado: 'pendiente' },
            { $set: { estado: 'cancelado' } }
        );

        // Si la cita ya pasó o faltan < 24h, no hay recordatorio automático:
        // - Cita pasada: nada que recordar.
        // - < 24h: la confirmación ya se envió de inmediato al registrar/reagendar.
        if (diffHours < 24) {
            return {
                ok: true,
                message: diffHours <= 0
                    ? 'Cita en el pasado, no se programaron recordatorios'
                    : 'Cita en < 24h: la confirmación se envía de inmediato, sin recordatorio automático',
            };
        }

        const fecha24h = new Date(citaDateTime.getTime() - (24 * 60 * 60 * 1000));
        const doc = {
            reserva: reservaId,
            paciente: pacienteId,
            profesional: profesionalId,
            tipo: 'recordatorio_24h',
            fechaProgramada: fecha24h,
            fechaCita: fechaCitaDate,
            horaCita,
        };

        try {
            await ScheduledReminder.create(doc);
        } catch (err) {
            // El índice único parcial {reserva, tipo} cubre estados pendiente|enviado.
            // Tras cancelar los pendientes, un 11000 solo puede venir de uno ya 'enviado'
            // (programación anterior): lo reactivamos con la nueva fecha.
            if (err.code === 11000) {
                await ScheduledReminder.findOneAndUpdate(
                    { reserva: reservaId, tipo: 'recordatorio_24h', estado: 'enviado' },
                    { $set: { estado: 'pendiente', fechaProgramada: fecha24h, fechaCita: fechaCitaDate, horaCita, intentos: 0, resultado: undefined } }
                );
            } else {
                throw err;
            }
        }

        return { ok: true, message: 'Recordatorio 24h programado', fechaProgramada: fecha24h };
    } catch (error) {
        console.error('Error programando recordatorios:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Enviar de inmediato el mensaje de registro de cita (síncrono, tras una acción del usuario).
 * - Si faltan < 24h para la cita: mensaje de CONFIRMACIÓN con enlace (registro_confirmacion).
 * - Si faltan >= 24h: mensaje INFORMATIVO sin enlace (registro_informativo). La confirmación
 *   con enlace llegará automáticamente 24h antes vía el recordatorio programado.
 *
 * No envía si la cita ya está confirmada/cancelada/completada o si ya pasó.
 */
export async function enviarMensajeRegistroInmediato(reserva, profesional, paciente) {
    try {
        if (!reserva || !profesional || !paciente) {
            return { ok: false, reason: 'missing_data' };
        }
        if (['cancelled', 'completed', 'confirmed'].includes(reserva.confirmStatus)) {
            return { ok: false, reason: `estado_${reserva.confirmStatus}` };
        }

        const fechaCita = reserva.siguienteCita;
        if (!fechaCita) return { ok: false, reason: 'sin_fecha' };

        // siguienteCita se guarda a medianoche local; hay que combinarla con la hora (HH:mm)
        // para obtener el datetime real de la cita y calcular bien cuánto falta.
        const base = new Date(fechaCita);
        if (isNaN(base.getTime())) return { ok: false, reason: 'sin_fecha' };
        const [hh, mm] = String(reserva.hora || '00:00').split(':').map(Number);
        const citaDateTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh || 0, mm || 0);

        const diffHours = (citaDateTime.getTime() - Date.now()) / (1000 * 60 * 60);
        if (diffHours <= 0) return { ok: false, reason: 'cita_pasada' };

        const tipo = diffHours < 24 ? 'registro_confirmacion' : 'registro_informativo';
        const necesitaLink = tipo === 'registro_confirmacion';

        let confirmLink = '';
        if (necesitaLink) {
            confirmLink = await ensureConfirmationToken(reserva);
        }

        // Resolver plantillas efectivas (defaults < usuario < sucursal)
        let sucursal = null;
        const sucursalId = reserva?.sucursal || profesional?.sucursal;
        if (sucursalId) {
            try { sucursal = await Sucursal.findById(sucursalId).lean(); } catch { sucursal = null; }
        }

        const templates = mergeTemplates({
            defaults: DEFAULT_MESSAGE_TEMPLATES,
            userTemplates: profesional?.messageTemplates,
            sucursalTemplates: sucursal?.messageTemplates,
        });

        const key = resolveReminderTemplateKey(tipo);
        const template = key ? (templates?.reminders?.[key] || '') : '';

        const mensaje = renderMessageTemplate(template, {
            nombre: paciente.nombre || 'Paciente',
            profesional: profesional.username || 'su profesional',
            fecha: formatFecha(fechaCita),
            hora: reserva.hora,
            dia: getNombreDia(fechaCita),
            enlaceConfirmacion: confirmLink || '',
            servicio: reserva?.servicio || '',
            sucursal: sucursal?.nombre || '',
        });

        const resultado = await enviarWhatsApp(profesional, paciente.telefono, mensaje);
        return { ...resultado, tipo };
    } catch (error) {
        console.error('Error en enviarMensajeRegistroInmediato:', error);
        return { ok: false, reason: 'exception', detail: error.message };
    }
}

/**
 * Procesar un recordatorio individual
 */
async function procesarRecordatorio(reminder) {
    try {
        // Tipos que ya NO se envían por la cola (ahora son inmediatos/eliminados):
        // - registro_informativo / registro_confirmacion: se envían de forma síncrona al registrar.
        // - recordatorio_48h: eliminado (solo queda la confirmación 24h).
        // Cualquier registro de estos tipos en la cola es residual: se omite sin enviar.
        if (['registro_informativo', 'registro_confirmacion', 'recordatorio_48h'].includes(reminder.tipo)) {
            reminder.estado = 'omitido';
            reminder.resultado = { ok: true, reason: 'tipo_obsoleto' };
            await reminder.save();
            return { ok: true, reason: 'tipo_obsoleto' };
        }

        // Recargar la reserva para verificar estado actual
        const reserva = await Reserva.findById(reminder.reserva);
        if (!reserva) {
            reminder.estado = 'cancelado';
            reminder.resultado = { ok: false, reason: 'reserva_not_found' };
            await reminder.save();
            return { ok: false, reason: 'reserva_not_found' };
        }

        // No enviar recordatorios de citas que ya pasaron (protege contra colas atrasadas).
        const citaPasada = (() => {
            try {
                const base = new Date(reminder.fechaCita);
                if (isNaN(base.getTime())) return false;
                const [hh, mm] = String(reminder.horaCita || '00:00').split(':').map(Number);
                const citaDateTime = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hh || 0, mm || 0);
                return citaDateTime.getTime() < Date.now();
            } catch { return false; }
        })();
        if (citaPasada) {
            reminder.estado = 'omitido';
            reminder.resultado = { ok: true, reason: 'cita_pasada' };
            await reminder.save();
            return { ok: true, reason: 'cita_pasada' };
        }

        // Si la cita fue cancelada, no enviar recordatorio
        if (reserva.confirmStatus === 'cancelled') {
            reminder.estado = 'cancelado';
            reminder.resultado = { ok: false, reason: 'cita_cancelled' };
            await reminder.save();
            return { ok: false, reason: 'cita_cancelled' };
        }
        
        // Si es recordatorio_24h y ya confirmó, omitir
        if (reminder.tipo === 'recordatorio_24h' && reserva.confirmStatus === 'confirmed') {
            reminder.estado = 'omitido';
            reminder.resultado = { ok: true, reason: 'already_confirmed' };
            await reminder.save();
            return { ok: true, reason: 'already_confirmed' };
        }
        
        // Obtener datos necesarios
        const profesional = await User.findById(reminder.profesional);
        const paciente = await Paciente.findById(reminder.paciente);
        
        if (!profesional || !paciente) {
            reminder.estado = 'fallido';
            reminder.resultado = { ok: false, reason: 'missing_data' };
            await reminder.save();
            return { ok: false, reason: 'missing_data' };
        }
        
        // Determinar si necesita link de confirmación
        const necesitaLink = reminder.tipo !== 'registro_informativo';
        let confirmLink = null;
        
        if (necesitaLink) {
            confirmLink = await ensureConfirmationToken(reserva);
        }
        
        // Resolver plantillas efectivas (defaults < usuario < sucursal)
        let sucursal = null;
        const sucursalId = reserva?.sucursal || profesional?.sucursal;
        if (sucursalId) {
            try {
                sucursal = await Sucursal.findById(sucursalId).lean();
            } catch {
                sucursal = null;
            }
        }

        const templates = mergeTemplates({
            defaults: DEFAULT_MESSAGE_TEMPLATES,
            userTemplates: profesional?.messageTemplates,
            sucursalTemplates: sucursal?.messageTemplates,
        });

        const key = resolveReminderTemplateKey(reminder.tipo);
        const template = key ? (templates?.reminders?.[key] || '') : '';

        const mensaje = renderMessageTemplate(template, {
            nombre: paciente.nombre || 'Paciente',
            profesional: profesional.username || 'su profesional',
            fecha: formatFecha(reminder.fechaCita),
            hora: reminder.horaCita,
            dia: getNombreDia(reminder.fechaCita),
            enlaceConfirmacion: confirmLink || '',
            servicio: reserva?.servicio || '',
            sucursal: sucursal?.nombre || '',
        });
        
        // Enviar WhatsApp
        reminder.intentos += 1;
        reminder.ultimoIntento = new Date();
        
        const resultado = await enviarWhatsApp(profesional, paciente.telefono, mensaje);
        
        // Registrar intento
        reminder.historialIntentos.push({
            fecha: new Date(),
            ok: resultado.ok,
            reason: resultado.reason,
            detail: resultado.detail
        });
        
        if (resultado.ok) {
            reminder.estado = 'enviado';
            reminder.resultado = resultado;
        } else if (reminder.intentos >= reminder.maxIntentos) {
            reminder.estado = 'fallido';
            reminder.resultado = resultado;
        }
        // Si no ok y aún hay intentos, se mantiene como pendiente
        
        await reminder.save();
        return resultado;
    } catch (error) {
        console.error('Error procesando recordatorio:', error);
        reminder.intentos += 1;
        reminder.ultimoIntento = new Date();
        reminder.historialIntentos.push({
            fecha: new Date(),
            ok: false,
            reason: 'exception',
            detail: error.message
        });
        if (reminder.intentos >= reminder.maxIntentos) {
            reminder.estado = 'fallido';
        }
        await reminder.save();
        return { ok: false, reason: 'exception', detail: error.message };
    }
}

/**
 * Procesar todos los recordatorios pendientes que ya deben enviarse
 * Esta función debe llamarse periódicamente (ej. cada minuto via cron)
 */
export async function procesarRecordatoriosPendientes() {
    try {
        const pendientes = await ScheduledReminder.findPendingReadyToSend();
        
        if (pendientes.length === 0) {
            return { ok: true, processed: 0, message: 'No hay recordatorios pendientes' };
        }
        
        const resultados = {
            total: pendientes.length,
            enviados: 0,
            fallidos: 0,
            omitidos: 0,
            cancelados: 0,
            errores: []
        };
        
        for (const reminder of pendientes) {
            try {
                const resultado = await procesarRecordatorio(reminder);
                
                if (resultado.ok) {
                    if (resultado.reason === 'already_confirmed') {
                        resultados.omitidos++;
                    } else {
                        resultados.enviados++;
                    }
                } else {
                    if (resultado.reason === 'reserva_not_found' || resultado.reason === 'cita_cancelled') {
                        resultados.cancelados++;
                    } else {
                        resultados.fallidos++;
                        resultados.errores.push({
                            reminderId: reminder._id,
                            tipo: reminder.tipo,
                            reason: resultado.reason
                        });
                    }
                }
            } catch (error) {
                resultados.fallidos++;
                resultados.errores.push({
                    reminderId: reminder._id,
                    tipo: reminder.tipo,
                    error: error.message
                });
            }
        }
        
        return { ok: true, ...resultados };
    } catch (error) {
        console.error('Error procesando recordatorios pendientes:', error);
        return { ok: false, error: error.message };
    }
}

// Scheduler interno: procesa la cola de recordatorios periódicamente.
let _schedulerStarted = false;
let _schedulerRunning = false;

/**
 * Inicia un scheduler interno (setInterval) que procesa los recordatorios pendientes.
 *
 * IMPORTANTE (Cloud Run / serverless): este intervalo solo corre mientras la instancia
 * esté viva. Si el servicio escala a cero, configura `min-instances >= 1` o, como
 * alternativa, un disparador externo (Cloud Scheduler) a GET /api/reminders/process.
 */
export function startReminderScheduler(intervalMs = 60_000) {
    if (_schedulerStarted) return;
    _schedulerStarted = true;

    const tick = async () => {
        if (_schedulerRunning) return; // evitar solapamiento entre ejecuciones
        _schedulerRunning = true;
        try {
            const r = await procesarRecordatoriosPendientes();
            if (r?.enviados) {
                console.log(`[reminder-scheduler] enviados=${r.enviados} fallidos=${r.fallidos || 0} omitidos=${r.omitidos || 0}`);
            }
        } catch (e) {
            console.error('[reminder-scheduler] error:', e?.message || e);
        } finally {
            _schedulerRunning = false;
        }
    };

    const timer = setInterval(tick, intervalMs);
    if (timer.unref) timer.unref();
    // Verificación INMEDIATA al encender la máquina: como el server escala a cero,
    // cada cold start revisa de inmediato si hay mensajes pendientes por enviar.
    // (startReminderScheduler se llama después de connectDB(), así que Mongo ya está listo.)
    tick();
    console.log(`[reminder-scheduler] iniciado (verificación inmediata + cada ${Math.round(intervalMs / 1000)}s)`);
}

/**
 * Cancelar recordatorios pendientes de una reserva (cuando se cancela la cita)
 */
export async function cancelarRecordatoriosDeReserva(reservaId) {
    try {
        const result = await ScheduledReminder.cancelarPorReserva(reservaId);
        return { ok: true, modificados: result.modifiedCount };
    } catch (error) {
        console.error('Error cancelando recordatorios:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Marcar recordatorios como omitidos cuando el paciente confirma su cita
 */
export async function omitirRecordatoriosPorConfirmacion(reservaId) {
    try {
        // Solo omitir el recordatorio de 24h si ya confirmó, 
        // ya que los demás ya se habrían enviado
        const result = await ScheduledReminder.omitirSiConfirmado(reservaId, ['recordatorio_24h']);
        return { ok: true, modificados: result.modifiedCount };
    } catch (error) {
        console.error('Error omitiendo recordatorios:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Obtener estadísticas de recordatorios para un profesional
 */
export async function getEstadisticasRecordatorios(profesionalId) {
    try {
        const stats = await ScheduledReminder.aggregate([
            { $match: { profesional: new mongoose.Types.ObjectId(profesionalId) } },
            {
                $group: {
                    _id: '$estado',
                    count: { $sum: 1 }
                }
            }
        ]);
        
        const result = {
            pendiente: 0,
            enviado: 0,
            fallido: 0,
            cancelado: 0,
            omitido: 0
        };
        
        stats.forEach(s => {
            if (result.hasOwnProperty(s._id)) {
                result[s._id] = s.count;
            }
        });
        
        return { ok: true, stats: result };
    } catch (error) {
        return { ok: false, error: error.message };
    }
}

// ============ ENDPOINTS DEL CONTROLADOR ============

/**
 * GET /api/reminders/process - Procesar recordatorios pendientes (llamar via cron)
 */
export const processReminders = async (req, res) => {
    try {
        const resultado = await procesarRecordatoriosPendientes();
        res.json(resultado);
    } catch (error) {
        console.error('Error en processReminders:', error);
        res.status(500).json({ ok: false, message: error.message });
    }
};

/**
 * GET /api/reminders/stats - Obtener estadísticas de recordatorios del profesional
 */
export const getReminderStats = async (req, res) => {
    try {
        const profesionalId = req.user?.id;
        const resultado = await getEstadisticasRecordatorios(profesionalId);
        res.json(resultado);
    } catch (error) {
        console.error('Error en getReminderStats:', error);
        res.status(500).json({ ok: false, message: error.message });
    }
};

/**
 * GET /api/reminders/pending - Obtener recordatorios pendientes del profesional
 */
export const getPendingReminders = async (req, res) => {
    try {
        const profesionalId = req.user?.id;
        const pendientes = await ScheduledReminder.find({
            profesional: profesionalId,
            estado: 'pendiente'
        })
        .populate('paciente', 'nombre telefono')
        .populate('reserva', 'siguienteCita hora servicio')
        .sort({ fechaProgramada: 1 })
        .limit(50);
        
        res.json({ ok: true, recordatorios: pendientes });
    } catch (error) {
        console.error('Error en getPendingReminders:', error);
        res.status(500).json({ ok: false, message: error.message });
    }
};

/**
 * DELETE /api/reminders/:id - Cancelar un recordatorio específico
 */
export const cancelReminder = async (req, res) => {
    try {
        const { id } = req.params;
        const profesionalId = req.user?.id;
        
        const reminder = await ScheduledReminder.findOne({
            _id: id,
            profesional: profesionalId,
            estado: 'pendiente'
        });
        
        if (!reminder) {
            return res.status(404).json({ ok: false, message: 'Recordatorio no encontrado o ya procesado' });
        }
        
        reminder.estado = 'cancelado';
        await reminder.save();
        
        res.json({ ok: true, message: 'Recordatorio cancelado' });
    } catch (error) {
        console.error('Error en cancelReminder:', error);
        res.status(500).json({ ok: false, message: error.message });
    }
};

// Importar mongoose para ObjectId en aggregations
import mongoose from 'mongoose';
