// Envío vía backend para evitar CORS y exponer credenciales
import api from './api/axios.js';
import dayjs from 'dayjs';

// Placeholders soportados y su descripción (para futura UI de ayuda)
export const PLACEHOLDERS = [
    { token: '{nombre}', descripcion: 'Nombre del paciente' },
    { token: '{fecha}', descripcion: 'Fecha de la cita (YYYY-MM-DD)' },
    { token: '{hora}', descripcion: 'Hora de la cita (HH:mm)' },
    { token: '{servicio}', descripcion: 'Servicio agendado' },
    { token: '{profesional}', descripcion: 'Nombre del profesional' },
    { token: '{sucursal}', descripcion: 'Nombre de la sucursal' },
    { token: '{enlaceConfirmacion}', descripcion: 'Link único para confirmar / cancelar' }
];

// Obtiene/genera link de confirmación para una reserva (devuelve placeholder si falla)
export async function fetchConfirmationLink(reservaId, _authToken) {
    try {
        // Importante: usar axios configurado (baseURL + withCredentials)
        const resp = await api.post(`/reserva/${reservaId}/confirm-link`);
        return resp.data.link;
    } catch (e) {
        console.error('No se pudo generar link de confirmación', e);
        return '{enlaceConfirmacion}';
    }
}

// Reemplaza placeholders usando datos de la reserva.
// Si template no incluye {enlaceConfirmacion} no se intenta generar.
export function buildMessage(template, reserva, link, options = {}) {
    if (!template) return '';
    // Decidir si agregar línea de confirmación solo para citas no confirmadas
    const { suppressConfirmLine = false } = options;
    const status = (reserva?.confirmStatus || reserva?.status || '').toString().toLowerCase();
    const notConfirmed = status !== 'confirmed';
    const suffixPlain = 'Por favor, confirme su cita a través del siguiente enlace:';
    let base = String(template || '');
    if (!suppressConfirmLine) {
        if (notConfirmed && !base.includes(suffixPlain)) {
            base = base + '\n\nPor favor, confirme su cita a través del siguiente enlace: {enlaceConfirmacion}';
        }
    }
    // Normalizamos todas las variantes de {enlaceconfirmacion} a la forma canónica {enlaceConfirmacion}
    let normalized = base.replace(/\{enlaceconfirmacion\}/gi, '{enlaceConfirmacion}');

    // Formatea fecha a DD-MM-YYYY manejando distintos formatos de entrada
    const formatFecha = (fecha) => {
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
        const d = dayjs(fecha);
        return d.isValid() ? d.format('DD-MM-YYYY') : '';
    };
    const map = {
        '{nombre}': reserva?.paciente?.nombre || '',
    '{fecha}': formatFecha(reserva?.siguienteCita),
        '{hora}': reserva?.hora || '',
        '{servicio}': reserva?.servicio || '',
        '{profesional}': reserva?.profesional?.username || '',
        '{sucursal}': reserva?.sucursal?.nombre || '',
        '{enlaceConfirmacion}': link || '{enlaceConfirmacion}'
    };
    return Object.entries(map).reduce((acc, [k,v]) => acc.replaceAll(k, v), normalized);
}

// Normaliza teléfono a formato 569XXXXXXXX (solo dígitos)
function normalizarTelefono(telefono) {
    if (!telefono) return '';
    let tel = String(telefono).replace(/\D/g, '');
    // Si ya está en formato correcto
    if (tel.length === 11 && tel.startsWith('569')) return tel;
    // 9 dígitos comenzando con 9 -> agregar 56
    if (tel.length === 9 && tel.startsWith('9')) return '56' + tel;
    // 8 dígitos -> agregar 569
    if (tel.length === 8) return '569' + tel;
    // Si empieza con 56 pero no 569 -> corregir
    if (tel.startsWith('56') && !tel.startsWith('569')) return '569' + tel.slice(2);
    // Si viene con 12 dígitos tipo 0569XXXXXXXX -> quitar 0 extra
    if (tel.length === 12 && tel.startsWith('0569')) return tel.slice(1);
    // Como fallback, si tiene 11 y no cumple patrón, devolver tal cual para logueo
    return tel;
}

const sendWhatsAppMessage = async (reservasLiberadas, messageTemplate, user, options = {}) => {
    // Las credenciales ahora las usa el backend desde el perfil del usuario

    let sent = 0;
    const failures = [];
    for (const reserva of reservasLiberadas || []) {
        const rawPhone = reserva?.paciente?.telefono;
        if (!rawPhone) {
            failures.push({ phone: null, reason: 'missing_phone', reservaId: reserva?._id });
            continue;
        }
        const phoneNumber = normalizarTelefono(rawPhone);
        const validPhone = /^569\d{8}$/.test(String(phoneNumber));
        if (!validPhone) {
            failures.push({ phone: rawPhone, normalized: phoneNumber, reason: 'invalid_phone_format', reservaId: reserva?._id });
            continue;
        }

        // Generar link si el template requiere placeholder
        let link = '';
        const needsLink = /\{enlaceconfirmacion\}/i.test(messageTemplate || '') || /\{enlaceConfirmacion\}/.test(messageTemplate || '');
        if (needsLink) {
            try {
                link = await fetchConfirmationLink(reserva._id);
            } catch (e) {
                console.warn('No se pudo obtener enlace de confirmación para', reserva?._id, e);
            }
        }

    const finalMessage = buildMessage(messageTemplate, reserva, link, options);
        if (!finalMessage || !finalMessage.trim()) {
            failures.push({ phone: phoneNumber, reason: 'empty_message', reservaId: reserva?._id });
            continue;
        }

        try {
            const resp = await api.post('/notifications/whatsapp', { phoneNumber, message: finalMessage });
            if (resp?.data?.ok) {
                // Consideramos enviado si el backend no reporta fallos para este número
                const failedForPhone = Array.isArray(resp?.data?.details)
                  ? resp.data.details.find((d) => d.phone === phoneNumber)
                  : null;
                if (!failedForPhone) sent += 1; else failures.push({ phone: phoneNumber, reason: failedForPhone.reason, detail: failedForPhone.detail });
            } else {
                failures.push({ phone: phoneNumber, reason: 'backend_error', detail: resp?.data?.message });
            }
        } catch (error) {
            const msg = error?.response?.data || error?.message || String(error);
            failures.push({ phone: phoneNumber, reason: 'request_error', detail: msg });
            console.error(`Error sending WhatsApp to ${phoneNumber}:`, msg);
        }
    }
    return { sent, failed: failures.length, details: failures };
};

export default sendWhatsAppMessage;