import axios from 'axios';
import User from '../models/user.model.js';
import { resolveWhatsAppCredentialsForUser } from '../libs/whatsappCredentials.js';

// Normaliza teléfono a formato 569XXXXXXXX (solo dígitos)
function normalizarTelefono(telefono) {
  if (!telefono) return '';
  let tel = String(telefono).replace(/\D/g, '');
  if (tel.length === 11 && tel.startsWith('569')) return tel;
  if (tel.length === 9 && tel.startsWith('9')) return '56' + tel;
  if (tel.length === 8) return '569' + tel;
  if (tel.startsWith('56') && !tel.startsWith('569')) return '569' + tel.slice(2);
  if (tel.length === 12 && tel.startsWith('0569')) return tel.slice(1);
  return tel;
}

async function enviarWhatsAppConCredenciales({ idInstance, apiTokenInstance }, phoneNumber, message) {
  const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
  const data = { chatId: `${phoneNumber}@c.us`, message };
  const resp = await axios.post(url, data);
  return resp?.status >= 200 && resp?.status < 300;
}

// Envía uno o varios WhatsApps usando las credenciales del usuario autenticado
export const sendWhatsApp = async (req, res) => {
  try {
    const userId = req.user?.id;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado' });

    const creds = await resolveWhatsAppCredentialsForUser(user);
    const { idInstance, apiTokenInstance } = creds;
    if (!idInstance || !apiTokenInstance) {
      const where = creds?.source === 'SUCURSAL' ? 'en la sucursal' : 'en tu perfil';
      return res.status(400).json({ ok: false, message: `Faltan credenciales de Green API ${where} (idInstance y apiTokenInstance)` });
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
      const normalized = normalizarTelefono(raw);
      const valid = /^569\d{8}$/.test(String(normalized));
      if (!valid) { failures.push({ phone: raw, normalized, reason: 'invalid_phone_format' }); continue; }
      if (!it.message || !String(it.message).trim()) { failures.push({ phone: normalized, reason: 'empty_message' }); continue; }
      try {
        const ok = await enviarWhatsAppConCredenciales({ idInstance, apiTokenInstance }, normalized, it.message);
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
