import React, { useMemo } from 'react';
import { Box, Card, CardContent, Link, Typography } from '@mui/material';

const buildMapboxStaticUrl = ({ token, lat, lng, width = 980, height = 520, zoom = 14, pinColor = '111111' }) => {
  if (!token) return '';
  if (lat == null || lng == null) return '';

  // pin-s+<hex>(lng,lat)
  const overlay = `pin-s+${pinColor}(${lng},${lat})`;
  const center = `${lng},${lat},${zoom}`;
  const size = `${width}x${height}`;
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${overlay}/${center}/${size}@2x?access_token=${encodeURIComponent(token)}`;
};

const buildDirectionsUrl = ({ mapsUrl }) => {
  // Sin Google Maps: apuntamos a un visor universal (OpenStreetMap).
  return mapsUrl || '';
};

export default function LocationSection({ prof, brand }) {
  const data = useMemo(() => {
    const suc = prof?.sucursal;

    const placeId = suc?.maps?.placeId || prof?.maps?.placeId || '';
    const formattedAddress =
      suc?.maps?.formattedAddress ||
      suc?.direccion ||
      prof?.maps?.formattedAddress ||
      prof?.direccion ||
      '';

    const lat = (suc?.maps?.lat ?? prof?.maps?.lat) ?? null;
    const lng = (suc?.maps?.lng ?? prof?.maps?.lng) ?? null;
    const url = suc?.maps?.url || prof?.maps?.url || '';

    const mapsUrl = url || '';

    const directionsUrl = buildDirectionsUrl({ mapsUrl });

    return { placeId, formattedAddress, lat, lng, mapsUrl, directionsUrl };
  }, [prof]);

  const BRAND = {
    primary: brand?.primary || '#2596be',
    secondary: brand?.secondary || '#21cbe6',
  };

  if (!data.formattedAddress) return null;

  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || import.meta.env.VITE_MAPBOX_TOKEN;
  const mapImg = buildMapboxStaticUrl({ token, lat: data.lat, lng: data.lng, pinColor: '111111' });

  return (
    <Card elevation={0} sx={{ mt: 2, border: '1px solid #e3f2fd', borderRadius: 2, overflow: 'hidden', boxShadow: '0 8px 16px rgba(37,150,190,0.06)' }}>
      {mapImg && (
        <Box
          component="img"
          alt="Mapa"
          src={mapImg}
          sx={{ width: '100%', height: { xs: 240, sm: 320 }, objectFit: 'cover', display: 'block', bgcolor: '#f8fbff' }}
        />
      )}

      <CardContent sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography sx={{ color: 'text.primary' }}>
            {data.formattedAddress}
          </Typography>

          {data.directionsUrl && (
            <Link
              href={data.directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              sx={{ color: BRAND.primary, fontWeight: 600, whiteSpace: 'nowrap' }}
            >
              Cómo llegar
            </Link>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}
