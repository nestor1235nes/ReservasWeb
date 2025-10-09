import axios from 'axios';

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
        // Cookie httpOnly se envía automáticamente en misma-origin; no necesitamos Authorization
        const resp = await axios.post(`/api/reserva/${reservaId}/confirm-link`);
        return resp.data.link;
    } catch (e) {
        console.error('No se pudo generar link de confirmación', e);
        return '{enlaceConfirmacion}';
    }
}

// Reemplaza placeholders usando datos de la reserva.
// Si template no incluye {enlaceConfirmacion} no se intenta generar.
export function buildMessage(template, reserva, link) {
    if (!template) return '';
    // Normalizamos todas las variantes de {enlaceconfirmacion} a la forma canónica {enlaceConfirmacion}
    let normalized = template.replace(/\{enlaceconfirmacion\}/gi, '{enlaceConfirmacion}');
    const map = {
        '{nombre}': reserva?.paciente?.nombre || '',
        '{fecha}': reserva?.siguienteCita || '',
        '{hora}': reserva?.hora || '',
        '{servicio}': reserva?.servicio || '',
        '{profesional}': reserva?.profesional?.username || '',
        '{sucursal}': reserva?.sucursal?.nombre || '',
        '{enlaceConfirmacion}': link || '{enlaceConfirmacion}'
    };
    return Object.entries(map).reduce((acc, [k,v]) => acc.replaceAll(k, v), normalized);
}

const sendWhatsAppMessage = async (reservasLiberadas, messageTemplate, user, _authToken) => {
    const { idInstance, apiTokenInstance } = user;
    if (!idInstance || !apiTokenInstance) {
        console.warn('Faltan credenciales de Green API');
        return;
    }

    for (const reserva of reservasLiberadas) {
        const phoneNumber = reserva?.paciente?.telefono;
        if (!phoneNumber) continue;

        // Generar link si el template requiere placeholder
        let link = '';
        // Normalizar para detección case-insensitive
        const needsLink = /\{enlaceconfirmacion\}/i.test(messageTemplate);
        if (needsLink) {
            link = await fetchConfirmationLink(reserva._id);
        }

        const finalMessage = buildMessage(messageTemplate, reserva, link);

        const url = `https://api.green-api.com/waInstance${idInstance}/sendMessage/${apiTokenInstance}`;
        const data = {
            chatId: `${phoneNumber}@c.us`,
            message: finalMessage,
        };
        try {
            await axios.post(url, data);
        } catch (error) {
            console.error(`Error sending WhatsApp message to ${phoneNumber}:`, error);
        }
    }
};

export default sendWhatsAppMessage;