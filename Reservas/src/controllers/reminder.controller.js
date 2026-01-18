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
 * Programar recordatorios para una reserva recién creada
 * Esta función se llama después de crear una reserva
 */
export async function programarRecordatorios(reservaId, profesionalId, pacienteId, fechaCita, horaCita) {
    try {
        const now = new Date();
        const fechaCitaDate = new Date(fechaCita);
        
        // Calcular diferencia en horas
        const diffMs = fechaCitaDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        const recordatoriosACrear = [];
        
        if (diffHours <= 0) {
            // La cita ya pasó, no programar nada
            return { ok: true, message: 'Cita en el pasado, no se programaron recordatorios' };
        }
        
        if (diffHours < 24) {
            // Faltan menos de 24 horas: enviar mensaje de registro con link de confirmación AHORA
            recordatoriosACrear.push({
                reserva: reservaId,
                paciente: pacienteId,
                profesional: profesionalId,
                tipo: 'registro_confirmacion',
                fechaProgramada: now, // Enviar inmediatamente
                fechaCita: fechaCitaDate,
                horaCita
            });
        } else {
            // Faltan más de 24 horas: enviar mensaje informativo AHORA
            recordatoriosACrear.push({
                reserva: reservaId,
                paciente: pacienteId,
                profesional: profesionalId,
                tipo: 'registro_informativo',
                fechaProgramada: now, // Enviar inmediatamente
                fechaCita: fechaCitaDate,
                horaCita
            });
            
            // Programar recordatorio 48 horas antes
            if (diffHours >= 48) {
                const fecha48h = new Date(fechaCitaDate.getTime() - (48 * 60 * 60 * 1000));
                recordatoriosACrear.push({
                    reserva: reservaId,
                    paciente: pacienteId,
                    profesional: profesionalId,
                    tipo: 'recordatorio_48h',
                    fechaProgramada: fecha48h,
                    fechaCita: fechaCitaDate,
                    horaCita
                });
            }
            
            // Programar recordatorio 24 horas antes
            const fecha24h = new Date(fechaCitaDate.getTime() - (24 * 60 * 60 * 1000));
            recordatoriosACrear.push({
                reserva: reservaId,
                paciente: pacienteId,
                profesional: profesionalId,
                tipo: 'recordatorio_24h',
                fechaProgramada: fecha24h,
                fechaCita: fechaCitaDate,
                horaCita
            });
        }
        
        // Crear los recordatorios en la base de datos
        const creados = await ScheduledReminder.insertMany(recordatoriosACrear, { ordered: false }).catch(err => {
            // Ignorar errores de duplicados
            if (err.code === 11000) {
                console.log('Algunos recordatorios ya existían, ignorando duplicados');
                return err.insertedDocs || [];
            }
            throw err;
        });
        
        return { 
            ok: true, 
            message: `Se programaron ${Array.isArray(creados) ? creados.length : recordatoriosACrear.length} recordatorios`,
            recordatorios: recordatoriosACrear.map(r => ({ tipo: r.tipo, fechaProgramada: r.fechaProgramada }))
        };
    } catch (error) {
        console.error('Error programando recordatorios:', error);
        return { ok: false, error: error.message };
    }
}

/**
 * Procesar un recordatorio individual
 */
async function procesarRecordatorio(reminder) {
    try {
        // Recargar la reserva para verificar estado actual
        const reserva = await Reserva.findById(reminder.reserva);
        if (!reserva) {
            reminder.estado = 'cancelado';
            reminder.resultado = { ok: false, reason: 'reserva_not_found' };
            await reminder.save();
            return { ok: false, reason: 'reserva_not_found' };
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
