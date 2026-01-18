// Catálogo único de plantillas de mensajes WhatsApp (por profesional o por sucursal)

export const DEFAULT_MESSAGE_TEMPLATES = {
  reminders: {
    registroInformativo:
      `Hola {nombre}, su cita ha sido registrada exitosamente para el {dia} {fecha} a las {hora} con {profesional}.\n\n` +
      `Se le enviará un recordatorio 48 horas antes de su cita para confirmar su asistencia.\n\n` +
      `Gracias por su preferencia.`,

    registroConfirmacion:
      `Hola {nombre}, su cita ha sido registrada para el {dia} {fecha} a las {hora} con {profesional}.\n\n` +
      `Por favor, confirme su asistencia a través del siguiente enlace:\n` +
      `{enlaceConfirmacion}\n\n` +
      `Gracias por su preferencia.`,

    recordatorio48h:
      `Hola {nombre}, le recordamos que tiene una cita programada para el {dia} {fecha} a las {hora} con {profesional}.\n\n` +
      `Por favor, confirme su asistencia a través del siguiente enlace:\n` +
      `{enlaceConfirmacion}\n\n` +
      `Si no puede asistir, le agradecemos cancelar su cita para liberar el espacio a otro paciente.`,

    recordatorio24h:
      `Hola {nombre}, le recordamos que MAÑANA tiene una cita a las {hora} con {profesional}.\n\n` +
      `Su cita aún no ha sido confirmada. Por favor, confirme su asistencia:\n` +
      `{enlaceConfirmacion}\n\n` +
      `Si no puede asistir, le agradecemos cancelar su cita.`,
  },

  waitlist: {
    offer:
      `🎉 ¡Buenas noticias, {nombre}!\n\n` +
      `Se ha liberado una hora con {profesional} para el {fecha} a las {hora}.\n\n` +
      `Como estás en la lista de espera, tienes la prioridad para tomar esta hora.\n\n` +
      `⏰ *Tienes {minutosVigencia} minutos para aceptar esta hora.*\n\n` +
      `👉 Acepta aquí: {enlaceOferta}\n\n` +
      `Si no respondes a tiempo, la hora será ofrecida al siguiente paciente en la lista.`,
  },
};

const escapeRegExp = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Reemplaza placeholders {key} por valores en vars.
// Es case-insensitive para soportar variantes antiguas como {enlaceconfirmacion}.
export function renderMessageTemplate(template, vars = {}) {
  if (!template) return '';
  let out = String(template);

  // Normalización legacy
  out = out.replace(/\{enlaceconfirmacion\}/gi, '{enlaceConfirmacion}');

  for (const [rawKey, rawValue] of Object.entries(vars || {})) {
    const key = String(rawKey);
    const value = rawValue === null || rawValue === undefined ? '' : String(rawValue);
    const re = new RegExp(`\\{${escapeRegExp(key)}\\}`, 'gi');
    out = out.replace(re, value);
  }
  return out.trim();
}

export function mergeTemplates({ defaults, userTemplates, sucursalTemplates }) {
  const d = defaults || DEFAULT_MESSAGE_TEMPLATES;
  const u = userTemplates || {};
  const s = sucursalTemplates || {};

  const merged = {
    reminders: {
      ...d.reminders,
      ...(u.reminders || {}),
      ...(s.reminders || {}),
    },
    waitlist: {
      ...d.waitlist,
      ...(u.waitlist || {}),
      ...(s.waitlist || {}),
    },
  };

  // Normalizar strings vacíos: si alguien guardó "", volver a default
  for (const sectionKey of Object.keys(merged)) {
    for (const [k, v] of Object.entries(merged[sectionKey] || {})) {
      if (typeof v === 'string' && !v.trim()) {
        merged[sectionKey][k] = d?.[sectionKey]?.[k] || '';
      }
    }
  }

  return merged;
}
