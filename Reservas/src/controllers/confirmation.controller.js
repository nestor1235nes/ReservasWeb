import crypto from 'crypto';
import Reserva from '../models/ficha.model.js';
import { sendMail } from '../libs/mailer.js';

const TOKEN_BYTES = 24; // 32 chars aprox en base64url
const TOKEN_TTL_HOURS = 48;

const base64UrlEncode = (buf) => buf.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const generateConfirmationLink = async (req, res) => {
  try {
    const { id } = req.params; // id de la reserva
    const reserva = await Reserva.findById(id).populate('paciente').populate('profesional');
    if (!reserva) return res.status(404).json({ message: 'Reserva no encontrada' });

    // Generar nuevo token
    const raw = base64UrlEncode(crypto.randomBytes(TOKEN_BYTES));
    reserva.confirmTokenHash = hashToken(raw);
    reserva.confirmTokenExpires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
    reserva.confirmStatus = reserva.confirmStatus === 'cancelled' ? 'pending' : reserva.confirmStatus; // si estaba cancelada se reabre para confirmación
    reserva.confirmationLog.push({ action: 'generated', meta: { by: req.user?.id } });
    await reserva.save();

  // Determinar base URL preferentemente desde env; si no, inferir de la petición (soporta proxies configurando X-Forwarded-Proto)
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const dynamicBase = `${proto}://${host}`;
  const devFallback = process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : undefined;
  const baseUrl = process.env.FRONTEND_BASE_URL || devFallback || dynamicBase;
  const link = `${baseUrl.replace(/\/$/, '')}/confirmacion/${raw}`;
    // Si el canal es email, enviar correo de confirmación
    try {
      if (reserva.notificationChannel === 'email') {
        const pacienteEmail = reserva.paciente?.email || reserva.email || null;
        if (pacienteEmail) {
          const fecha = reserva.siguienteCita ? new Date(reserva.siguienteCita) : null;
          const fechaStr = fecha ? fecha.toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '';
          const horaStr = reserva.hora ? ` a las ${reserva.hora}` : '';
          const servicioStr = reserva.servicio ? ` para ${reserva.servicio}` : '';
          const subject = 'Confirma tu hora';
          // Determinar remitente dinámico por profesional
          const prof = reserva.profesional;
          const fromName = prof?.username || 'Agenda';
          const fromEmail = prof?.email || undefined;
          const replyTo = prof?.email || undefined;
          const html = `
            <p>Hola${reserva.paciente?.nombre ? ' ' + reserva.paciente.nombre : ''},</p>
            <p>Por favor confirma tu cita${servicioStr}${fechaStr ? ` el ${fechaStr}` : ''}${horaStr}.</p>
            <p>Puedes confirmar o cancelar aquí:</p>
            <p><a href="${link}" target="_blank" rel="noopener">${link}</a></p>
            <p>Este enlace vence el ${reserva.confirmTokenExpires?.toLocaleString('es-CL')}.</p>
          `;
          await sendMail({ to: pacienteEmail, subject, html, fromName, fromEmail, replyTo });
        }
      }
    } catch (e) {
      console.warn('No se pudo enviar email de confirmación:', e?.message || e);
    }

    res.json({ link, expiresAt: reserva.confirmTokenExpires });
  } catch (err) {
    console.error('generateConfirmationLink error', err);
    res.status(500).json({ message: 'Error al generar enlace de confirmación' });
  }
};

export const resolveToken = async (req, res) => {
  try {
    const { token } = req.params;
    const hash = hashToken(token);
    const reserva = await Reserva.findOne({ confirmTokenHash: hash }).populate('paciente').populate('profesional');
    if (!reserva) return res.status(404).json({ message: 'Token inválido' });
    if (!reserva.confirmTokenExpires || reserva.confirmTokenExpires < new Date()) {
      return res.status(410).json({ message: 'Token expirado' });
    }
    res.json({ id: reserva.id, status: reserva.confirmStatus, paciente: reserva.paciente?.nombre, fecha: reserva.siguienteCita, hora: reserva.hora, servicio: reserva.servicio });
  } catch (err) {
    res.status(500).json({ message: 'Error resolviendo token' });
  }
};

export const confirmReserva = async (req, res) => {
  try {
    const { token } = req.params;
    const hash = hashToken(token);
    const reserva = await Reserva.findOne({ confirmTokenHash: hash });
    if (!reserva) return res.status(404).json({ message: 'Token inválido' });
    if (!reserva.confirmTokenExpires || reserva.confirmTokenExpires < new Date()) {
      return res.status(410).json({ message: 'Token expirado' });
    }
    reserva.confirmStatus = 'confirmed';
    reserva.confirmedAt = new Date();
    reserva.confirmationLog.push({ action: 'confirmed' });
    await reserva.save();
    res.json({ message: 'Cita confirmada', status: reserva.confirmStatus });
  } catch (err) {
    res.status(500).json({ message: 'Error confirmando cita' });
  }
};

export const cancelReservaByToken = async (req, res) => {
  try {
    const { token } = req.params;
    const hash = hashToken(token);
    const reserva = await Reserva.findOne({ confirmTokenHash: hash });
    if (!reserva) return res.status(404).json({ message: 'Token inválido' });
    reserva.confirmStatus = 'cancelled';
    reserva.confirmationLog.push({ action: 'cancelled' });
    await reserva.save();
    res.json({ message: 'Cita cancelada', status: reserva.confirmStatus });
  } catch (err) {
    res.status(500).json({ message: 'Error cancelando cita' });
  }
};

export const requestReschedule = async (req, res) => {
  try {
    const { token } = req.params;
    const { newDate, newTime, reason } = req.body;
    const hash = hashToken(token);
    const reserva = await Reserva.findOne({ confirmTokenHash: hash });
    if (!reserva) return res.status(404).json({ message: 'Token inválido' });
    reserva.confirmStatus = 'reschedule_requested';
    reserva.rescheduleRequest = {
      requestedDate: newDate ? new Date(newDate) : undefined,
      requestedTime: newTime,
      reason,
      status: 'open'
    };
    reserva.confirmationLog.push({ action: 'reschedule_requested', meta: { newDate, newTime } });
    await reserva.save();
    res.json({ message: 'Solicitud de cambio registrada', status: reserva.confirmStatus });
  } catch (err) {
    res.status(500).json({ message: 'Error solicitando cambio de horario' });
  }
};

export const resendLink = async (req, res) => {
  try {
    const { id } = req.params;
    const reserva = await Reserva.findById(id);
    if (!reserva) return res.status(404).json({ message: 'Reserva no encontrada' });
    if (!reserva.confirmTokenHash || !reserva.confirmTokenExpires || reserva.confirmTokenExpires < new Date()) {
      // regenerar
      const raw = base64UrlEncode(crypto.randomBytes(TOKEN_BYTES));
      reserva.confirmTokenHash = hashToken(raw);
      reserva.confirmTokenExpires = new Date(Date.now() + TOKEN_TTL_HOURS * 60 * 60 * 1000);
      reserva.confirmationLog.push({ action: 'generated' });
      await reserva.save();
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const dynamicBase = `${proto}://${host}`;
  const devFallback = process.env.NODE_ENV !== 'production' ? 'http://localhost:5173' : undefined;
  const baseUrl = process.env.FRONTEND_BASE_URL || devFallback || dynamicBase;
  const link = `${baseUrl.replace(/\/$/, '')}/confirmacion/${raw}`;
      return res.json({ link, expiresAt: reserva.confirmTokenExpires, regenerated: true });
    }
    // reutilizar
    reserva.confirmationLog.push({ action: 'link_resent' });
    await reserva.save();
    return res.json({ message: 'Link todavía válido', expiresAt: reserva.confirmTokenExpires });
  } catch (err) {
    res.status(500).json({ message: 'Error reenviando enlace' });
  }
};

export const updateConfirmStatus = async (req, res) => {
  try {
    const { id } = req.params; // id de la reserva
    const { status } = req.body; // expected: pending | confirmed | cancelled | reschedule_requested
    const allowed = ['pending','confirmed','cancelled','reschedule_requested'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Estado no permitido' });
    }
    const reserva = await Reserva.findById(id);
    if (!reserva) return res.status(404).json({ message: 'Reserva no encontrada' });
    reserva.confirmStatus = status;
    if (status === 'confirmed') {
      reserva.confirmedAt = new Date();
    }
    reserva.confirmationLog.push({ action: 'manual_update', meta: { to: status, by: req.user?.id } });
    await reserva.save();
    res.json({ message: 'Estado actualizado', status: reserva.confirmStatus });
  } catch (err) {
    res.status(500).json({ message: 'Error actualizando estado' });
  }
};

export default {
  generateConfirmationLink,
  resolveToken,
  confirmReserva,
  cancelReservaByToken,
  requestReschedule,
  resendLink,
  updateConfirmStatus
};