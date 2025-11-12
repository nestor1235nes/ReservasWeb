import { gapi } from 'gapi-script';

// Google Identity Services (GIS) + gapi client (solo para llamadas de API)
// Frontend lee variables de entorno prefijadas con VITE_
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '738093538653-biv296rpnonvgfgpsg5033ediogqg5nd.apps.googleusercontent.com';
// No usar una API KEY por defecto. Si no está definida en entornos, omitimos apiKey para evitar 400 por mismatch de proyecto.
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

let tokenClient = null;
let accessToken = null;
let cachedEmail = null;

const setupAuthShim = () => {
  // Emula lo mínimo de gapi.auth2 que usa la app (isSignedIn y signOut)
  try {
    if (!window.gapi) return;
    window.gapi.auth2 = {
      getAuthInstance: () => ({
        isSignedIn: { get: () => Boolean(accessToken) },
        signOut: async () => {
          try {
            if (accessToken && window.google?.accounts?.oauth2?.revoke) {
              await new Promise((resolve) => window.google.accounts.oauth2.revoke(accessToken, resolve));
            }
          } catch (_) {}
          accessToken = null;
          cachedEmail = null;
          try { gapi.client.setToken(null); } catch (_) {}
        },
        currentUser: {
          get: () => ({
            getAuthResponse: () => ({ access_token: accessToken }),
          }),
        },
      }),
    };
  } catch (_) {}
};

export const initClient = async () => {
  try { console.log('[GoogleAuth][GIS] Using CLIENT_ID:', CLIENT_ID, 'API_KEY set:', Boolean(API_KEY)); } catch (_) {}
  // Si no tenemos API_KEY configurada en el entorno, inicializamos sin apiKey.
  if (API_KEY) {
    await gapi.client.init({ apiKey: API_KEY, discoveryDocs: DISCOVERY_DOCS });
  } else {
    await gapi.client.init({ discoveryDocs: DISCOVERY_DOCS });
  }
  setupAuthShim();
  // Prepara el token client de GIS (callback se setea por llamada)
  if (window.google?.accounts?.oauth2 && !tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {},
    });
  }
};

const requestToken = (loginHintEmail, { silent = false } = {}) => new Promise((resolve, reject) => {
  try {
    if (!tokenClient && window.google?.accounts?.oauth2) {
      tokenClient = window.google.accounts.oauth2.initTokenClient({ client_id: CLIENT_ID, scope: SCOPES, callback: () => {} });
    }
    if (!tokenClient) return reject(new Error('GIS not loaded'));

    tokenClient.callback = (resp) => {
      if (resp?.access_token) {
        accessToken = resp.access_token;
        try { gapi.client.setToken({ access_token: accessToken }); } catch (_) {}
        setupAuthShim();
        resolve(accessToken);
      } else {
        reject(resp || new Error('No access token'));
      }
    };

    const opts = {};
    // silent: intenta sin UI; de lo contrario, si no hay token pedirá consentimiento
    opts.prompt = silent ? '' : (accessToken ? '' : 'consent');
    if (loginHintEmail) opts.hint = loginHintEmail;
    tokenClient.requestAccessToken(opts);
  } catch (e) {
    reject(e);
  }
});

// Pública: intenta obtener token sin UI; útil cuando el usuario ya consintió en Perfil
export const ensureGoogleToken = async (loginHintEmail, options = { silent: true }) => {
  return requestToken(loginHintEmail, options);
};

// Interna por compatibilidad con flujos existentes que esperan pedir consentimiento si falta
const ensureToken = (loginHintEmail) => requestToken(loginHintEmail, { silent: false });

const fetchEmail = async () => {
  if (cachedEmail) return cachedEmail;
  try {
    const resp = await gapi.client.request({ path: 'https://www.googleapis.com/oauth2/v2/userinfo' });
    cachedEmail = resp?.result?.email || null;
    return cachedEmail;
  } catch (_) {
    return null;
  }
};

// Realiza el login con GIS y retorna el correo del usuario autenticado
export const syncWithGoogle = async (loginHintEmail) => {
  await ensureToken(loginHintEmail);
  const email = await fetchEmail();
  if (!email) {
    // Si no pudimos obtener email igual devolvemos true para permitir uso de Calendar
    return null;
  }
  return email;
};

// Exponer global para compatibilidad con llamadas existentes
window.syncWithGoogle = syncWithGoogle;

export const signOutGoogle = async () => {
  try {
    await window.gapi?.auth2?.getAuthInstance?.().signOut();
  } catch (_) {}
};