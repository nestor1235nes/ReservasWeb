import api from '../api/axios';

export const PLACEHOLDERS = [
  { token: '{nombre}', descripcion: 'Nombre del paciente' },
  { token: '{fecha}', descripcion: 'Fecha de la cita (DD-MM-YYYY)' },
  { token: '{hora}', descripcion: 'Hora de la cita (HH:mm)' },
  { token: '{servicio}', descripcion: 'Servicio agendado' },
  { token: '{profesional}', descripcion: 'Nombre del profesional' },
  { token: '{sucursal}', descripcion: 'Nombre de la sucursal' },
  { token: '{enlaceConfirmacion}', descripcion: 'Link único para confirmar / cancelar' },
];

export const normalizePhoneCL = (telefono) => {
  if (!telefono) return '';
  let tel = String(telefono).replace(/\D/g, '');
  if (tel.length === 11 && tel.startsWith('569')) return tel;
  if (tel.length === 9 && tel.startsWith('9')) return `56${tel}`;
  if (tel.length === 8) return `569${tel}`;
  if (tel.startsWith('56') && !tel.startsWith('569')) return `569${tel.slice(2)}`;
  if (tel.length === 12 && tel.startsWith('0569')) return tel.slice(1);
  return tel;
};

export async function fetchConfirmationLink(reservaId) {
  try {
    const resp = await api.post(`/reserva/${encodeURIComponent(reservaId)}/confirm-link`);
    return resp?.data?.link || '';
  } catch (e) {
    return '';
  }
}

const formatFecha = (fecha) => {
  try {
    if (!fecha) return '';
    if (typeof fecha === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        const [y, m, d] = fecha.split('-');
        return `${d}-${m}-${y}`;
      }
      if (fecha.endsWith('Z') && fecha.includes('T')) {
        const base = fecha.slice(0, 10);
        const [y, m, d] = base.split('-');
        return `${d}-${m}-${y}`;
      }
    }
    const dt = new Date(fecha);
    if (Number.isNaN(dt.getTime())) return '';
    const dd = String(dt.getDate()).padStart(2, '0');
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const yyyy = dt.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  } catch {
    return '';
  }
};

export function buildWhatsAppMessage(template, reserva, link = '') {
  if (!template) return '';
  const normalized = String(template || '').replace(/\{enlaceconfirmacion\}/gi, '{enlaceConfirmacion}');

  const map = {
    '{nombre}': reserva?.paciente?.nombre || '',
    '{fecha}': formatFecha(reserva?.siguienteCita),
    '{hora}': reserva?.hora || '',
    '{servicio}': reserva?.servicio || reserva?.tipoCita || '',
    '{profesional}': reserva?.profesional?.username || reserva?.profesional?.name || '',
    '{sucursal}': reserva?.sucursal?.nombre || '',
    '{enlaceConfirmacion}': link || '{enlaceConfirmacion}',
  };

  return Object.entries(map)
    .reduce((acc, [k, v]) => acc.split(k).join(String(v ?? '')), normalized)
    .trim();
}
