import { Router } from "express";
import {
  login,
  logout,
  register,
  verifyToken,
  updatePerfil,
  getAllProfiles,
  updateNotifications,
  deleteNotifications,
  googleAuth,
  deleteBloqueHorario,
  registerUserOnly,
  deleteUser,
  addServicio,
  deleteServicio,
  updateServicio
} from "../controllers/auth.controller.js";
import { generarEnlace, getBySlug } from "../controllers/auth.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/register", validateSchema(registerSchema), register);
router.post("/register-only", validateSchema(registerSchema), registerUserOnly);
router.post("/login", validateSchema(loginSchema), login);
router.delete("/:id", deleteUser);
router.post("/google-auth", googleAuth);
router.get("/verify", verifyToken);
router.post("/logout", verifyToken, logout);
router.put("/:id", updatePerfil);
router.put("/:id/timetable/:index", deleteBloqueHorario);
router.post("/notifications/:id", updateNotifications);
router.delete("/notifications/:id", deleteNotifications);
router.post("/servicios/:id", addServicio);
router.put("/servicios/:id/:index", updateServicio);
router.delete("/servicios/:id/:index", deleteServicio);
// Generar enlace público del usuario
router.post("/:id/generar-enlace", auth, generarEnlace);
// Obtener perfil público por slug (página de reservas personalizada)
router.get("/by-slug/:slug", getBySlug);
router.get("/", getAllProfiles);

export default router;