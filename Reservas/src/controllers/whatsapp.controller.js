import User from '../models/user.model.js';
import { resolveWhatsAppCredentialsForUser } from '../libs/whatsappCredentials.js';
import { normalizePhoneCL, sendGreenApiWhatsApp } from '../libs/whatsappSend.js';

// NOTE: envío centralizado en src/libs/whatsappSend.js

// Envía uno o varios WhatsApps usando las credenciales del usuario autenticado
export const sendWhatsApp = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });

    const creds = await resolveWhatsAppCredentialsForUser(user);
    const { idInstance, apiTokenInstance } = creds;
    if (!idInstance || !apiTokenInstance) {
      return res.status(503).json({
        ok: false,
        message: 'WhatsApp no está configurado en la plataforma (faltan credenciales GreenAPI globales).',
        reason: 'missing_platform_credentials',
      });
    }

    const { phoneNumber, message, messages } = req.body || {};
    const items = Array.isArray(messages) && messages.length
      ? messages.map((m) => ({ phoneNumber: m.phoneNumber || m.phone, message: m.message }))
      : (phoneNumber && message ? [{ phoneNumber, message }] : []);

    if (!items.length) return res.status(400).json({ ok: false, message: 'Parámetros inválidos. Envía { phoneNumber, message } o { messages: [{ phoneNumber, message }] }' });

    let sent = 0;
    const failures = [];
    for (const it of items) {
      const raw = it.phoneNumber;
      if (!raw) { failures.push({ reason: 'missing_phone' }); continue; }
      const normalized = normalizePhoneCL(raw);
      const valid = /^569\d{8}$/.test(String(normalized));
      if (!valid) { failures.push({ phone: raw, normalized, reason: 'invalid_phone_format' }); continue; }
      if (!it.message || !String(it.message).trim()) { failures.push({ phone: normalized, reason: 'empty_message' }); continue; }
      try {
        const ok = await sendGreenApiWhatsApp({ idInstance, apiTokenInstance }, normalized, it.message);
        if (ok) sent += 1; else failures.push({ phone: normalized, reason: 'http_error' });
      } catch (e) {
        failures.push({ phone: normalized, reason: 'request_error', detail: e?.response?.data || e?.message || String(e) });
      }
    }

    return res.json({ ok: true, sent, failed: failures.length, details: failures });
  } catch (e) {
    console.error('Error en sendWhatsApp:', e);
    return res.status(500).json({ ok: false, message: e?.message || String(e) });
  }
};
