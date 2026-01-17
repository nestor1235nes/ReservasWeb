import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import PatientOtp from '../models/patientOtp.model.js';
import Paciente from '../models/paciente.model.js';
import { TOKEN_SECRET } from '../config.js';
import WhatsAppPlatformConfig from '../models/whatsappPlatformConfig.model.js';
import { normalizePhoneCL, sendGreenApiWhatsApp, maskPhone } from '../libs/whatsappSend.js';

const OTP_TTL_MINUTES = Number(process.env.PATIENT_OTP_TTL_MINUTES || 10);
const OTP_LENGTH = 6;
const OTP_MAX_ATTEMPTS = Number(process.env.PATIENT_OTP_MAX_ATTEMPTS || 5);

function safeRut(raw) {
  return String(raw || '').trim();
}

function generateOtp() {
  const n = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return String(n).padStart(OTP_LENGTH, '0');
}

function otpHash({ rut, code }) {
  const secret = String(process.env.PATIENT_OTP_SECRET || TOKEN_SECRET || 'secret');
  return crypto.createHash('sha256').update(`${secret}:otp:${rut}:${code}`).digest('hex');
}

async function resolvePlatformCreds() {
  const doc = await WhatsAppPlatformConfig.findOne({ key: 'default' }).lean();
  const idInstance = String(doc?.idInstance || '').trim();
  const apiTokenInstance = String(doc?.apiTokenInstance || '').trim();

  if (idInstance && apiTokenInstance) return { idInstance, apiTokenInstance, source: 'DB' };

  const envId = String(process.env.GREENAPI_ID_INSTANCE || process.env.WHATSAPP_ID_INSTANCE || '').trim();
  const envToken = String(process.env.GREENAPI_API_TOKEN_INSTANCE || process.env.WHATSAPP_API_TOKEN_INSTANCE || '').trim();
  if (envId && envToken) return { idInstance: envId, apiTokenInstance: envToken, source: 'ENV' };

  return { idInstance: '', apiTokenInstance: '', source: 'NONE' };
}

function buildOtpMessage({ otp }) {
  const brand = String(process.env.PATIENT_OTP_BRAND || 'Agenda').trim();
  return `${brand}: tu código de acceso es ${otp}. Válido por ${OTP_TTL_MINUTES} minutos. No lo compartas.`;
}

function issuePatientToken({ rut }) {
  const payload = { type: 'patient', rut: String(rut || '').trim() };
  const expiresIn = String(process.env.PATIENT_TOKEN_EXPIRES_IN || '12h');
  return jwt.sign(payload, TOKEN_SECRET, { expiresIn });
}

export async function requestPatientOtp(req, res) {
  try {
    const rut = safeRut(req.body?.rut);
    if (!rut) return res.status(400).json({ ok: false, message: 'RUT es requerido' });

    const paciente = await Paciente.findOne({ rut }).select('_id rut telefono nombre').lean();
    if (!paciente?._id) {
      return res.status(404).json({ ok: false, message: 'Paciente no encontrado' });
    }

    const phone = normalizePhoneCL(paciente?.telefono);
    const valid = /^569\d{8}$/.test(String(phone));
    if (!valid) {
      return res.status(400).json({
        ok: false,
        message: 'El paciente no tiene un teléfono válido para WhatsApp. Pídele a tu profesional que lo actualice (formato +569XXXXXXXX).',
      });
    }

    const creds = await resolvePlatformCreds();
    if (!creds.idInstance || !creds.apiTokenInstance) {
      return res.status(501).json({ ok: false, message: 'WhatsApp no está configurado en la plataforma.' });
    }

    // Invalidate previous unused OTPs for this rut (optional)
    await PatientOtp.updateMany({ rut, usedAt: null }, { $set: { usedAt: new Date() } });

    const otp = generateOtp();
    const codeHash = otpHash({ rut, code: otp });
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await PatientOtp.create({
      rut,
      phone,
      codeHash,
      expiresAt,
      usedAt: null,
      attempts: 0,
      ip: String(req.ip || ''),
      userAgent: String(req.headers['user-agent'] || ''),
    });

    const message = buildOtpMessage({ otp });
    await sendGreenApiWhatsApp({ idInstance: creds.idInstance, apiTokenInstance: creds.apiTokenInstance }, phone, message);

    return res.json({ ok: true, channel: 'whatsapp', phoneMasked: maskPhone(phone) });
  } catch (e) {
    console.error('requestPatientOtp error:', e);
    return res.status(500).json({ ok: false, message: e?.message || 'No se pudo enviar el OTP' });
  }
}

export async function verifyPatientOtp(req, res) {
  try {
    const rut = safeRut(req.body?.rut);
    const code = String(req.body?.code || '').trim();
    if (!rut || !code) return res.status(400).json({ ok: false, message: 'RUT y código son requeridos' });
    if (!/^\d{6}$/.test(code)) return res.status(400).json({ ok: false, message: 'Código inválido' });

    const now = new Date();
    const record = await PatientOtp.findOne({ rut, usedAt: null, expiresAt: { $gt: now } }).sort({ createdAt: -1 });
    if (!record) return res.status(400).json({ ok: false, message: 'Código expirado o no solicitado. Pide un nuevo código.' });

    if ((record.attempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ ok: false, message: 'Demasiados intentos. Pide un nuevo código.' });
    }

    const expected = otpHash({ rut, code });
    const ok = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(record.codeHash, 'hex'));

    if (!ok) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return res.status(400).json({ ok: false, message: 'Código incorrecto' });
    }

    record.usedAt = new Date();
    await record.save();

    const token = issuePatientToken({ rut });
    return res.json({ ok: true, token, rut });
  } catch (e) {
    console.error('verifyPatientOtp error:', e);
    return res.status(500).json({ ok: false, message: e?.message || 'No se pudo verificar el OTP' });
  }
}
