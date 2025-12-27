import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Autocomplete, CircularProgress, InputAdornment, TextField } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function buildMapsUrl({ placeId, address, lat, lng }) {
  // Mapbox no tiene un visor "consumer" tipo Google Maps; para un link universal usamos OpenStreetMap.
  if (lat != null && lng != null) {
    const z = 16;
    return `https://www.openstreetmap.org/?mlat=${encodeURIComponent(lat)}&mlon=${encodeURIComponent(lng)}#map=${z}/${encodeURIComponent(lat)}/${encodeURIComponent(lng)}`;
  }
  // Fallback: si no hay coordenadas, no generamos URL.
  return '';
}

async function geocodeMapbox({ token, query, signal }) {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set('access_token', token);
  url.searchParams.set('autocomplete', 'true');
  url.searchParams.set('types', 'address,place,poi');
  // Restringe resultados a Chile para mejorar relevancia y velocidad percibida.
  url.searchParams.set('country', 'cl');
  url.searchParams.set('language', 'es');
  url.searchParams.set('limit', '6');

  const res = await fetch(url.toString(), { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Mapbox error ${res.status}`);
  }
  const data = await res.json();
  return Array.isArray(data?.features) ? data.features : [];
}

/**
 * Campo dirección con Mapbox Geocoding (autocomplete).
 * Props:
 * - value: string
 * - onChange: (eventLike) => void (se usa para escribir manual)
 * - onPlaceSelected: (p) => void con { provider, placeId, formattedAddress, lat, lng, url }
 */
export default function MapboxAddressField({
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
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN;
  const canUse = Boolean(token);

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState(value ?? '');

  const lastRequestRef = useRef(0);

  useEffect(() => {
    setInputValue(value ?? '');
  }, [value]);

  useEffect(() => {
    if (!open) return;
    if (!canUse) return;
    if (disabled) return;

    const q = (inputValue || '').trim();
    if (q.length < 3) {
      setOptions([]);
      return;
    }

    const reqId = Date.now();
    lastRequestRef.current = reqId;
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        await sleep(250);
        if (lastRequestRef.current !== reqId) return;
        const feats = await geocodeMapbox({ token, query: q, signal: ac.signal });
        if (lastRequestRef.current !== reqId) return;
        setOptions(
          feats.map((f) => ({
            id: f?.id || '',
            placeId: f?.id || '',
            label: f?.place_name || f?.text || '',
            center: Array.isArray(f?.center) ? f.center : null,
          }))
        );
      } catch {
        if (lastRequestRef.current !== reqId) return;
        setOptions([]);
      } finally {
        if (lastRequestRef.current !== reqId) return;
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [open, inputValue, canUse, disabled, token]);

  const finalHelperText = useMemo(() => {
    if (helperText != null) return helperText;
    if (!canUse) return 'Configura VITE_MAPBOX_ACCESS_TOKEN (o VITE_MAPBOX_TOKEN) para habilitar búsqueda de direcciones.';
    return undefined;
  }, [helperText, canUse]);

  return (
    <Autocomplete
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      loading={loading}
      filterOptions={(x) => x}
      getOptionLabel={(opt) => opt?.label || ''}
      isOptionEqualToValue={(a, b) => a?.placeId === b?.placeId}
      inputValue={inputValue}
      onInputChange={(_e, v, reason) => {
        setInputValue(v);
        if (reason === 'input') {
          if (typeof onChange === 'function') {
            onChange({ target: { value: v, name: 'direccion' } });
          }
        }
      }}
      onChange={(_e, opt) => {
        const formattedAddress = opt?.label || '';
        const lng = Array.isArray(opt?.center) ? opt.center[0] : undefined;
        const lat = Array.isArray(opt?.center) ? opt.center[1] : undefined;
        const placeId = opt?.placeId || '';
        const url = buildMapsUrl({ placeId, address: formattedAddress, lat, lng });

        if (typeof onChange === 'function') {
          onChange({ target: { value: formattedAddress, name: 'direccion' } });
        }
        if (typeof onPlaceSelected === 'function') {
          onPlaceSelected({ provider: 'mapbox', placeId, formattedAddress, lat, lng, url });
        }
      }}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          {...(textFieldProps || {})}
          label={label}
          fullWidth={fullWidth}
          error={error ?? textFieldProps?.error}
          helperText={finalHelperText ?? textFieldProps?.helperText}
          InputProps={{
            ...params.InputProps,
            ...(textFieldProps?.InputProps || {}),
            startAdornment: (
              <InputAdornment position="start">
                <PlaceIcon color={canUse ? 'info' : 'disabled'} />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
}
