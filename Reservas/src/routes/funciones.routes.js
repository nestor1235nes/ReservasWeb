import { Router } from "express";
import { obtenerHorasDisponibles, liberarHoras, getFeriados } from "../controllers/funciones.controller.js";

const router = Router();

////////////////////// Funciones //////////////////////

router.get("/horas-disponibles", obtenerHorasDisponibles);
router.post("/liberar-horas", liberarHoras);


export default router;