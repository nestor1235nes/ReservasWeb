/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  seedTransbankTest.js
 * ─────────────────────────────────────────────────────────────────────────────
 *  Crea datos de prueba para que el equipo de validación de Transbank pueda:
 *    1. Navegar al sitio y ver profesionales con servicios publicados.
 *    2. Seleccionar un servicio con precio.
 *    3. Realizar una reserva de prueba pagando con Webpay (ambiente integración).
 *
 *  Ejecutar:
 *    node --env-file=.env scripts/seedTransbankTest.js
 *
 *  Lo que crea / actualiza:
 *    • Plan "Standard" (si no existe) → habilita pagos Webpay.
 *    • Un profesional de prueba con horario, servicios y precios.
 *    • Un slug público para acceder vía /p/<slug>.
 *
 *  Al finalizar imprime la URL pública donde Transbank puede probar.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "../src/db.js";
import User from "../src/models/user.model.js";
import SuscriptionPlan from "../src/models/suscriptionPlan.model.js";

// ─── Configuración del profesional de prueba ────────────────────────────────

const TEST_PROFESSIONAL = {
  username: "Profesional de Prueba Transbank",
  email: "prueba.transbank@vitalink.cl",
  password: "Transbank2026!",          // se hasheará con bcrypt
  slug: "transbank-test",
  especialidad: "Medicina General",
  especialidad_principal: "Medicina General",
  celular: "+56912345678",
  descripcion:
    "Profesional de prueba para validación de integración Transbank/Webpay. " +
    "Este perfil permite probar el flujo completo de reserva y pago online.",
  cita_presencial: true,
  cita_virtual: true,
  cita_domicilio: false,
  bookingTemplate: "template1",
  bookingBrand: {
    primary: "#1976d2",
    secondary: "#42a5f5",
  },
};

// Servicios de prueba con precios representativos
const TEST_SERVICES = [
  {
    tipo: "Consulta General",
    duracion: "30",
    precio: "15000",
    modalidad: "Presencial",
    descripcion: "Consulta médica general presencial de 30 minutos.",
  },
  {
    tipo: "Consulta Online",
    duracion: "30",
    precio: "12000",
    modalidad: "Virtual",
    descripcion: "Consulta médica por videollamada de 30 minutos.",
  },
  {
    tipo: "Control de Seguimiento",
    duracion: "20",
    precio: "10000",
    modalidad: "Presencial",
    descripcion: "Control breve de seguimiento presencial.",
  },
];

// Horario: Lunes a Viernes, 09:00 – 18:00 con pausa de almuerzo 13:00-14:00
const TEST_TIMETABLE = [
  {
    days: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
    fromTime: "09:00",
    toTime: "18:00",
    interval: 30,
    breakFrom: "13:00",
    breakTo: "14:00",
    slotCapacity: 1,
  },
];

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  try {
    await connectDB();
    console.log("\n🏗  Seed Transbank – iniciando…\n");

    // 1. Asegurar que existe el plan Standard (habilita Webpay)
    let standardPlan = await SuscriptionPlan.findOne({ name: "Standard" });
    if (!standardPlan) {
      console.log("📋 Creando plan Standard…");
      standardPlan = await SuscriptionPlan.create({
        name: "Standard",
        price: 34900,
        durationInMonths: 1,
        features: [
          "Todo lo del plan Basic",
          "Telemedicina",
          "Pagos online con Webpay",
          "Reportes avanzados",
        ],
        isActive: true,
      });
    }
    console.log(`✅ Plan Standard listo (id: ${standardPlan._id})`);

    // 2. Crear o actualizar profesional de prueba
    let user = await User.findOne({ email: TEST_PROFESSIONAL.email });

    const passwordHash = await bcrypt.hash(TEST_PROFESSIONAL.password, 10);

    const now = new Date();
    const subscriptionEnd = new Date(now);
    subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1); // 1 año de suscripción

    const userData = {
      ...TEST_PROFESSIONAL,
      password: passwordHash,
      servicios: TEST_SERVICES,
      timetable: TEST_TIMETABLE,
      suscriptionPlan: standardPlan._id,
      suscriptionStartDate: now,
      suscriptionEndDate: subscriptionEnd,
      blockedDays: [],
      blockedHours: [],
    };

    if (user) {
      console.log("🔄 Profesional ya existe, actualizando…");
      Object.assign(user, userData);
      await user.save();
    } else {
      console.log("👤 Creando profesional de prueba…");
      user = await User.create(userData);
    }

    console.log(`✅ Profesional listo (id: ${user._id})`);

    // 3. Resumen
    const FRONTEND_URL =
      process.env.FRONTEND_URL ||
      process.env.CLIENT_URL ||
      "https://agendavitalink.vercel.app";

    console.log("\n" + "═".repeat(62));
    console.log("  DATOS DE PRUEBA PARA VALIDACIÓN TRANSBANK");
    console.log("═".repeat(62));
    console.log(`  Profesional : ${user.username}`);
    console.log(`  Email       : ${user.email}`);
    console.log(`  Contraseña  : ${TEST_PROFESSIONAL.password}`);
    console.log(`  Slug        : ${user.slug}`);
    console.log(`  Plan        : Standard (Webpay habilitado)`);
    console.log(`  Servicios   : ${TEST_SERVICES.length}`);
    TEST_SERVICES.forEach((s) =>
      console.log(`    • ${s.tipo} — $${parseInt(s.precio).toLocaleString("es-CL")} CLP (${s.modalidad})`)
    );
    console.log("─".repeat(62));
    console.log("  URLs de prueba:");
    console.log(`    Página pública : ${FRONTEND_URL}/p/transbank-test`);
    console.log(`    Login admin    : ${FRONTEND_URL}/login`);
    console.log("─".repeat(62));
    console.log("  Flujo de prueba Webpay:");
    console.log("    1. Visitar la página pública del profesional");
    console.log("    2. Seleccionar fecha y hora disponible");
    console.log("    3. Click en 'Reservar cita'");
    console.log("    4. Completar RUT, nombre, teléfono y email");
    console.log("    5. Seleccionar servicio y método de pago 'Webpay'");
    console.log("    6. Confirmar → se redirige a pasarela Transbank");
    console.log("    7. Usar tarjeta de prueba Transbank:");
    console.log("       Número : 4051 8856 0044 6623");
    console.log("       CVV    : 123");
    console.log("       Exp    : cualquier fecha futura");
    console.log("       RUT    : 11.111.111-1");
    console.log("       Clave  : 123");
    console.log("═".repeat(62));

    process.exit(0);
  } catch (err) {
    console.error("❌ Error:", err);
    process.exit(1);
  }
}

main();
