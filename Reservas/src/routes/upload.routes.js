import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configuración de almacenamiento para la foto de perfil (sin cambios)
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Las fotos de perfil se guardan en la carpeta 'uploads'
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Nombre del archivo
  }
});

// Configuración de almacenamiento para las imágenes de pacientes
const pacienteStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const pacienteRut = req.body.rut; 
    const dir = `imagenesPacientes/${pacienteRut}`; 

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true }); // Crea la carpeta si no existe
    }

    cb(null, dir); // Guarda las imágenes en la carpeta del paciente
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Nombre del archivo
  }
});

// Middleware para subir una sola imagen (foto de perfil)
const uploadProfile = multer({ storage: profileStorage });

// Middleware para subir múltiples imágenes (imágenes de pacientes)
const uploadPaciente = multer({ storage: pacienteStorage });

// Ruta para subir la foto de perfil (sin cambios)
router.post('/upload', uploadProfile.single('file'), (req, res) => {
  res.json({ url: `/uploads/${req.file.filename}` }); // Devuelve la URL de la imagen subida
});

// Nueva ruta para subir múltiples imágenes de pacientes
router.post('/imagenesPacientes', uploadPaciente.array('files'), (req, res) => {
  console.log(req.body);
  const fileUrls = req.files.map(file => `/imagenesPacientes/${req.body.rut}/${file.filename}`); // Devuelve las URLs de las imágenes subidas
  res.json({ urls: fileUrls });
});

export default router;