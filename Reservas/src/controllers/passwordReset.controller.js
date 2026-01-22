import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import PasswordResetOtp from '../models/passwordResetOtp.model.js';
import WhatsAppPlatformConfig from '../models/whatsappPlatformConfig.model.js';
import { normalizePhoneCL, sendGreenApiWhatsApp, maskPhone } from '../libs/whatsappSend.js';
import { TOKEN_SECRET } from '../config.js';

const OTP_TTL_MINUTES = Number(process.env.PASSWORD_RESET_OTP_TTL_MINUTES || 10);
const OTP_LENGTH = 6;
const OTP_MAX_ATTEMPTS = Number(process.env.PASSWORD_RESET_OTP_MAX_ATTEMPTS || 5);

function normalizeEmail(raw) {
  return String(raw || '').trim().toLowerCase();
}

function generateOtp() {
  const n = crypto.randomInt(0, 10 ** OTP_LENGTH);
  return String(n).padStart(OTP_LENGTH, '0');
}

function otpHash({ email, code }) {
  const secret = String(process.env.PASSWORD_RESET_OTP_SECRET || TOKEN_SECRET || 'secret');
  return crypto.createHash('sha256').update(`${secret}:pwd-reset:${email}:${code}`).digest('hex');
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
  const brand = String(process.env.PASSWORD_RESET_OTP_BRAND || 'Agenda Vitalink').trim();
  return `${brand}: tu código para restablecer contraseña es ${otp}. Válido por ${OTP_TTL_MINUTES} minutos. No lo compartas.`;
}

export async function requestPasswordResetOtp(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ ok: false, message: 'El correo es requerido' });

    const user = await User.findOne({ email }).select('_id email celular').lean();
    if (!user?._id) {
      return res.status(404).json({ ok: false, message: 'El correo ingresado no existe' });
    }

    const phone = normalizePhoneCL(user?.celular);
    const valid = /^569\d{8}$/.test(String(phone));
    if (!valid) {
      return res.status(400).json({
        ok: false,
        message: 'El usuario no tiene un teléfono válido para WhatsApp. Actualiza el teléfono en tu perfil (formato +569XXXXXXXX).',
      });
    }

    const creds = await resolvePlatformCreds();
    if (!creds.idInstance || !creds.apiTokenInstance) {
      return res.status(501).json({ ok: false, message: 'WhatsApp no está configurado en la plataforma.' });
    }

    // Invalidate previous unused OTPs for this email
    await PasswordResetOtp.updateMany({ email, usedAt: null }, { $set: { usedAt: new Date() } });

    const otp = generateOtp();
    const codeHash = otpHash({ email, code: otp });
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

    await PasswordResetOtp.create({
      email,
      userId: user._id,
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
    console.error('requestPasswordResetOtp error:', e);
    return res.status(500).json({ ok: false, message: e?.message || 'No se pudo enviar el código' });
  }
}

export async function resetPasswordWithOtp(req, res) {
  try {
    const email = normalizeEmail(req.body?.email);
    const code = String(req.body?.code || '').trim();
    const password = String(req.body?.password || '');

    if (!email || !code || !password) {
      return res.status(400).json({ ok: false, message: 'Correo, código y contraseña son requeridos' });
    }
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ ok: false, message: 'Código inválido' });
    }

    const now = new Date();
    const record = await PasswordResetOtp.findOne({ email, usedAt: null, expiresAt: { $gt: now } }).sort({ createdAt: -1 });
    if (!record) {
      return res.status(400).json({ ok: false, message: 'Código expirado o no solicitado. Pide un nuevo código.' });
    }

    if ((record.attempts || 0) >= OTP_MAX_ATTEMPTS) {
      return res.status(429).json({ ok: false, message: 'Demasiados intentos. Pide un nuevo código.' });
    }

    const expected = otpHash({ email, code });
    const ok = crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(record.codeHash, 'hex'));
    if (!ok) {
      record.attempts = (record.attempts || 0) + 1;
      await record.save();
      return res.status(400).json({ ok: false, message: 'Código incorrecto' });
    }

    const user = await User.findOne({ email });
    if (!user?._id) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });
    }

    user.password = await bcrypt.hash(password, 10);
    await user.save();

    record.usedAt = new Date();
    await record.save();

    return res.json({ ok: true });
  } catch (e) {
    console.error('resetPasswordWithOtp error:', e);
    return res.status(500).json({ ok: false, message: e?.message || 'No se pudo restablecer la contraseña' });
  }
}

export async function changePassword(req, res) {
  try {
    const userId = req.user?.id;
    const currentPassword = String(req.body?.currentPassword || '');
    const newPassword = String(req.body?.newPassword || '');

    if (!userId) return res.status(401).json({ ok: false, message: 'No autorizado' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ ok: false, message: 'Contraseña actual incorrecta' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ ok: true });
  } catch (e) {
    console.error('changePassword error:', e);
    return res.status(500).json({ ok: false, message: e?.message || 'No se pudo cambiar la contraseña' });
  }
}
