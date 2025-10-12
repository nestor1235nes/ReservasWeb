import { Router } from "express";
import { obtenerHorasDisponibles, liberarHoras, getFeriados, getBlockedDays } from "../controllers/funciones.controller.js";

const router = Router();

////////////////////// Funciones //////////////////////

router.get("/horas-disponibles", obtenerHorasDisponibles);
router.post("/liberar-horas", liberarHoras);
router.get("/blocked-days", getBlockedDays);


export default router;