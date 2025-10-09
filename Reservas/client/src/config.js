// Determina la URL base del API de forma más robusta para evitar que en producción móvil
// intente llamar a localhost. Reglas:
// 1. Si se define VITE_API_URL la usa siempre.
// 2. Si NO existe VITE_API_URL y estamos en un entorno servido (dist) usa mismo origen + /api
// 3. En desarrollo (vite dev server) fallback a localhost:4000/api
let resolvedApiUrl = import.meta.env.VITE_API_URL;

if (!resolvedApiUrl) {
	if (typeof window !== 'undefined') {
		const { origin } = window.location;
		// Si estamos en localhost:5173 asumimos backend en 4000
		if (/localhost:5(1|2)73/.test(origin)) {
			resolvedApiUrl = 'http://localhost:4000/api';
		} else {
			resolvedApiUrl = origin.replace(/\/$/, '') + '/api';
		}
	} else {
		// SSR / fallback
		resolvedApiUrl = 'http://localhost:4000/api';
	}
}

export const API_URL = resolvedApiUrl;

// URL base para recursos estáticos servidos por el backend (uploads, imagenesPacientes)
// - En desarrollo (vite) apunta a http://localhost:4000
// - En producción usa mismo origen (''), y Vercel reescribe a Cloud Run si se configura
export const ASSETS_BASE = (() => {
	if (typeof window !== 'undefined') {
		const { origin } = window.location;
		if (/localhost:5(1|2)73/.test(origin)) {
			return 'http://localhost:4000';
		}
	}
	return '';
})();
