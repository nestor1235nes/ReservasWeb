import axios from 'axios';

// Normaliza teléfono a formato 569XXXXXXXX (solo dígitos)
export function normalizePhoneCL(telefono) {
  if (!telefono) return '';
  let tel = String(telefono).replace(/\D/g, '');
  if (tel.length === 11 && tel.startsWith('569')) return tel;
  if (tel.length === 9 && tel.startsWith('9')) return '56' + tel;
  if (tel.length === 8) return '569' + tel;
  if (tel.startsWith('56') && !tel.startsWith('569')) return '569' + tel.slice(2);
  if (tel.length === 12 && tel.startsWith('0569')) return tel.slice(1);
  return tel;
}

export function maskPhone(phoneDigits) {
  const digits = String(phoneDigits || '').replace(/\D/g, '');
  if (!digits) return '';
  const tail = digits.slice(-4);
  return `****${tail}`;
}

export async function sendGreenApiWhatsApp({ idInstance, apiTokenInstance }, phoneNumberDigits, message) {
  const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
  const data = { chatId: `${phoneNumberDigits}@c.us`, message };
  const resp = await axios.post(url, data);
  return resp?.status >= 200 && resp?.status < 300;
}
