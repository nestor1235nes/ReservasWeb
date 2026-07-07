import React, { useEffect, useState } from 'react';
import { loadingBus } from './loadingBus';
import VitalinkLoader from './VitalinkLoader';

/**
 * Overlay de carga global. Se monta una sola vez en la raíz de la app.
 * Cuando hay una operación bloqueante activa (ver loadingBus / interceptores axios),
 * cubre toda la pantalla e impide la interacción para evitar inconsistencias.
 */
export default function GlobalLoadingOverlay() {
  const [state, setState] = useState(loadingBus.getState());

  useEffect(() => loadingBus.subscribe(setState), []);

  if (!state.active) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 20000, // por encima de modales MUI (1300) y drawers
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(180deg, rgba(246,251,252,0.94) 0%, rgba(255,255,255,0.94) 100%)',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        cursor: 'progress',
      }}
    >
      <div
        style={{
          background: '#FFFFFF',
          borderRadius: 16,
          padding: '32px 44px',
          boxShadow: '0 20px 50px rgba(14,42,51,0.12)',
          border: '1px solid #E6FAFB',
        }}
      >
        <VitalinkLoader caption={state.message} size="md" />
      </div>
    </div>
  );
}
