import { Router } from "express";
import {
  login,
  logout,
  register,
  verifyToken,
  updatePerfil,
  getMe,
  updateMe,
  getAllProfiles,
  updateNotifications,
  deleteNotifications,
  googleAuth,
  deleteBloqueHorario,
  registerUserOnly,
  deleteUser,
  addServicio,
  deleteServicio,
  updateServicio,
  getProfile
} from "../controllers/auth.controller.js";
import { generarEnlace, getBySlug } from "../controllers/auth.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { validateSchema } from "../middlewares/validator.middleware.js";
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "../schemas/auth.schema.js";
import { loginLimiter } from "../middlewares/rateLimit.js";

import {
  requestPasswordResetOtp,
  resetPasswordWithOtp,
  changePassword,
} from "../controllers/passwordReset.controller.js";

const router = Router();

router.post("/register", validateSchema(registerSchema), register);
router.post("/register-only", validateSchema(registerSchema), registerUserOnly);
// Validación primero, luego limitador para contar solo intentos fallidos del controlador
router.post("/login", validateSchema(loginSchema), loginLimiter, login);

// Forgot password (profesionales) via WhatsApp OTP
router.post("/request-password-reset", validateSchema(requestPasswordResetSchema), requestPasswordResetOtp);
router.post("/reset-password", validateSchema(resetPasswordSchema), resetPasswordWithOtp);

// Change password (authenticated)
router.post("/change-password", auth, validateSchema(changePasswordSchema), changePassword);

router.delete("/:id", auth, deleteUser);
router.post("/google-auth", googleAuth);
router.get("/verify", verifyToken);
// Perfil del usuario autenticado (móvil)
router.get("/me", auth, getMe);
router.put("/me", auth, updateMe);
// No necesitamos verificar antes de cerrar sesión; si existe cookie se elimina
router.post("/logout", logout);
router.put("/:id", auth, updatePerfil);
router.get("/:id", auth, getProfile);
router.put("/:id/timetable/:index", auth, deleteBloqueHorario);
router.post("/notifications/:id", auth, updateNotifications);
router.delete("/notifications/:id", auth, deleteNotifications);
router.post("/servicios/:id", auth, addServicio);
router.put("/servicios/:id/:index", auth, updateServicio);
router.delete("/servicios/:id/:index", auth, deleteServicio);
// Generar enlace público del usuario
router.post("/:id/generar-enlace", auth, generarEnlace);
// Obtener perfil público por slug (página de reservas personalizada)
router.get("/by-slug/:slug", getBySlug);
router.get("/", getAllProfiles);

export default router;