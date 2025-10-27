import React from 'react';
import { Backdrop, Box, CircularProgress, Typography, useTheme } from '@mui/material';

/**
 * Full-screen loading overlay that matches the app's gradient style.
 * Props:
 * - open: boolean to show/hide
 * - message: optional string
 * - gifSrc: optional path to a gif in /public (e.g., '/loader.gif')
 */
export default function FullPageLoader({ open, message = 'Cargando...', gifSrc, withinContainer = false }) {
  const theme = useTheme();
  if (!open) return null;

  // Modo overlay dentro del contenedor (no tapa sidebar)
  if (withinContainer) {
    return (
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: (t) => t.zIndex.modal + 1,
          background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
          color: '#fff',
        }}
      >
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" px={2}>
          {gifSrc ? (
            <Box component="img" src={gifSrc} alt="loading" sx={{ width: 140, height: 140, mb: 2 }} />
          ) : (
            <CircularProgress thickness={5} size={76} sx={{ color: 'white', mb: 2 }} />
          )}
          <Typography variant="h6" fontWeight={700} color="white">
            {message}
          </Typography>
          <Typography variant="body2" color="rgba(255,255,255,0.85)">
            Por favor, espera un momento…
          </Typography>
        </Box>
      </Box>
    );
  }

  // Modo fullscreen (fallback)
  return (
    <Backdrop
      sx={{
        color: '#fff',
        zIndex: (t) => t.zIndex.drawer + 2,
        background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
      }}
      open={!!open}
    >
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" textAlign="center" px={2}>
        {gifSrc ? (
          <Box component="img" src={gifSrc} alt="loading" sx={{ width: 140, height: 140, mb: 2 }} />
        ) : (
          <CircularProgress thickness={5} size={76} sx={{ color: 'white', mb: 2 }} />
        )}
        <Typography variant="h6" fontWeight={700} color="white">
          {message}
        </Typography>
        <Typography variant="body2" color="rgba(255,255,255,0.85)">
          Por favor, espera un momento…
        </Typography>
      </Box>
    </Backdrop>
  );
}
