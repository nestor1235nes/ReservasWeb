// Copia móvil del catálogo de plantillas del backend (Reservas/src/libs/messageTemplates.js).
// Se usan solo para mostrar el valor por defecto cuando el usuario no ha personalizado nada;
// el texto real que se envía siempre lo resuelve el backend.

export const DEFAULT_MESSAGE_TEMPLATES = {
  reminders: {
    registroInformativo:
      `Hola {nombre}, hemos agendado su cita para el {dia} {fecha} a las {hora} con {profesional}.\n\n` +
      `Le enviaremos un mensaje para recordarle y confirmar su asistencia 24 horas antes de su cita.\n\n` +
      `Gracias por su preferencia.`,

    registroConfirmacion:
      `Hola {nombre}, gracias por agendar su cita para el {dia} {fecha} a las {hora} con {profesional}.\n\n` +
      `Por favor, confirme su asistencia a través del siguiente enlace:\n` +
      `{enlaceConfirmacion}\n\n` +
      `Gracias por su preferencia.`,

    recordatorio24h:
      `Hola {nombre}, le recordamos que tiene una cita MAÑANA a las {hora} con {profesional}.\n\n` +
      `Por favor, confirme su asistencia a través del siguiente enlace:\n` +
      `{enlaceConfirmacion}\n\n` +
      `Si no puede asistir, le agradecemos cancelar su cita para liberar el espacio a otro paciente.`,
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

// Definición de las tarjetas del editor: clave dentro de messageTemplates,
// título, descripción de cuándo se envía y placeholders relevantes.
export const TEMPLATE_FIELDS = [
  {
    section: 'reminders',
    key: 'registroInformativo',
    titulo: 'Registro informativo',
    descripcion: 'Se envía al agendar una cita con 24 horas o más de anticipación.',
    placeholders: ['{nombre}', '{dia}', '{fecha}', '{hora}', '{servicio}', '{profesional}', '{sucursal}'],
  },
  {
    section: 'reminders',
    key: 'registroConfirmacion',
    titulo: 'Registro con confirmación',
    descripcion: 'Se envía al agendar una cita con menos de 24 horas de anticipación; incluye el enlace para confirmar.',
    placeholders: ['{nombre}', '{dia}', '{fecha}', '{hora}', '{servicio}', '{profesional}', '{sucursal}', '{enlaceConfirmacion}'],
  },
  {
    section: 'reminders',
    key: 'recordatorio24h',
    titulo: 'Confirmación 24 horas antes',
    descripcion: 'Se envía automáticamente 24 horas antes de la cita para recordar y confirmar asistencia.',
    placeholders: ['{nombre}', '{dia}', '{fecha}', '{hora}', '{servicio}', '{profesional}', '{sucursal}', '{enlaceConfirmacion}'],
  },
  {
    section: 'waitlist',
    key: 'offer',
    titulo: 'Oferta de lista de espera',
    descripcion: 'Se envía cuando se libera una hora y hay pacientes en la lista de espera.',
    placeholders: ['{nombre}', '{fecha}', '{hora}', '{profesional}', '{enlaceOferta}', '{minutosVigencia}'],
  },
];

export const getTemplateValue = (templates, section, key) =>
  (templates && templates[section] && typeof templates[section][key] === 'string'
    ? templates[section][key]
    : '') || '';
