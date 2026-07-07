// Configuración de entorno centralizada y validada.
//
// IMPORTANTE: este módulo SOLO lee process.env. La carga del archivo .env (para
// desarrollo local) ocurre en index.js ANTES de importar este módulo. En
// producción las variables las inyecta la plataforma de hosting (p.ej. Cloud Run).
import { z } from "zod";

// Esquema de la configuración principal que consume config.js.
// - Los valores de infraestructura mantienen valores por defecto aptos para
//   desarrollo, de modo que el entorno local funcione sin configuración extra.
// - Los secretos reales (CLIENT_ID, DAILY_API_KEY) NO tienen valor por defecto:
//   deben proveerse vía variables de entorno y NUNCA se hardcodean en el código.
const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/mern-tasks"),
  TOKEN_SECRET: z.string().min(1).default("secret"),
  FRONTEND_URL: z.string().min(1).default("http://localhost:5173"),
  // Google OAuth Client ID. Es un identificador PÚBLICO (se expone en el
  // navegador), por lo que mantenemos el valor actual como respaldo: así el
  // login con Google NO se rompe aunque la variable no esté definida en el
  // entorno. Se puede sobreescribir / rotar vía variable de entorno.
  CLIENT_ID: z
    .string()
    .default(
      "738093538653-biv296rpnonvgfgpsg5033ediogqg5nd.apps.googleusercontent.com"
    ),
  // Daily.co API key — SECRETO real. Sin respaldo en código: debe venir del
  // entorno. Si falta, la telemedicina se degrada de forma controlada.
  DAILY_API_KEY: z.string().default(""),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // No debería ocurrir porque todos los campos tienen valor por defecto,
  // pero nunca fallamos en silencio.
  console.error(
    "❌ Error validando variables de entorno:",
    parsed.error.flatten().fieldErrors
  );
}

export const env = parsed.success ? parsed.data : envSchema.parse({});

// Diagnóstico de arranque NO fatal. A propósito NO lanzamos excepción aquí: así,
// un secreto opcional ausente degrada una sola funcionalidad en lugar de tumbar
// toda la API.
export function printEnvWarnings() {
  const isProd = env.NODE_ENV === "production";
  const warnings = [];
  const fatals = [];

  if (!env.DAILY_API_KEY) {
    warnings.push(
      "DAILY_API_KEY no está definido — la telemedicina (Daily.co) no funcionará."
    );
  }
  if (isProd && env.TOKEN_SECRET === "secret") {
    // FATAL: con el secreto por defecto cualquiera puede FALSIFICAR tokens JWT y
    // suplantar a cualquier usuario. No se permite arrancar así en producción.
    fatals.push(
      'TOKEN_SECRET usa el valor inseguro por defecto "secret" en producción. Define un secreto fuerte y único en la variable de entorno TOKEN_SECRET.'
    );
  }
  if (isProd && env.MONGODB_URI.includes("127.0.0.1")) {
    warnings.push(
      "MONGODB_URI apunta a localhost en producción. Verifica la cadena de conexión."
    );
  }

  if (warnings.length > 0) {
    console.warn("\n⚠️  Advertencias de configuración (.env):");
    for (const w of warnings) console.warn("   • " + w);
    console.warn("   Revisa .env.template para la lista completa de variables.\n");
  }

  if (fatals.length > 0) {
    console.error("\n❌ Configuración INSEGURA en producción. El servidor no arrancará:");
    for (const f of fatals) console.error("   • " + f);
    console.error("");
    // Abortar el arranque: es preferible caer ruidosamente que servir con JWT falsificables.
    process.exit(1);
  }
}
