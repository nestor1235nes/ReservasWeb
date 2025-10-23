import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Stack,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  useMediaQuery
} from '@mui/material';
import { PieChart, BarChart, LineChart } from '@mui/x-charts';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import { useAuth } from '../context/authContext';
import { useAnalytics } from '../context/analyticsContext';
import FullPageLoader from '../components/ui/FullPageLoader';

// Util: construir lista de meses entre fechaInicio y hoy
const buildMonthBuckets = (startDate) => {
  const buckets = [];
  const now = new Date();
  const d = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (d <= now) {
    const key = d.toISOString().substring(0, 7); // YYYY-MM
    const label = d.toLocaleDateString('es-CL', { month: 'short', year: 'numeric' });
    buckets.push({ key, label });
    d.setMonth(d.getMonth() + 1);
  }
  return buckets;
};

// Mapear selector a cantidad de meses
const rangeToMonths = (range) => ({
  '1month': 1,
  '3months': 3,
  '6months': 6,
  '1year': 12,
}[range] || 6);

export default function GraphicsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { user } = useAuth();
  const { getEstadisticasPorPeriodo, getPagosMensuales } = useAnalytics();

  const [periodStats, setPeriodStats] = useState(null); // respuesta de getEstadisticasPorPeriodo
  const [payments12m, setPayments12m] = useState([]); // últimos 12 meses
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('6months');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const [statsRes, pagosRes] = await Promise.all([
          getEstadisticasPorPeriodo(timeRange),
          getPagosMensuales(),
        ]);
        setPeriodStats(statsRes.data || null);
        setPayments12m(pagosRes.data || []);
      } catch (err) {
        console.error(err);
        setError('Error al cargar los datos de métricas');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [getEstadisticasPorPeriodo, getPagosMensuales, timeRange]);

  // Construir buckets para el período actual
  const monthBuckets = useMemo(() => {
    if (!periodStats?.fechaInicio) return [];
    const start = new Date(periodStats.fechaInicio);
    return buildMonthBuckets(start);
  }, [periodStats?.fechaInicio]);

  // Serie de reservas por mes (filtradas por período desde backend)
  const reservasPorMesData = useMemo(() => {
    if (!periodStats?.reservas || monthBuckets.length === 0) return [];
    const counts = Object.fromEntries(monthBuckets.map(b => [b.key, 0]));
    periodStats.reservas.forEach(r => {
      if (!r?.diaPrimeraCita) return;
      const d = new Date(r.diaPrimeraCita);
      const key = d.toISOString().substring(0, 7);
      if (counts[key] !== undefined) counts[key] += 1;
    });
    return monthBuckets.map(b => ({ mes: b.label, cantidad: counts[b.key] }));
  }, [periodStats?.reservas, monthBuckets]);

  // Filtrar pagos por el rango actual usando la cantidad de meses
  const pagosFiltrados = useMemo(() => {
    const n = rangeToMonths(timeRange);
    if (!payments12m || payments12m.length === 0) return [];
    const slice = payments12m.slice(-n);
    return slice.map(p => ({ mes: p.mes, amount: Number(p.totalAmount || 0), count: Number(p.count || 0) }));
  }, [payments12m, timeRange]);

  const ingresosPeriodo = useMemo(() => pagosFiltrados.reduce((acc, p) => acc + (p.amount || 0), 0), [pagosFiltrados]);
  const pagosCountPeriodo = useMemo(() => pagosFiltrados.reduce((acc, p) => acc + (p.count || 0), 0), [pagosFiltrados]);
  const ticketPromedio = pagosCountPeriodo > 0 ? Math.round(ingresosPeriodo / pagosCountPeriodo) : 0;

  // Pacientes atendidos (únicos en reservas del período)
  const pacientesAtendidos = useMemo(() => {
    if (!periodStats?.reservas) return 0;
    const set = new Set(periodStats.reservas.map(r => (r.paciente?._id || r.paciente || '').toString()));
    set.delete('');
    return set.size;
  }, [periodStats?.reservas]);

  // Pacientes nuevos en el período (el backend ya devuelve totalPacientes para el período)
  const pacientesNuevos = periodStats?.totalPacientes || 0;

  // Nuevos vs Recurrentes
  const nuevosVsRecurrentesData = useMemo(() => {
    const nuevos = pacientesNuevos;
    const recurrentes = Math.max(pacientesAtendidos - nuevos, 0);
    return [
      { id: 'Nuevos', value: nuevos, label: 'Nuevos' },
      { id: 'Recurrentes', value: recurrentes, label: 'Recurrentes' },
    ];
  }, [pacientesNuevos, pacientesAtendidos]);

  // Distribución por edad (viene del backend para el período)
  const distribucionEdadData = useMemo(() => {
    if (!periodStats?.distribucionEdad) return [];
    return Object.entries(periodStats.distribucionEdad).map(([rango, cantidad]) => ({ id: rango, value: cantidad, label: `${rango} años` }));
  }, [periodStats?.distribucionEdad]);

  // Modalidad (Presencial/Telemedicina/Ambas) a partir de reservas del período
  const modalidadData = useMemo(() => {
    if (!periodStats?.reservas) return [];
    const counts = {};
    periodStats.reservas.forEach(r => {
      const m = r.modalidad || 'Sin definir';
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts).map(([label, value]) => ({ id: label, value, label }));
  }, [periodStats?.reservas]);

  // Top servicios (conteo por servicio)
  const topServicios = useMemo(() => {
    if (!periodStats?.reservas) return [];
    const counts = {};
    periodStats.reservas.forEach(r => {
      const s = r.servicio || 'Sin servicio';
      counts[s] = (counts[s] || 0) + 1;
    });
    const arr = Object.entries(counts).map(([servicio, cantidad]) => ({ servicio, cantidad }));
    arr.sort((a, b) => b.cantidad - a.cantidad);
    return arr.slice(0, 8);
  }, [periodStats?.reservas]);

  // KPIs
  const kpis = useMemo(() => ({
    totalReservas: periodStats?.totalReservas || 0,
    pacientesAtendidos,
    pacientesNuevos,
    ingresosPeriodo,
    ticketPromedio,
  }), [periodStats?.totalReservas, pacientesAtendidos, pacientesNuevos, ingresosPeriodo, ticketPromedio]);

  if (loading) {
    return (
      <Box sx={{ p: { xs: 1.5, md: 3 }, position: 'relative', minHeight: 360 }}>
        <FullPageLoader open withinContainer message="Cargando métricas" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, position: 'relative' }}>
      <Stack direction={isMobile ? 'column' : 'row'} justifyContent="space-between" alignItems={isMobile ? 'stretch' : 'center'} spacing={2} p={2} borderRadius={1} sx={{ background: 'linear-gradient(45deg, #2596be 30%, #21cbe6 90%)' }}>
        <Typography variant="h5" fontWeight={700} color="white">
          Reportes y métricas
        </Typography>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Período</InputLabel>
          <Select value={timeRange} label="Período" sx={{ background: 'white', borderRadius: 1 }} onChange={(e) => setTimeRange(e.target.value)}>
            <MenuItem value="1month">1 mes</MenuItem>
            <MenuItem value="3months">3 meses</MenuItem>
            <MenuItem value="6months">6 meses</MenuItem>
            <MenuItem value="1year">1 año</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {/* KPIs principales */}
      <Grid container spacing={2} mb={3} mt={1}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <EventNoteIcon sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">{kpis.totalReservas}</Typography>
                  <Typography variant="body2">Reservas en el período</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <PeopleIcon sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">{kpis.pacientesAtendidos}</Typography>
                  <Typography variant="body2">Pacientes atendidos</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <TrendingUpIcon sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">{kpis.pacientesNuevos}</Typography>
                  <Typography variant="body2">Pacientes nuevos</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #ffd86f 0%, #fc6262 100%)', color: 'white' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <MonetizationOnIcon sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">${ingresosPeriodo.toLocaleString('es-CL')}</Typography>
                  <Typography variant="body2">Ingresos del período</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <MonetizationOnIcon sx={{ fontSize: 36 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">${ticketPromedio.toLocaleString('es-CL')}</Typography>
                  <Typography variant="body2">Ticket promedio</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Reservas por mes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 2, md: 3 }, height: { xs: 360, md: 380 } }}>
            <Typography variant="h6" mb={2} fontWeight="bold">Reservas por mes</Typography>
            {reservasPorMesData.length > 0 ? (
              <LineChart
                xAxis={[{ scaleType: 'point', data: reservasPorMesData.map(d => d.mes), labelStyle: { fontSize: 12 } }]}
                series={[{ data: reservasPorMesData.map(d => d.cantidad), label: 'Reservas', color: theme.palette.primary.main }]}
                height={isMobile ? 260 : 300}
                margin={{ left: 40, right: 30, top: 30, bottom: isMobile ? 60 : 80 }}
              />
            ) : (
              <Typography color="text.secondary">No hay datos disponibles</Typography>
            )}
          </Paper>
        </Grid>

        {/* Ingresos por mes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 2, md: 3 }, height: { xs: 360, md: 380 } }}>
            <Typography variant="h6" mb={2} fontWeight="bold">Ingresos por mes</Typography>
            {pagosFiltrados.length > 0 ? (
              <BarChart
                xAxis={[{ scaleType: 'band', data: pagosFiltrados.map(d => String(d.mes)), labelStyle: { fontSize: 12 } }]}
                series={[{ data: pagosFiltrados.map(d => d.amount), label: 'CLP', color: theme.palette.success.main }]}
                height={isMobile ? 260 : 300}
                margin={{ left: 40, right: 30, top: 30, bottom: isMobile ? 60 : 80 }}
              />
            ) : (
              <Typography color="text.secondary">No hay datos de pagos disponibles</Typography>
            )}
          </Paper>
        </Grid>

        {/* Modalidad de atención */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 2, md: 3 }, height: { xs: 360, md: 380 } }}>
            <Typography variant="h6" mb={2} fontWeight="bold">Modalidad de atención</Typography>
            {modalidadData.length > 0 ? (
              <PieChart
                series={[{ data: modalidadData, highlightScope: { faded: 'global', highlighted: 'item' } }]}
                height={isMobile ? 260 : 300}
              />
            ) : (
              <Typography color="text.secondary">No hay datos disponibles</Typography>
            )}
          </Paper>
        </Grid>

        {/* Distribución por edad */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: { xs: 2, md: 3 }, height: { xs: 360, md: 380 } }}>
            <Typography variant="h6" mb={2} fontWeight="bold">Distribución por edad</Typography>
            {distribucionEdadData.length > 0 ? (
              <PieChart
                series={[{ data: distribucionEdadData, highlightScope: { faded: 'global', highlighted: 'item' } }]}
                height={isMobile ? 260 : 300}
              />
            ) : (
              <Typography color="text.secondary">No hay datos disponibles</Typography>
            )}
          </Paper>
        </Grid>

        {/* Top servicios */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: { xs: 2, md: 3 }, height: { xs: 380, md: 420 }, overflowX: 'auto' }}>
            <Typography variant="h6" mb={2} fontWeight="bold">Servicios más solicitados</Typography>
            {topServicios.length > 0 ? (
              <BarChart
                xAxis={[{ scaleType: 'band', data: topServicios.map(d => d.servicio), labelStyle: { fontSize: 12 } }]}
                series={[{ data: topServicios.map(d => d.cantidad), label: 'Reservas', color: theme.palette.info.main }]}
                height={isMobile ? 280 : 320}
                margin={{ left: 40, right: 30, top: 30, bottom: isMobile ? 80 : 100 }}
              />
            ) : (
              <Typography color="text.secondary">No hay datos disponibles</Typography>
            )}
          </Paper>
        </Grid>

        {/* Nuevos vs Recurrentes */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: { xs: 2, md: 3 }, height: { xs: 380, md: 420 } }}>
            <Typography variant="h6" mb={2} fontWeight="bold">Nuevos vs Recurrentes</Typography>
            {nuevosVsRecurrentesData.reduce((s, x) => s + x.value, 0) > 0 ? (
              <PieChart
                series={[{ data: nuevosVsRecurrentesData, highlightScope: { faded: 'global', highlighted: 'item' } }]}
                height={isMobile ? 300 : 340}
              />
            ) : (
              <Typography color="text.secondary">No hay datos disponibles</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}