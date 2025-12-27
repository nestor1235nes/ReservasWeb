import { Router } from 'express';
import path from 'path';
import { createMulter, createStorage } from '../upload.js';
import { auth } from '../middlewares/auth.middleware.js';
import User from '../models/user.model.js';
import Paciente from '../models/paciente.model.js';
import Reserva from '../models/ficha.model.js';
import {
  assertAllowedPrivateImage,
  buildPacienteObjectName,
  createSignedReadUrl,
  createSignedUploadUrl,
  getPrivateImagesBucketName,
} from '../libs/gcsPrivateImages.js';
import {
  assertAllowedPublicAsset,
  buildPublicAssetObjectName,
  createSignedUploadUrl as createPublicSignedUploadUrl,
  getPublicAssetUrl,
  getPublicAssetsBucketName,
} from '../libs/gcsPublicAssets.js';

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

async function assertCanAccessPacienteRut(req, rut) {
  const userId = req.user?.id;
  if (!userId) throw new Error('No autorizado');

  const user = await User.findById(userId).select('_id sucursal adminAtiendePersonas');
  if (!user) throw new Error('No autorizado');
  if (user.adminAtiendePersonas) return;

  const paciente = await Paciente.findOne({ rut: String(rut || '').trim() }).select('_id');
  if (!paciente) throw new Error('Paciente no encontrado');

  const or = [{ profesional: user._id }];
  if (user.sucursal) or.push({ sucursal: user.sucursal });

  const exists = await Reserva.exists({ paciente: paciente._id, $or: or });
  if (!exists) throw new Error('No autorizado');
}

// Ruta para subir la foto de perfil
router.post('/upload', (req, res, next) => {
  uploadProfile.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message || 'Error al subir imagen' });
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
});

// NUEVO: Signed upload para assets (foto perfil / logo) subidos directo a GCS.
// Request: { kind: 'profile'|'logo', name, type, size }
// Response: { uploadUrl, url }
router.post('/upload/signed-upload', auth, async (req, res) => {
  try {
    const bucketName = getPublicAssetsBucketName();
    if (!bucketName) {
      return res.status(501).json({ error: 'GCS_PUBLIC_ASSETS_BUCKET no está configurado' });
    }

    const kind = (req.body?.kind || '').toString().trim().toLowerCase();
    if (!['profile', 'logo'].includes(kind)) {
      return res.status(400).json({ error: "kind inválido (use 'profile' o 'logo')" });
    }

    const contentType = (req.body?.type || '').toString();
    const sizeBytes = req.body?.size;
    const originalName = (req.body?.name || 'imagen').toString();
    assertAllowedPublicAsset({ contentType, sizeBytes });

    const ownerId = req.user?.id;
    if (!ownerId) return res.status(401).json({ error: 'No autorizado' });

    const object = buildPublicAssetObjectName({ kind, ownerId, originalName, contentType });
    const uploadUrl = await createPublicSignedUploadUrl({ bucketName, objectName: object, contentType });
    const url = getPublicAssetUrl({ bucketName, objectName: object });

    return res.json({ uploadUrl, url, object });
  } catch (e) {
    return res.status(400).json({ error: e?.message || 'No se pudo generar signed upload URL' });
  }
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

// --- NUEVO (recomendado): imágenes privadas en GCS vía Signed URLs ---
// Request: { rut, files: [{ name, type, size }] }
// Response: { uploads: [{ object, uploadUrl }] }
router.post('/imagenesPacientes/signed-upload', auth, async (req, res) => {
  try {
    const bucketName = getPrivateImagesBucketName();
    if (!bucketName) {
      return res.status(501).json({ error: 'GCS_PRIVATE_IMAGES_BUCKET no está configurado' });
    }

    const rut = (req.body?.rut || '').toString().trim();
    if (!rut) return res.status(400).json({ error: 'RUT del paciente es requerido' });
    await assertCanAccessPacienteRut(req, rut);

    const files = Array.isArray(req.body?.files) ? req.body.files : [];
    if (!files.length) return res.status(400).json({ error: 'files es requerido' });
    if (files.length > 10) return res.status(400).json({ error: 'Máximo 10 archivos por subida' });

    const uploads = [];
    for (const f of files) {
      const contentType = (f?.type || '').toString();
      const sizeBytes = f?.size;
      const originalName = (f?.name || '').toString();

      assertAllowedPrivateImage({ contentType, sizeBytes });
      const object = buildPacienteObjectName({ rut, originalName, contentType });
      const uploadUrl = await createSignedUploadUrl({ bucketName, objectName: object, contentType });
      uploads.push({ object, uploadUrl });
    }

    return res.json({ uploads });
  } catch (e) {
    return res.status(400).json({ error: e?.message || 'No se pudo generar signed upload URL' });
  }
});

// Request: { rut, objects: ["pacientes/<rut>/..."] }
// Response: { urls: ["https://..."] }
router.post('/imagenesPacientes/signed-read', auth, async (req, res) => {
  try {
    const bucketName = getPrivateImagesBucketName();
    if (!bucketName) {
      return res.status(501).json({ error: 'GCS_PRIVATE_IMAGES_BUCKET no está configurado' });
    }

    const rut = (req.body?.rut || '').toString().trim();
    if (!rut) return res.status(400).json({ error: 'RUT del paciente es requerido' });
    await assertCanAccessPacienteRut(req, rut);

    const objects = Array.isArray(req.body?.objects) ? req.body.objects : [];
    if (!objects.length) return res.status(400).json({ error: 'objects es requerido' });
    if (objects.length > 50) return res.status(400).json({ error: 'Máximo 50 imágenes por solicitud' });

    const prefix = `pacientes/${rut}/`;
    const urls = [];
    for (const obj of objects) {
      const objectName = String(obj || '').trim();
      if (!objectName.startsWith(prefix)) {
        return res.status(400).json({ error: 'Objeto inválido para este paciente' });
      }
      const url = await createSignedReadUrl({ bucketName, objectName });
      urls.push(url);
    }

    return res.json({ urls });
  } catch (e) {
    return res.status(400).json({ error: e?.message || 'No se pudo generar signed read URL' });
  }
});

export default router;