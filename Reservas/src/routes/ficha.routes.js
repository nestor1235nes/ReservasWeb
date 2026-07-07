import { Router } from "express";
import { 
    getPaciente, 
    getPacientes, 
    createPaciente, 
    deletePaciente,
    updatePaciente,
    getPacientePorRut,
    getPacientesUsuario,
    publicCreatePaciente,
    publicUpdatePacientePorRut
} from "../controllers/ficha.controller.js";
import { auth } from "../middlewares/auth.middleware.js";
import { portalRutAuth } from "../middlewares/portalRutAuth.middleware.js";

const router = Router();

router.get("/ficha/rut/:rut/", portalRutAuth('rut'), getPacientePorRut);
router.get("/ficha", auth, getPacientes);
router.get("/ficha/:id", auth, getPaciente);
router.post("/ficha", auth, createPaciente);
router.delete("/ficha/:id", auth, deletePaciente);
router.put("/ficha/:id", auth, updatePaciente); // Cambiar de :rut a :id
router.get("/pacientes-usuario", auth, getPacientesUsuario);

// Rutas públicas para flujo de reservas desde enlace (sin autenticación)
router.post("/public/ficha", publicCreatePaciente);
router.put("/public/ficha/rut/:rut", portalRutAuth('rut'), publicUpdatePacientePorRut);

export default router;