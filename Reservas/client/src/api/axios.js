import axios from "axios";
import { API_URL } from "../config";
import { loadingBus } from "../components/ui/loadingBus";

const instance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Bloqueo automático de pantalla en operaciones que MODIFICAN datos.
// Cualquier POST/PUT/PATCH/DELETE muestra el loader global y bloquea la UI
// hasta que la respuesta llega, evitando inconsistencias por doble envío.
//
// - Se aplica un umbral de 250ms: las peticiones muy rápidas no muestran overlay
//   (evita parpadeos en operaciones de fondo).
// - Para omitir el loader en una llamada puntual: api.post(url, data, { skipLoader: true }).
// - Para personalizar el texto: api.put(url, data, { loaderMessage: 'Guardando…' }).
const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);
const LOADER_DELAY_MS = 250;

instance.interceptors.request.use((config) => {
  const method = (config.method || "get").toLowerCase();
  if (MUTATING_METHODS.has(method) && !config.skipLoader) {
    config.__loaderTimer = setTimeout(() => {
      config.__loaderTimer = null;
      config.__loaderShown = true;
      loadingBus.inc(config.loaderMessage);
    }, LOADER_DELAY_MS);
  }
  return config;
});

const releaseLoader = (config) => {
  if (!config) return;
  if (config.__loaderTimer) {
    clearTimeout(config.__loaderTimer);
    config.__loaderTimer = null;
  }
  if (config.__loaderShown) {
    loadingBus.dec();
    config.__loaderShown = false;
  }
};

instance.interceptors.response.use(
  (response) => {
    releaseLoader(response.config);
    return response;
  },
  (error) => {
    releaseLoader(error.config);
    return Promise.reject(error);
  }
);

export default instance;
