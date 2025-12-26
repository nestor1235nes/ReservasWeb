import Sucursal from '../models/sucursal.model.js';

/**
 * Resuelve credenciales Green API para enviar WhatsApp.
 * Regla:
 * - Si el usuario pertenece a una sucursal, se usan SIEMPRE las credenciales de la sucursal.
 * - Si el usuario es independiente (sin sucursal), se usan las credenciales del propio usuario.
 */
export async function resolveWhatsAppCredentialsForUser(user) {
  if (!user) {
    return { source: null, idInstance: null, apiTokenInstance: null, defaultMessage: null, reminderMessage: null, sucursal: null };
  }

  const sucursalId = user?.sucursal?._id || user?.sucursal || null;
  if (sucursalId) {
    const sucursal = await Sucursal.findById(sucursalId);
    return {
      source: 'SUCURSAL',
      idInstance: sucursal?.idInstance || null,
      apiTokenInstance: sucursal?.apiTokenInstance || null,
      defaultMessage: sucursal?.defaultMessage || null,
      reminderMessage: sucursal?.reminderMessage || null,
      sucursal,
    };
  }

  return {
    source: 'USER',
    idInstance: user?.idInstance || null,
    apiTokenInstance: user?.apiTokenInstance || null,
    defaultMessage: user?.defaultMessage || null,
    reminderMessage: user?.reminderMessage || null,
    sucursal: null,
  };
}
