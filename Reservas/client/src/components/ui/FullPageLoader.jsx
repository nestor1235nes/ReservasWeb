import React from 'react';
import { Box } from '@mui/material';
import VitalinkLoader from './VitalinkLoader';

/**
 * Overlay de carga a pantalla completa (o dentro de un contenedor).
 * Reescrito para usar el loader oficial VitalinkLoader (logo + pulso ECG).
 *
 * Props:
 * - open: boolean para mostrar/ocultar.
 * - message: texto opcional bajo el pulso.
 * - withinContainer: si true, cubre el contenedor relativo en vez de toda la pantalla.
 */
export default function FullPageLoader({ open, message = 'Cargando…', withinContainer = false }) {
  if (!open) return null;

  const baseSx = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(180deg, rgba(246,251,252,0.94) 0%, rgba(255,255,255,0.94) 100%)',
    backdropFilter: 'blur(2px)',
  };

  const positionSx = withinContainer
    ? { position: 'absolute', inset: 0, zIndex: (t) => t.zIndex.modal + 1 }
    : { position: 'fixed', inset: 0, zIndex: (t) => t.zIndex.drawer + 2 };

  return (
    <Box sx={{ ...positionSx, ...baseSx }}>
      <VitalinkLoader caption={message} size="md" />
    </Box>
  );
}
