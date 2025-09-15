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
    getEstadoConfirmacion,
    confirmReservaPorToken,
    cancelarReservaPorToken,
    solicitarReagendarPorToken
} from "../controllers/ficha.controller.js";
import { obtenerPacientesSinSesiones, getFeriados } from "../controllers/funciones.controller.js";
import { auth } from "../middlewares/auth.middleware.js"; // Importa el middleware de autenticación

const router = Router();

router.get("/reserva", auth, getReservas); // Aplica el middleware de autenticación
router.get("/reserva/:rut", auth, getReserva); // Aplica el middleware de autenticación
router.post("/reserva/:rut", auth, createReserva); // Aplica el middleware de autenticación
router.delete("/reserva/:id", auth, deleteReserva); // Aplica el middleware de autenticación
router.put("/reserva/:rut", auth, updateReserva); // Aplica el middleware de autenticación
router.get("/reserva/:rut/historial", auth, getHistorial); // Aplica el middleware de autenticación
router.post("/reserva/:rut/historial", auth, addHistorial); // Aplica el middleware de autenticación
router.get("/reserva/:rut/todas", getReservasPorRut); // Nueva ruta para obtener todas las reservas de un paciente por RUT
router.get("/reservas-exportacion", auth, getReservasParaExportacion); // Nueva ruta para obtener reservas del profesional para exportación ICS

////////////////////// Funciones //////////////////////
router.get("/pacientes-sin-sesiones", auth, obtenerPacientesSinSesiones); // Aplica el middleware de autenticación
router.get('/feriados', getFeriados);

// Rutas públicas de confirmación (no requieren auth)
router.get('/reserva/confirmacion/:token', getEstadoConfirmacion);
router.post('/reserva/confirmacion/:token/confirmar', confirmReservaPorToken);
router.post('/reserva/confirmacion/:token/cancelar', cancelarReservaPorToken);
router.post('/reserva/confirmacion/:token/reagendar', solicitarReagendarPorToken);

export default router;