import { Router } from "express";
import {
    getReserva,
    getReservas,
    createReserva,
    deleteReserva,
    updateReserva,
    getHistorial,
    addHistorial,
    getReservasPorRut, // Importar la nueva función
    getReservasParaExportacion, // Nueva función para exportación ICS
    publicCreateReserva
    
} from "../controllers/ficha.controller.js";
import { obtenerPacientesSinSesiones, getFeriados } from "../controllers/funciones.controller.js";
import { auth } from "../middlewares/auth.middleware.js"; // Importa el middleware de autenticación

const router = Router();

// Rutas más específicas primero para evitar conflictos en algunos entornos
router.get("/reserva/:rut/todas", getReservasPorRut); // Obtener todas las reservas por RUT (pública)
router.get("/reserva/todas/:rut", getReservasPorRut); // Alias alternativo por compatibilidad

router.get("/reserva", auth, getReservas); // Aplica el middleware de autenticación
router.get("/reserva/:rut", auth, getReserva); // Aplica el middleware de autenticación
router.post("/reserva/:rut", auth, createReserva); // Aplica el middleware de autenticación
router.delete("/reserva/:id", auth, deleteReserva); // Aplica el middleware de autenticación
router.put("/reserva/:rut", auth, updateReserva); // Aplica el middleware de autenticación
router.put("/reserva/rut/:rut", auth, updateReserva); // Alias alternativo para actualización
router.get("/reserva/:rut/historial", auth, getHistorial); // Aplica el middleware de autenticación
router.post("/reserva/:rut/historial", auth, addHistorial); // Aplica el middleware de autenticación
router.get("/reservas-exportacion", auth, getReservasParaExportacion); // Nueva ruta para obtener reservas del profesional para exportación ICS
// Ruta pública para crear reserva desde enlace (sin autenticación)
router.post("/public/reserva", publicCreateReserva);

////////////////////// Funciones //////////////////////
router.get("/pacientes-sin-sesiones", auth, obtenerPacientesSinSesiones); // Aplica el middleware de autenticación
router.get('/feriados', getFeriados);

export default router;