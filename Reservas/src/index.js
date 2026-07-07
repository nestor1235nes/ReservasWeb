// Cargar variables de entorno desde .env SOLO en desarrollo.
// En producción las inyecta la plataforma (Cloud Run) y dotenv no está instalado.
//
// IMPORTANTE: el resto de módulos se importan de forma DINÁMICA (await import)
// para garantizar que .env se cargue ANTES de que config.js lea process.env.
// En ES Modules los imports estáticos se evalúan antes que el cuerpo del módulo,
// por lo que un import estático de config.js leería process.env demasiado pronto.
if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}

const { default: app } = await import("./app.js");
const { PORT } = await import("./config.js");
const { connectDB } = await import("./db.js");
const { printEnvWarnings } = await import("./env.js");
const { startReminderScheduler } = await import("./controllers/reminder.controller.js");

async function main() {
  try {
    printEnvWarnings();
    await connectDB();
    app.listen(PORT);
    console.log(`Listening on port http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    // Scheduler interno para enviar la confirmación automática 24h antes de la cita.
    startReminderScheduler();
  } catch (error) {
    console.error(error);
  }
}

main();
