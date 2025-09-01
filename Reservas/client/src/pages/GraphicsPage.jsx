import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Paper,
  Chip,
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
import {
  PieChart,
  BarChart,
  LineChart,
  ScatterChart
} from '@mui/x-charts';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import EventNoteIcon from '@mui/icons-material/EventNote';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import { useReserva } from '../context/reservaContext';
import { usePaciente } from '../context/pacienteContext';
import { useAuth } from '../context/authContext';
import { useAnalytics } from '../context/analyticsContext';
import dayjs from 'dayjs';
import 'dayjs/locale/es';

dayjs.locale('es');

export default function GraphicsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { getEstadisticasGenerales, getEstadisticasPorPeriodo, getTendenciasMensuales } = useAnalytics();
  const { getPagosMensuales } = useAnalytics();
  const { user } = useAuth();
  
  const [estadisticas, setEstadisticas] = useState(null);
  const [tendencias, setTendencias] = useState([]);
  const [pagosMensuales, setPagosMensuales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('6months');

  useEffect(() => {
  loadData();
  loadPagos();
  }, [timeRange]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [estadisticasRes, tendenciasRes] = await Promise.all([
        getEstadisticasPorPeriodo(timeRange),
        getTendenciasMensuales()
      ]);
      setEstadisticas(estadisticasRes.data || {});
      setTendencias(tendenciasRes.data || []);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadPagos = async () => {
    try {
      const res = await getPagosMensuales();
      setPagosMensuales(res.data || []);
      console.log('Pagos mensuales cargados:', res.data);
    } catch (err) {
      console.error('Error cargando pagos mensuales', err);
    }
  };

  // Filtrar datos por rango de tiempo
  const filterByTimeRange = (data, dateField) => {
    // Ya no necesitamos esta función porque el backend maneja el filtrado
    return data;
  };

  // KPIs principales
  const getKPIs = () => {
    if (!estadisticas) return { totalReservas: 0, totalPacientes: 0, tasaAsistencia: 0, pacientesNuevos: 0 };
    
    return {
      totalReservas: estadisticas.totalReservas || 0,
      totalPacientes: estadisticas.totalPacientes || 0,
      tasaAsistencia: Math.round((estadisticas.totalAsistencias / (estadisticas.totalAsistencias + estadisticas.totalInasistencias)) * 100) || 0,
      pacientesNuevos: estadisticas.totalPacientes || 0 // Pacientes nuevos en el período seleccionado
    };
  };

  // Datos para gráfico de estado de pacientes
  const getEstadoPacientesData = () => {
    if (!estadisticas || !estadisticas.estadosPacientes) return [];
    
    return Object.entries(estadisticas.estadosPacientes).map(([estado, cantidad]) => ({
      id: estado,
      value: cantidad,
      label: estado
    }));
  };

  // Datos para gráfico de reservas por mes
  const getReservasPorMesData = () => {
    if (!tendencias || tendencias.length === 0) return [];
    
    return tendencias.map(item => ({
      mes: item.mes,
      cantidad: item.reservas
    }));
  };

  // Datos para gráfico de asistencia por comportamiento
  const getComportamientoPacientesData = () => {
    if (!estadisticas || !estadisticas.comportamientoPacientes) return [];
    
    return Object.entries(estadisticas.comportamientoPacientes).map(([tipo, cantidad]) => ({
      tipo: tipo.replace('Asistió y ', '').replace('No Asistió y ', 'No asistió, '),
      cantidad
    }));
  };

  // Datos para distribución por edad
  const getDistribucionEdadData = () => {
    if (!estadisticas || !estadisticas.distribucionEdad) return [];
    
    return Object.entries(estadisticas.distribucionEdad).map(([rango, cantidad]) => ({
      id: rango,
      value: cantidad,
      label: `${rango} años`
    }));
  };

  const kpis = getKPIs();
  const estadoPacientesData = getEstadoPacientesData();
  const reservasPorMesData = getReservasPorMesData();
  const pagosPorMesData = pagosMensuales.map(p => ({ mes: p.mes, amount: p.totalAmount }));
  const comportamientoData = getComportamientoPacientesData();
  const distribucionEdadData = getDistribucionEdadData();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header (same style as TodayPage) */}
      <Stack direction={isMobile ? "column" : "row"} justifyContent="space-between" alignItems={isMobile ? "stretch" : "center"} spacing={2} p={2} borderRadius={1} sx={{ background: "linear-gradient(45deg, #2596be 30%, #21cbe6 90%)" }}>
        <Typography variant="h5" fontWeight={700} color="white">
          Reportes y Analytics
        </Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Período</InputLabel>
          <Select
            value={timeRange}
            label="Período"
            sx={{ background: "white", borderRadius: 1 }}
            onChange={(e) => setTimeRange(e.target.value)}
          >
            <MenuItem value="1month">1 mes</MenuItem>
            <MenuItem value="3months">3 meses</MenuItem>
            <MenuItem value="6months">6 meses</MenuItem>
            <MenuItem value="1year">1 año</MenuItem>
          </Select>
        </FormControl>
      </Stack>
      <Box display="flex" justifyContent="flex-end" mt={2} mb={2}>
        
      </Box>

      {/* KPIs Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <EventNoteIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {kpis.totalReservas}
                  </Typography>
                  <Typography variant="body2">
                    Total Reservas
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <PeopleIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {kpis.totalPacientes}
                  </Typography>
                  <Typography variant="body2">
                    Total Pacientes
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <AssignmentTurnedInIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {kpis.tasaAsistencia}%
                  </Typography>
                  <Typography variant="body2">
                    Tasa Asistencia
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <TrendingUpIcon sx={{ fontSize: 40 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {kpis.pacientesNuevos}
                  </Typography>
                  <Typography variant="body2">
                    Nuevos Pacientes
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Estado de Pacientes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" mb={2} fontWeight="bold">
              Estado de Pacientes
            </Typography>
            {estadoPacientesData.length > 0 ? (
              <PieChart
                series={[
                  {
                    data: estadoPacientesData,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                  },
                ]}
                height={300}
              />
            ) : (
              <Typography color="text.secondary">No hay datos disponibles</Typography>
            )}
          </Paper>
        </Grid>

        {/* Distribución por Edad */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" mb={2} fontWeight="bold">
              Distribución por Edad
            </Typography>
            {distribucionEdadData.length > 0 ? (
              <PieChart
                series={[
                  {
                    data: distribucionEdadData,
                    highlightScope: { faded: 'global', highlighted: 'item' },
                  },
                ]}
                height={300}
              />
            ) : (
              <Typography color="text.secondary">No hay datos disponibles</Typography>
            )}
          </Paper>
        </Grid>

        {/* Reservas por Mes */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" mb={2} fontWeight="bold">
              Tendencia de Reservas por Mes
            </Typography>
            {reservasPorMesData.length > 0 ? (
              <LineChart
                xAxis={[{ 
                  scaleType: 'point', 
                  data: reservasPorMesData.map(d => d.mes),
                  labelStyle: { fontSize: 12 }
                }]}
                series={[
                  {
                    data: reservasPorMesData.map(d => d.cantidad),
                    label: 'Reservas',
                    color: theme.palette.primary.main,
                  },
                ]}
                height={300}
                margin={{ left: 50, right: 50, top: 50, bottom: 100 }}
              />
            ) : (
              <Typography color="text.secondary">No hay datos disponibles</Typography>
            )}
          </Paper>
        </Grid>

        {/* Comportamiento de Pacientes */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" mb={2} fontWeight="bold">
              Comportamiento de Asistencia
            </Typography>
            {comportamientoData.length > 0 ? (
              <BarChart
                xAxis={[{ 
                  scaleType: 'band', 
                  data: comportamientoData.map(d => d.tipo),
                  labelStyle: { fontSize: 10 }
                }]}
                series={[
                  {
                    data: comportamientoData.map(d => d.cantidad),
                    label: 'Cantidad',
                    color: theme.palette.secondary.main,
                  },
                ]}
                height={300}
                margin={{ left: 50, right: 50, top: 50, bottom: 120 }}
              />
            ) : (
              <Typography color="text.secondary">No hay datos disponibles</Typography>
            )}
          </Paper>
        </Grid>

        {/* Pagos por Mes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400 }}>
            <Typography variant="h6" mb={2} fontWeight="bold">
              Pagos procesados (últimos 12 meses)
            </Typography>
            {pagosPorMesData.length > 0 ? (
              <BarChart
                xAxis={[{ 
                  scaleType: 'band', 
                  data: pagosPorMesData.map(d => String(d.mes)),
                  labelStyle: { fontSize: 12 }
                }]}
                series={[
                  {
                    data: pagosPorMesData.map(d => d.amount),
                    label: 'Monto (CLP)',
                    color: theme.palette.success.main,
                  },
                ]}
                height={300}
                margin={{ left: 50, right: 50, top: 50, bottom: 100 }}
              />
            ) : (
              <Typography color="text.secondary">No hay datos de pagos disponibles</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}