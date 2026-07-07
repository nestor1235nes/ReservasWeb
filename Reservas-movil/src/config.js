// Configuración de la API
// Forzamos SIEMPRE a usar el backend de Google Cloud Run (sin IPs locales),
// así el APK nunca apunta a otra parte.

// Cloud Run: tu API está expuesta bajo /api (por ejemplo: /api/auth/login)
const CLOUD_RUN_API_URL = 'https://reservas-backend-738093538653.southamerica-east1.run.app/api';

// Permite override explícito (EAS env), pero por defecto queda Cloud Run.
// Mantenerlo es útil si algún día cambias a dominio propio sin tocar el código.
const OVERRIDE_API_URL = process.env.EXPO_PUBLIC_API_URL;

export const API_URL = OVERRIDE_API_URL || CLOUD_RUN_API_URL;

// Dominio del frontend web (páginas públicas: /p/:slug del profesional, /:slug de sucursal).
// En móvil no hay window.location.origin, así que se fija aquí (override por EAS env).
// Se usa el dominio propio (.cl), no el de Vercel.
export const WEB_BASE_URL =
  process.env.EXPO_PUBLIC_WEB_URL || 'https://agendavitalink.cl';

export const config = {
  API_URL,
  WEB_BASE_URL,
  // Puedes agregar más configuraciones aquí
  APP_NAME: 'Reservas',
  VERSION: '1.0.0',
};

export default config;
