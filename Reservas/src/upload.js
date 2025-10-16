import fs from 'fs';
import path from 'path';
import multer from 'multer';

// Ensure a directory exists
export function ensureDirSync(dirPath) {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

// Multer file filter to accept only images
export function imageFileFilter(_req, file, cb) {
	const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
	if (allowed.includes(file.mimetype)) return cb(null, true);
	return cb(new Error('Solo se permiten imágenes (jpeg, png, gif, webp)'));
}

// Create a diskStorage with safe filename
export function createStorage(destinationResolver) {
	return multer.diskStorage({
		destination: (req, file, cb) => {
			try {
				const dest = destinationResolver(req, file);
				ensureDirSync(dest);
				cb(null, dest);
			} catch (e) {
				cb(e);
			}
		},
		filename: (_req, file, cb) => {
			// Sanitize original name and prefix timestamp
			const safeOriginal = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
			cb(null, `${Date.now()}-${safeOriginal}`);
		},
	});
}

export function createMulter(storage) {
	return multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB
}

