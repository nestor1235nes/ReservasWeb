import { Router } from "express";
import { 
    getPaciente, 
    getPacientes, 
    createPaciente, 
    deletePaciente,
    updatePaciente,
    getPacientePorRut,
} from "../controllers/ficha.controller.js";
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

router.get("/ficha/rut/:rut/", getPacientePorRut);
router.get("/ficha", auth, getPacientes);
router.get("/ficha/:id", getPaciente);
router.post("/ficha", createPaciente);
router.delete("/ficha/:id", deletePaciente);
router.put("/ficha/:id", updatePaciente);

export default router;