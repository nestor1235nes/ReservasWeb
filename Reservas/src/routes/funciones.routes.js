import { Router } from "express";
import { obtenerHorasDisponibles } from "../controllers/funciones.controller.js";

const router = Router();

////////////////////// Funciones //////////////////////

router.get("/horas-disponibles", obtenerHorasDisponibles);

export default router;