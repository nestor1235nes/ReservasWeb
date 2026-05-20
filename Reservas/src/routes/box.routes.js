import { Router } from "express";
import {
  obtenerBoxesSucursal,
  obtenerBox,
  crearBox,
  actualizarBox,
  eliminarBox,
  toggleActivoBox,
} from "../controllers/box.controller.js";
import {
  obtenerOcupacionesBox,
  obtenerAgendaSucursal,
  verificarDisponibilidad,
  crearOcupacion,
  actualizarOcupacion,
  cambiarEstadoOcupacion,
  eliminarOcupacion,
} from "../controllers/boxOcupacion.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

// --- Boxes CRUD ---
router.get("/sucursal/:sucursalId/boxes", auth, obtenerBoxesSucursal);
router.get("/boxes/:id", auth, obtenerBox);
router.post("/sucursal/:sucursalId/boxes", auth, crearBox);
router.put("/boxes/:id", auth, actualizarBox);
router.delete("/boxes/:id", auth, eliminarBox);
router.patch("/boxes/:id/toggle-activo", auth, toggleActivoBox);

// --- Agenda / Ocupación ---
router.get("/sucursal/:sucursalId/boxes/agenda", auth, obtenerAgendaSucursal);
router.get("/boxes/:boxId/ocupaciones", auth, obtenerOcupacionesBox);
router.get("/boxes/:boxId/disponibilidad", auth, verificarDisponibilidad);
router.post("/boxes/:boxId/ocupaciones", auth, crearOcupacion);
router.put("/boxes-ocupaciones/:id", auth, actualizarOcupacion);
router.patch("/boxes-ocupaciones/:id/estado", auth, cambiarEstadoOcupacion);
router.delete("/boxes-ocupaciones/:id", auth, eliminarOcupacion);

export default router;
