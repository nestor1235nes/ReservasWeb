import crypto from 'crypto';
import path from 'path';
import { Storage } from '@google-cloud/storage';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
export const MAX_PUBLIC_ASSET_BYTES = 5 * 1024 * 1024;

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

export function getPublicAssetsBucketName() {
	return (process.env.GCS_PUBLIC_ASSETS_BUCKET || '').trim();
}

export function assertAllowedPublicAsset({ contentType, sizeBytes }) {
	if (!ALLOWED_MIME_TYPES.has(String(contentType))) {
		throw new Error('Solo se permiten imágenes (jpeg, png, gif, webp)');
	}
	const size = Number(sizeBytes);
	if (Number.isFinite(size) && size > MAX_PUBLIC_ASSET_BYTES) {
		throw new Error('Imagen demasiado grande (máx 5MB)');
	}
}

function pickExtension({ contentType, originalName }) {
	const byMime = mimeToExt[String(contentType)] || '';
	if (byMime) return byMime;
	const ext = path.extname(String(originalName || '')).toLowerCase();
	if (!/^\.[a-z0-9]{1,10}$/.test(ext)) return '';
	return ext;
}

function safeStem(filename) {
	const base = path.basename(String(filename || 'file'));
	const noExt = base.replace(path.extname(base), '');
	return noExt.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60) || 'file';
}

export function buildPublicAssetObjectName({ kind, ownerId, originalName, contentType }) {
	const safeKind = String(kind || 'asset').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'asset';
	const safeOwner = String(ownerId || 'unknown').replace(/[^a-z0-9_-]/gi, '').toLowerCase() || 'unknown';
	const ext = pickExtension({ contentType, originalName });
	const stem = safeStem(originalName);
	const uuid = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
	return `uploads/${safeKind}/${safeOwner}/${Date.now()}-${stem}-${uuid}${ext}`;
}

export function getPublicAssetUrl({ bucketName, objectName }) {
	return `https://storage.googleapis.com/${bucketName}/${encodeURI(objectName)}`;
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
