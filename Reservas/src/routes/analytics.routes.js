import { Router } from "express";
import {
    getEstadisticasGenerales,
    getEstadisticasPorPeriodo,
    getTendenciasMensuales,
    getPagosPorMes
} from "../controllers/analytics.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

// Rutas para analytics y estadísticas
router.get("/analytics/estadisticas-generales", auth, getEstadisticasGenerales);
router.get("/analytics/estadisticas-periodo", auth, getEstadisticasPorPeriodo);
router.get("/analytics/tendencias-mensuales", auth, getTendenciasMensuales);
router.get("/analytics/pagos-mensuales", auth, getPagosPorMes);

export default router;
