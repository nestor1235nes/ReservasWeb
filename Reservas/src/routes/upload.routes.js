import { Router } from 'express';
import path from 'path';
import { createMulter, createStorage } from '../upload.js';

const router = Router();

// Almacenamiento para foto de perfil en /uploads
const profileStorage = createStorage(() => 'uploads');
const uploadProfile = createMulter(profileStorage);

// Almacenamiento para imágenes de pacientes en /imagenesPacientes/<rut>
const pacienteStorage = createStorage((req) => {
  const rut = (req.body?.rut || '').toString().trim();
  if (!rut) throw new Error('RUT del paciente es requerido');
  return path.join('imagenesPacientes', rut);
});
const uploadPaciente = createMulter(pacienteStorage);

// Ruta para subir la foto de perfil
router.post('/upload', (req, res, next) => {
  uploadProfile.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Error al subir imagen' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// Ruta para subir múltiples imágenes de pacientes
router.post('/imagenesPacientes', (req, res) => {
  uploadPaciente.array('files')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Error al subir imágenes' });
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No se recibieron archivos' });
    }
    const rut = (req.body?.rut || '').toString().trim();
    const fileUrls = req.files.map(file => `/imagenesPacientes/${rut}/${file.filename}`);
    res.json({ urls: fileUrls });
  });
});

export default router;