import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TextField, InputAdornment, CircularProgress } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';

const SCRIPT_ID = 'google-maps-js';

let loadPromise;

function loadGoogleMaps({ apiKey }) {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.maps?.places) return Promise.resolve(true);
  if (!apiKey) return Promise.resolve(false);

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => reject(new Error('No se pudo cargar Google Maps.')));
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('No se pudo cargar Google Maps.'));
    document.head.appendChild(script);
  });

  return loadPromise;
}

function buildMapsUrl(placeId, address, lat, lng) {
  if (placeId) return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;
  if (lat != null && lng != null) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lng}`)}`;
  if (address) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  return '';
}

/**
 * Campo de dirección con Google Places Autocomplete.
 * - Controlado por props: value + onChange
 * - Cuando el usuario elige una sugerencia, dispara onPlaceSelected con {placeId, formattedAddress, lat, lng, url}
 */
export default function GoogleMapsAddressField({
  value,
  onChange,
  onPlaceSelected,
  label = 'Dirección',
  disabled = false,
  fullWidth = true,
  error,
  helperText,
  textFieldProps,
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const [mapsReady, setMapsReady] = useState(false);
  const [loading, setLoading] = useState(false);

  const canUsePlaces = useMemo(() => Boolean(apiKey), [apiKey]);

  useEffect(() => {
    let mounted = true;

    const boot = async () => {
      if (!canUsePlaces) return;
      if (!inputRef.current) return;
      if (disabled) return;

      setLoading(true);
      try {
        const ok = await loadGoogleMaps({ apiKey });
        if (!mounted) return;
        setMapsReady(Boolean(ok));

        if (!ok) return;
        if (!window.google?.maps?.places) return;
        if (autocompleteRef.current) return;

        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ['formatted_address', 'geometry', 'place_id', 'name'],
        });

        ac.addListener('place_changed', () => {
          const place = ac.getPlace();
          const formattedAddress = place?.formatted_address || place?.name || '';
          const placeId = place?.place_id || '';
          const lat = place?.geometry?.location?.lat?.();
          const lng = place?.geometry?.location?.lng?.();
          const url = buildMapsUrl(placeId, formattedAddress, lat, lng);

          if (typeof onChange === 'function') {
            onChange({ target: { value: formattedAddress, name: 'direccion' } });
          }
          if (typeof onPlaceSelected === 'function') {
            onPlaceSelected({ placeId, formattedAddress, lat, lng, url });
          }
        });

        autocompleteRef.current = ac;
      } catch {
        if (!mounted) return;
        setMapsReady(false);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    boot();

    return () => {
      mounted = false;
    };
  }, [apiKey, canUsePlaces, disabled, onChange, onPlaceSelected]);

  const finalHelperText = helperText ?? (!canUsePlaces ? 'Configura VITE_GOOGLE_API_KEY para habilitar búsqueda en Google Maps.' : undefined);

  return (
    <TextField
      {...(textFieldProps || {})}
      label={label}
      value={value ?? ''}
      onChange={onChange}
      fullWidth={fullWidth}
      disabled={disabled}
      error={error}
      helperText={finalHelperText}
      inputRef={inputRef}
      InputProps={{
        ...(textFieldProps?.InputProps || {}),
        startAdornment: (
          <InputAdornment position="start">
            <PlaceIcon color={mapsReady ? 'info' : 'disabled'} />
          </InputAdornment>
        ),
        endAdornment: (
          <>
            {loading && (
              <InputAdornment position="end">
                <CircularProgress size={18} />
              </InputAdornment>
            )}
            {textFieldProps?.InputProps?.endAdornment}
          </>
        ),
      }}
    />
  );
}
