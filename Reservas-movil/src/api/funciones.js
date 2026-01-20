import api from './axios';

// Obtener horas disponibles para un profesional en una fecha (YYYY-MM-DD)
// Backend: GET /horas-disponibles?id=<profesionalId>&fecha=<YYYY-MM-DD>
export const obtenerHorasDisponiblesRequest = async ({ profesionalId, fecha }) =>
  api.get('/horas-disponibles', {
    params: {
      id: profesionalId,
      fecha,
    },
  });

// Bloquear día u horarios (Plan Standard/Teams)
// Backend: POST /liberar-horas
// Payload: { fecha: 'YYYY-MM-DD', blockDay: boolean, mode: 'day'|'times', blockedTimes?: string[], customMessage?: string }
export const liberarHorasRequest = async (data) => api.post('/liberar-horas', data);
