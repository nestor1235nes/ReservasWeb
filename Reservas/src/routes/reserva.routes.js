import { Router } from "express";
import {
    getReserva,
    getReservas,
    createReserva,
    deleteReserva,
    updateReserva,
    getHistorial,
    addHistorial,
} from "../controllers/ficha.controller.js";
import { obtenerPacientesSinSesiones } from "../controllers/funciones.controller.js";

const router = Router();

router.get("/reserva", getReservas);
router.get("/reserva/:id", getReserva);
router.post("/reserva/:rut", createReserva);
router.delete("/reserva/:id", deleteReserva);
router.put("/reserva/:rut", updateReserva);
router.get("/reserva/:id/historial", getHistorial);
router.post("/reserva/:id/historial", addHistorial);

////////////////////// Funciones //////////////////////
router.get("/pacientes-sin-sesiones", obtenerPacientesSinSesiones);

export default router;