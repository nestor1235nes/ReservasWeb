import React, { useEffect, useMemo, useState } from 'react';
import { Box, Card, CardContent, CardHeader, Chip, Divider, FormControl, InputLabel, MenuItem, Select, Stack, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../../context/authContext';
import { useSucursal } from '../../context/sucursalContext';
import { useAlert } from '../../context/AlertContext';
import dayjs from 'dayjs';
import FullPageLoader from '../../components/ui/FullPageLoader';
import { BarChart, PieChart, LineChart } from '@mui/x-charts';

// Period options in months
const PERIOD_OPTIONS = [1, 3, 6, 12];

// Utility helpers
const toYmd = (d) => dayjs(d).format('YYYY-MM-DD');
const parseDateMaybe = (d) => (d ? dayjs(d) : null);

// Compute metrics per professional
function computeMetrics(reservas, fromDate) {
  // Filter by period
  const filtered = reservas.filter((r) => {
    const fecha = r.siguienteCita || r.diaPrimeraCita || r.createdAt || r.updatedAt;
    if (!fecha) return false;
    const dd = parseDateMaybe(fecha);
    return dd && dd.isAfter(fromDate.subtract(1, 'day'));
  });

  // Group by profesional
  const byProf = new Map();
  for (const r of filtered) {
    const prof = r.profesional?._id || r.profesional || 'desconocido';
    if (!byProf.has(prof)) {
      byProf.set(prof, { reservas: [], profesional: r.profesional });
    }
    byProf.get(prof).reservas.push(r);
  }

  // Build per-professional stats
  const items = [];
  for (const [, { reservas: rs, profesional }] of byProf) {
    const pacientesUnicos = new Set(rs.map((x) => x.paciente?._id || x.paciente)).size;
    const pagosCompletados = rs.filter((x) => x.paymentStatus === 'completed');
    const ingresos = pagosCompletados.reduce((acc, x) => acc + (x.paymentAmount || x.paymentData?.amount || 0), 0);
    const conteoPagos = pagosCompletados.length;
    const ticketPromedio = conteoPagos > 0 ? Math.round(ingresos / conteoPagos) : 0;

    // Servicios top
    const serviciosMap = new Map();
    rs.forEach((x) => {
      const s = x.servicio || 'Sin servicio';
      serviciosMap.set(s, (serviciosMap.get(s) || 0) + 1);
    });
    const topServicios = Array.from(serviciosMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    items.push({
      profesional,
      totalReservas: rs.length,
      pacientesUnicos,
      ingresos,
      ticketPromedio,
      topServicios,
    });
  }

  // Global aggregates
  const global = items.reduce(
    (acc, it) => {
      acc.totalReservas += it.totalReservas;
      acc.pacientesUnicos += it.pacientesUnicos; // note: overlaps across pros are possible; we keep simple sum for ranking
      acc.ingresos += it.ingresos;
      return acc;
    },
    { totalReservas: 0, pacientesUnicos: 0, ingresos: 0 }
  );

  // Trending by month (last N)
  const start = fromDate.startOf('month');
  const months = [];
  let cursor = start;
  while (cursor.isBefore(dayjs().endOf('month'))) {
    months.push(cursor);
    cursor = cursor.add(1, 'month');
  }
  const reservasPorMes = months.map((m) => {
    const key = m.format('YYYY-MM');
    const count = filtered.filter((r) => dayjs(r.siguienteCita || r.diaPrimeraCita || r.createdAt).format('YYYY-MM') === key).length;
    return { key, count };
  });
  const ingresosPorMes = months.map((m) => {
    const key = m.format('YYYY-MM');
    const sum = filtered
      .filter((r) => (r.paymentStatus === 'completed') && dayjs(r.siguienteCita || r.diaPrimeraCita || r.createdAt).format('YYYY-MM') === key)
      .reduce((acc, r) => acc + (r.paymentAmount || r.paymentData?.amount || 0), 0);
    return { key, sum };
  });

  return { items, global, reservasPorMes, ingresosPorMes };
}

const ReportesEmpresa = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { user, esAdminSucursal } = useAuth();
  const { getReservasSucursal, getProfesionalesSucursal } = useSucursal();
  const showAlert = useAlert();

  const [loading, setLoading] = useState(true);
  const [periodMonths, setPeriodMonths] = useState(3);
  const [reservas, setReservas] = useState([]);
  const [profesionales, setProfesionales] = useState([]);

  const fromDate = useMemo(() => dayjs().subtract(periodMonths - 1, 'month').startOf('month'), [periodMonths]);

  useEffect(() => {
    const cargar = async () => {
      if (!user?.sucursal?._id) {
        showAlert('error', 'No se encontró la sucursal del usuario.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const [rs, pros] = await Promise.all([
          getReservasSucursal(user.sucursal._id),
          getProfesionalesSucursal(user.sucursal._id),
        ]);
        setReservas(rs || []);
        setProfesionales(pros || []);
      } catch (e) {
        console.error(e);
        showAlert('error', 'No se pudieron cargar los datos de la empresa.');
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, [user?.sucursal?._id, getReservasSucursal, getProfesionalesSucursal, showAlert]);

  const metrics = useMemo(() => computeMetrics(reservas, fromDate), [reservas, fromDate]);

  // Derive ranking top 5 profesionales por reservas e ingresos
  const rankingPorReservas = useMemo(() =>
    [...metrics.items]
      .sort((a, b) => b.totalReservas - a.totalReservas)
      .slice(0, 5)
  , [metrics.items]);

  const rankingPorIngresos = useMemo(() =>
    [...metrics.items]
      .sort((a, b) => b.ingresos - a.ingresos)
      .slice(0, 5)
  , [metrics.items]);

  const formatMoney = (n) => `$${(n || 0).toLocaleString('es-CL')}`;

  return (
    <Box sx={{ position: 'relative' }}>
      <FullPageLoader open={loading} withinContainer message="Cargando reportes de la empresa" />

      <Stack
        p={isMobile ? 1 : 1.5}
        borderRadius={1}
        sx={{
          background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          gap: isMobile ? 1.5 : 0,
          mb: isMobile ? 1 : 0,
        }}
      >
        <Box display="flex" flexDirection={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'stretch' : 'center'} width="100%" gap={isMobile ? 1 : 0}>
          <Typography variant={isMobile ? 'h6' : 'h5'} fontWeight={700} color="white" mb={isMobile ? 1 : 0}>
            Reportes de Mi Empresa
          </Typography>
          <FormControl size="small" sx={{ minWidth: 160, background: 'white', borderRadius: 1 }}>
            <InputLabel>Período</InputLabel>
            <Select label="Período" value={periodMonths} onChange={(e) => setPeriodMonths(Number(e.target.value))}>
              {PERIOD_OPTIONS.map((m) => (
                <MenuItem key={m} value={m}>Últimos {m} meses</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Stack>

      {/* KPIs globales */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mt={2}>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Reservas totales</Typography>
            <Typography variant="h4" fontWeight={700}>{metrics.global.totalReservas}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Pacientes únicos (aprox.)</Typography>
            <Typography variant="h4" fontWeight={700}>{metrics.global.pacientesUnicos}</Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardContent>
            <Typography variant="overline" color="text.secondary">Ingresos</Typography>
            <Typography variant="h4" fontWeight={700}>{formatMoney(metrics.global.ingresos)}</Typography>
          </CardContent>
        </Card>
      </Stack>

      {/* Tendencias */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mt={2}>
        <Card sx={{ flex: 1 }}>
          <CardHeader title="Reservas por mes" subheader={`Desde ${toYmd(fromDate)}`} />
          <CardContent>
            <BarChart
              xAxis={[{ data: metrics.reservasPorMes.map((d) => d.key), scaleType: 'band' }]}
              series={[{ data: metrics.reservasPorMes.map((d) => d.count), color: '#2596be', label: 'Reservas' }]}
              height={260}
            />
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardHeader title="Ingresos por mes" subheader={`Desde ${toYmd(fromDate)}`} />
          <CardContent>
            <BarChart
              xAxis={[{ data: metrics.ingresosPorMes.map((d) => d.key), scaleType: 'band' }]}
              series={[{ data: metrics.ingresosPorMes.map((d) => d.sum), color: '#2ecc71', label: 'Ingresos' }]}
              height={260}
            />
          </CardContent>
        </Card>
      </Stack>

      {/* Rankings */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} mt={2}>
        <Card sx={{ flex: 1 }}>
          <CardHeader title="Top profesionales por reservas" subheader={`Últimos ${periodMonths} meses`} />
          <CardContent>
            {rankingPorReservas.length === 0 ? (
              <Typography color="text.secondary">Sin datos</Typography>
            ) : (
              rankingPorReservas.map((it, idx) => (
                <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center" py={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={`#${idx + 1}`} color="primary" variant="outlined" />
                    <Typography fontWeight={600}>{it.profesional?.username || 'Profesional'}</Typography>
                  </Stack>
                  <Typography color="text.secondary">{it.totalReservas} reservas</Typography>
                </Stack>
              ))
            )}
          </CardContent>
        </Card>
        <Card sx={{ flex: 1 }}>
          <CardHeader title="Top profesionales por ingresos" subheader={`Últimos ${periodMonths} meses`} />
          <CardContent>
            {rankingPorIngresos.length === 0 ? (
              <Typography color="text.secondary">Sin datos</Typography>
            ) : (
              rankingPorIngresos.map((it, idx) => (
                <Stack key={idx} direction="row" justifyContent="space-between" alignItems="center" py={1}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={`#${idx + 1}`} color="success" variant="outlined" />
                    <Typography fontWeight={600}>{it.profesional?.username || 'Profesional'}</Typography>
                  </Stack>
                  <Typography color="text.secondary">{formatMoney(it.ingresos)}</Typography>
                </Stack>
              ))
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Detalle por profesional */}
      <Card sx={{ mt: 2 }}>
        <CardHeader title="Detalle por profesional" subheader={`Desempeño individual - últimos ${periodMonths} meses`} />
        <CardContent>
          {metrics.items.length === 0 ? (
            <Typography color="text.secondary">No hay datos en el período seleccionado.</Typography>
          ) : (
            <Stack spacing={2}>
              {metrics.items.map((it, idx) => (
                <Box key={idx} sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
                    <Typography variant="h6" fontWeight={700}>{it.profesional?.username || 'Profesional'}</Typography>
                    <Stack direction="row" spacing={2}>
                      <Chip label={`Reservas: ${it.totalReservas}`} color="primary" variant="outlined" />
                      <Chip label={`Pac. únicos: ${it.pacientesUnicos}`} color="info" variant="outlined" />
                      <Chip label={`Ingresos: ${formatMoney(it.ingresos)}`} color="success" variant="outlined" />
                      <Chip label={`Ticket prom.: ${formatMoney(it.ticketPromedio)}`} color="default" variant="outlined" />
                    </Stack>
                  </Stack>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="subtitle2" gutterBottom>Top servicios</Typography>
                  {it.topServicios.length === 0 ? (
                    <Typography color="text.secondary">Sin servicios registrados</Typography>
                  ) : (
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      {it.topServicios.map((s, i) => (
                        <Chip key={i} label={`${s.name} (${s.count})`} size="small" />
                      ))}
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default ReportesEmpresa;
