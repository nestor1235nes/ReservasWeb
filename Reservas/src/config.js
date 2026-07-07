// Configuración central de la aplicación.
//
// Los valores se leen desde variables de entorno validadas en env.js.
// NUNCA agregues credenciales reales aquí: deben vivir en el archivo .env
// (ignorado por git) en desarrollo, o en las variables de entorno del
// proveedor de hosting (Cloud Run) en producción. Ver .env.template.
import { env } from "./env.js";

export const PORT = env.PORT;
export const MONGODB_URI = env.MONGODB_URI;
export const TOKEN_SECRET = env.TOKEN_SECRET;
export const FRONTEND_URL = env.FRONTEND_URL;

// Google OAuth Client ID. Identificador PÚBLICO (se expone en el navegador).
// env.js conserva el valor actual como respaldo, de modo que el login con
// Google sigue funcionando aunque no se defina la variable de entorno.
export const CLIENT_ID = env.CLIENT_ID;

// Daily.co API key — SECRETO. Debe provenir siempre del entorno.
// Si falta, los endpoints de telemedicina responden con un error controlado
// (ver daily.controller.js) en lugar de tumbar el servidor.
export const DAILY_API_KEY = env.DAILY_API_KEY;
