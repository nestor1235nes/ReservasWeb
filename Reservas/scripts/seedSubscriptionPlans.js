import "dotenv/config";
import { connectDB } from "../src/db.js";
import SuscriptionPlan from "../src/models/suscriptionPlan.model.js";

const PLANS = [
  {
    name: "Basic",
    price: 24900,
    durationInMonths: 1,
    features: [
      "Agenda digital y personal de citas",
      "Perfil profesional público",
      "Comparte tu enlace de reservas",
      "Recordatorios automáticos por WhatsApp ilimitados",
      "Gestión de pacientes",
      "Descargas de datos en formato PDF",
      "Reportes y métricas básicas",
      "Historial clínico",
    ],
    isActive: true,
  },
  {
    name: "Standard",
    price: 34900,
    durationInMonths: 1,
    features: [
      "Todo lo del plan Basic",
      "Telemedicina",
      "Pagos online con Webpay",
      "Reportes avanzados",
      "Subida de imágenes de exámenes",
      "Bloqueo de horarios para vacaciones y ausencias",
      "Sincronización con Google Calendar",
      "Soporte prioritario",
    ],
    isActive: true,
  },
  {
    name: "Teams",
    // Para Teams usamos el esquema de precios por defecto del modelo
    durationInMonths: 1,
    features: [
      "Todo lo de Standard",
      "Múltiples usuarios por sucursal",
      "Configuración de admins, profesionales y asistentes",
      "Métricas y reportes por usuario y equipo",
    ],
    isActive: true,
  },
];

async function main() {
  try {
    await connectDB();

    for (const plan of PLANS) {
      const existing = await SuscriptionPlan.findOne({ name: plan.name });
      if (existing) {
        console.log(`Plan ${plan.name} ya existe, actualizando...`);
        Object.assign(existing, plan);
        await existing.save();
      } else {
        console.log(`Creando plan ${plan.name}...`);
        await SuscriptionPlan.create(plan);
      }
    }

    const all = await SuscriptionPlan.find();
    console.log("Planes actuales:");
    console.log(all.map(p => ({ name: p.name, price: p.price, isActive: p.isActive })));

    process.exit(0);
  } catch (err) {
    console.error("Error al seedear planes de suscripción:", err);
    process.exit(1);
  }
}

main();
