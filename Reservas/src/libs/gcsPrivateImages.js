import crypto from 'crypto';
import path from 'path';
import { Storage } from '@google-cloud/storage';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
export const MAX_PRIVATE_IMAGE_BYTES = 5 * 1024 * 1024;

const mimeToExt = {
	'image/jpeg': '.jpg',
	'image/png': '.png',
	'image/gif': '.gif',
	'image/webp': '.webp',
};

let storageSingleton;
function getStorage() {
	if (!storageSingleton) storageSingleton = new Storage();
	return storageSingleton;
}

export function getPrivateImagesBucketName() {
	return (process.env.GCS_PRIVATE_IMAGES_BUCKET || '').trim();
}

export function assertAllowedPrivateImage({ contentType, sizeBytes }) {
	if (!ALLOWED_MIME_TYPES.has(String(contentType))) {
		throw new Error('Solo se permiten imágenes (jpeg, png, gif, webp)');
	}
	const size = Number(sizeBytes);
	if (Number.isFinite(size) && size > MAX_PRIVATE_IMAGE_BYTES) {
		throw new Error('Imagen demasiado grande (máx 5MB)');
	}
}

function safeRut(rut) {
	return String(rut || '')
		.trim()
		.replace(/[^0-9kK\-\.]/g, '')
		.replace(/\.+/g, '.');
}

function safeFileStem(filename) {
	const base = path.basename(String(filename || 'file'));
	const noExt = base.replace(path.extname(base), '');
	return noExt.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'file';
}

function pickExtension({ contentType, originalName }) {
	const byMime = mimeToExt[String(contentType)] || '';
	if (byMime) return byMime;
	const ext = path.extname(String(originalName || '')).toLowerCase();
	// defensivo: si viene raro, no usarlo
	if (!/^\.[a-z0-9]{1,10}$/.test(ext)) return '';
	return ext;
}

export function buildPacienteObjectName({ rut, originalName, contentType }) {
	const cleanRut = safeRut(rut);
	if (!cleanRut) throw new Error('RUT del paciente es requerido');

	const ext = pickExtension({ contentType, originalName });
	const stem = safeFileStem(originalName);
	const uuid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
	return `pacientes/${cleanRut}/${Date.now()}-${stem}-${uuid}${ext}`;
}

export async function createSignedUploadUrl({ bucketName, objectName, contentType, expiresMs = 10 * 60 * 1000 }) {
	const bucket = getStorage().bucket(bucketName);
	const file = bucket.file(objectName);
	const [url] = await file.getSignedUrl({
		version: 'v4',
		action: 'write',
		expires: Date.now() + expiresMs,
		contentType,
	});
	return url;
}

export async function createSignedReadUrl({ bucketName, objectName, expiresMs = 10 * 60 * 1000 }) {
	const bucket = getStorage().bucket(bucketName);
	const file = bucket.file(objectName);
	const [url] = await file.getSignedUrl({
		version: 'v4',
		action: 'read',
		expires: Date.now() + expiresMs,
	});
	return url;
}
