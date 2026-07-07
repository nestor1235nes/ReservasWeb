// Bus de carga global (pub/sub) — usable desde React y desde fuera (cliente HTTP).
// Mantiene un contador: si hay 1+ operaciones bloqueantes activas, el overlay se muestra.
// Port del módulo homónimo del cliente web (Reservas/client/src/components/ui/loadingBus.js).

let count = 0;
let message = 'Cargando…';
const listeners = new Set();

const emit = () => {
  const state = { active: count > 0, message };
  listeners.forEach((fn) => {
    try { fn(state); } catch { /* noop */ }
  });
};

export const loadingBus = {
  subscribe(fn) {
    listeners.add(fn);
    fn({ active: count > 0, message }); // estado inicial
    return () => listeners.delete(fn);
  },
  /** Incrementa el contador y muestra el overlay (opcionalmente con mensaje). */
  inc(msg) {
    if (msg) message = msg;
    count += 1;
    emit();
  },
  /** Decrementa el contador; oculta el overlay cuando llega a 0. */
  dec() {
    count = Math.max(0, count - 1);
    if (count === 0) message = 'Cargando…';
    emit();
  },
  /** Fuerza el cierre del overlay (p.ej. ante errores globales). */
  reset() {
    count = 0;
    message = 'Cargando…';
    emit();
  },
  getState() {
    return { active: count > 0, message };
  },
};

// API imperativa para casos que no pasan por el cliente HTTP.
// Uso: const stop = showLoader('Guardando…'); try { ...await... } finally { stop(); }
export const showLoader = (msg) => {
  loadingBus.inc(msg);
  return () => loadingBus.dec();
};
export const hideLoader = () => loadingBus.dec();
