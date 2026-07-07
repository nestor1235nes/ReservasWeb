import Sucursal from '../models/sucursal.model.js';
import WhatsAppPlatformConfig from '../models/whatsappPlatformConfig.model.js';

let cachedPlatformCreds = null;
let cachedPlatformCredsAt = 0;
const CACHE_MS = 30_000;

async function resolvePlatformWhatsAppCredentials() {
  const now = Date.now();
  if (cachedPlatformCreds && now - cachedPlatformCredsAt < CACHE_MS) return cachedPlatformCreds;

  const doc = await WhatsAppPlatformConfig.findOne({ key: 'default' }).lean();
  const fromDb = {
    idInstance: (doc?.idInstance || '').trim(),
    apiTokenInstance: (doc?.apiTokenInstance || '').trim(),
    source: doc?.idInstance && doc?.apiTokenInstance ? 'DB' : 'DB_EMPTY',
  };

  if (fromDb.idInstance && fromDb.apiTokenInstance) {
    cachedPlatformCreds = fromDb;
    cachedPlatformCredsAt = now;
    return fromDb;
  }

  const env = {
    idInstance: String(process.env.GREENAPI_ID_INSTANCE || process.env.WHATSAPP_ID_INSTANCE || '').trim(),
    apiTokenInstance: String(process.env.GREENAPI_API_TOKEN_INSTANCE || process.env.WHATSAPP_API_TOKEN_INSTANCE || '').trim(),
    source: 'ENV',
  };

  const out = env.idInstance && env.apiTokenInstance ? env : { idInstance: null, apiTokenInstance: null, source: 'NONE' };
  cachedPlatformCreds = out;
  cachedPlatformCredsAt = now;
  return out;
}

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

  const platform = await resolvePlatformWhatsAppCredentials();

  const sucursalId = user?.sucursal?._id || user?.sucursal || null;
  if (sucursalId) {
    const sucursal = await Sucursal.findById(sucursalId);

    // Si la sucursal tiene credenciales Green API propias, se envía desde SU número.
    // Si no, se usa el número centralizado de la plataforma (comportamiento por defecto).
    const sucIdInstance = (sucursal?.idInstance || '').trim();
    const sucToken = (sucursal?.apiTokenInstance || '').trim();
    const usaPropias = !!(sucIdInstance && sucToken);

    return {
      source: 'SUCURSAL',
      idInstance: usaPropias ? sucIdInstance : (platform?.idInstance || null),
      apiTokenInstance: usaPropias ? sucToken : (platform?.apiTokenInstance || null),
      defaultMessage: sucursal?.defaultMessage || null,
      reminderMessage: sucursal?.reminderMessage || null,
      credentialsSource: usaPropias ? 'SUCURSAL_OWN' : (platform?.source || null),
      sucursal,
    };
  }

  return {
    source: 'USER',
    idInstance: platform?.idInstance || null,
    apiTokenInstance: platform?.apiTokenInstance || null,
    defaultMessage: user?.defaultMessage || null,
    reminderMessage: user?.reminderMessage || null,
    credentialsSource: platform?.source || null,
    sucursal: null,
  };
}
