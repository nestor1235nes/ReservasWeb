import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ASSETS_BASE } from '../config';
import { Box, IconButton, Dialog, Typography } from '@mui/material';
import BrokenImageIcon from '@mui/icons-material/BrokenImage';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import axios from '../api/axios';

const isAbsoluteUrl = (s) => /^https?:\/\//i.test(String(s || ''));
const isLegacyLocalPath = (s) => /^\/(imagenesPacientes|uploads)\//.test(String(s || ''));
const isGcsObjectName = (s) => !isAbsoluteUrl(s) && !isLegacyLocalPath(s) && !String(s || '').startsWith('data:');

const toDisplaySrc = (value) => {
  const v = String(value || '');
  if (!v) return '';
  if (isAbsoluteUrl(v)) return v;
  if (isLegacyLocalPath(v)) return `${ASSETS_BASE}${v}`;
  return v; // objeto GCS pendiente de resolver
};

const MostrarImagenes = ({ imagenes, rut }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openZoom, setOpenZoom] = useState(false);
  const [resolved, setResolved] = useState([]);
  const refreshFnRef = useRef(null);
  const lastErrorRefreshAtRef = useRef(0);

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? imagenes.length - 1 : prevIndex - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === imagenes.length - 1 ? 0 : prevIndex + 1));
  };

  const handleZoomOpen = () => {
    setOpenZoom(true);
  };

  const handleZoomClose = () => {
    setOpenZoom(false);
  };

  if (!imagenes || imagenes.length === 0) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center">
        <BrokenImageIcon style={{ fontSize: 50, opacity: '0.2' }} />
        <Typography variant="body1">No hay imágenes</Typography>
      </Box>
    );
  }

  const displayList = useMemo(() => {
    const list = Array.isArray(imagenes) ? imagenes : [];
    return list.map(toDisplaySrc);
  }, [imagenes]);

  useEffect(() => {
    let cancelled = false;
    let refreshTimer = null;

    const run = async () => {
      const list = Array.isArray(imagenes) ? imagenes : [];
      const needs = list.filter(isGcsObjectName);
      if (!needs.length) {
        if (!cancelled) setResolved(displayList);
        return;
      }

      if (!rut) {
        // Sin RUT no podemos autorizar/firmar; degradar a lo que haya
        if (!cancelled) setResolved(displayList);
        return;
      }

      try {
        const res = await axios.post('/imagenesPacientes/signed-read', { rut, objects: needs });
        const urls = Array.isArray(res?.data?.urls) ? res.data.urls : [];
        const map = new Map();
        needs.forEach((obj, idx) => map.set(String(obj), urls[idx] || ''));

        const next = list.map((item) => {
          if (!isGcsObjectName(item)) return toDisplaySrc(item);
          return map.get(String(item)) || '';
        });
        if (!cancelled) setResolved(next);
      } catch {
        if (!cancelled) setResolved(displayList);
      }
    };

    refreshFnRef.current = run;

    run();

    // Las signed URLs expiran (TTL backend = 6 días). Refrescamos 1 vez por ciclo.
    // 5.5 días = 5.5 * 24 * 60 * 60 * 1000
    refreshTimer = window.setInterval(() => {
      run();
    }, 5.5 * 24 * 60 * 60 * 1000);

    return () => {
      cancelled = true;
      if (refreshTimer) window.clearInterval(refreshTimer);
    };
  }, [imagenes, rut, displayList]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [imagenes]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" my={2}>
      {imagenes.length > 1 && (
        <IconButton onClick={handlePrev}>
          <ArrowBackIosIcon />
        </IconButton>
      )}
      <img
        src={resolved[currentIndex] || displayList[currentIndex] || ''}
        style={{ maxWidth: '100%', maxHeight: '200px', cursor: 'pointer' }}
        onClick={handleZoomOpen}
        onError={() => {
          // Si expiró la URL, intentamos refrescar una vez (rate-limited) para no entrar en loop.
          const now = Date.now();
          if (now - lastErrorRefreshAtRef.current < 30_000) return;
          lastErrorRefreshAtRef.current = now;
          if (typeof refreshFnRef.current === 'function') refreshFnRef.current();
        }}
      />
      {imagenes.length > 1 && (
        <IconButton onClick={handleNext}>
          <ArrowForwardIosIcon />
        </IconButton>
      )}
      <Dialog open={openZoom} onClose={handleZoomClose} maxWidth="lg">
        <img src={resolved[currentIndex] || displayList[currentIndex] || ''} style={{ width: '100%', height: 'auto' }} />
      </Dialog>
    </Box>
  );
};

export default MostrarImagenes;