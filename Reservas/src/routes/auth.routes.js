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
  deleteBloqueHorario
} from "../controllers/auth.controller.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import { loginSchema, registerSchema } from "../schemas/auth.schema.js";

const router = Router();

router.post("/register", validateSchema(registerSchema), register);
router.post("/login", validateSchema(loginSchema), login);
router.post("/google-auth", googleAuth);
router.get("/verify", verifyToken);
router.post("/logout", verifyToken, logout);
router.put("/:id", updatePerfil);
router.put("/:id/timetable/:bloque", deleteBloqueHorario);
router.post("/notifications/:id", updateNotifications);
router.delete("/notifications/:id", deleteNotifications);
router.get("/", getAllProfiles);

export default router;