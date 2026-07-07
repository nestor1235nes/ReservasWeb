import Sucursal from '../models/sucursal.model.js';

// Normaliza una referencia que puede venir como ObjectId crudo o documento poblado.
const idStr = (ref) => {
  if (!ref) return '';
  if (typeof ref === 'object' && ref._id) return String(ref._id);
  return String(ref);
};

// ¿Puede el usuario (profesional / admin / asistente) gestionar esta reserva?
// Reglas (permite si se cumple CUALQUIERA):
//   1. Es el profesional dueño de la cita.
//   2. La reserva pertenece a una sucursal donde el usuario es administrador,
//      profesional o asistente — ya sea por el campo `sucursal` de la reserva o
//      porque el profesional de la reserva pertenece a esa sucursal (cubre el caso
//      de reservas antiguas sin `sucursal` asignada).
// Devuelve false solo ante acceso entre cuentas distintas (IDOR).
export async function canManageReserva(userId, reserva) {
  if (!userId || !reserva) return false;
  const uid = String(userId);
  const profId = idStr(reserva.profesional);

  // 1) Profesional dueño de la cita.
  if (profId && profId === uid) return true;

  // 2) Pertenencia por sucursal.
  const sucursales = await Sucursal.find({
    $or: [
      { administradores: userId },
      { profesionales: userId },
      { asistentes: userId },
    ],
  }).select('_id profesionales');

  const reservaSucId = idStr(reserva.sucursal);
  for (const s of sucursales) {
    if (reservaSucId && reservaSucId === String(s._id)) return true;
    if (profId && Array.isArray(s.profesionales) && s.profesionales.some((p) => String(p) === profId)) {
      return true;
    }
  }

  return false;
}

export default canManageReserva;
