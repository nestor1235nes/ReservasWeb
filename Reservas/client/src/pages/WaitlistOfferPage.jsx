import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Stack,
  Paper,
  Divider,
  Alert,
  LinearProgress
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import PersonIcon from '@mui/icons-material/Person';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { resolveOfferTokenRequest, acceptOfferRequest, rejectOfferRequest } from '../api/waitlist';
import dayjs from 'dayjs';

export default function WaitlistOfferPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [offerData, setOfferData] = useState(null);
  const [result, setResult] = useState(null); // 'accepted' | 'rejected' | 'expired'
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Cargar datos de la oferta
  useEffect(() => {
    const fetchOffer = async () => {
      try {
        const res = await resolveOfferTokenRequest(token);
        setOfferData(res.data);
        setTimeRemaining(res.data.timeRemaining || 0);
        setLoading(false);
      } catch (err) {
        const status = err?.response?.status;
        if (status === 410) {
          setError(err?.response?.data?.message || 'Esta oferta ya no está disponible o ha expirado.');
          setResult('expired');
        } else if (status === 404) {
          setError('Token inválido. Verifica el enlace que recibiste.');
        } else {
          setError('Error al cargar la información. Intenta nuevamente.');
        }
        setLoading(false);
      }
    };
    fetchOffer();
  }, [token]);

  // Contador regresivo
  useEffect(() => {
    if (!offerData || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setResult('expired');
          setError('El tiempo para aceptar esta hora ha expirado.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [offerData, timeRemaining]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    return dayjs(fecha).format('DD/MM/YYYY');
  };

  const handleAccept = async () => {
    setProcessing(true);
    setError('');
    try {
      await acceptOfferRequest(token);
      setResult('accepted');
    } catch (err) {
      if (err?.response?.status === 410) {
        setResult('expired');
        setError('El tiempo para aceptar esta hora ha expirado.');
      } else {
        setError(err?.response?.data?.message || 'Error al aceptar la hora. Intenta nuevamente.');
      }
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    setProcessing(true);
    setError('');
    try {
      await rejectOfferRequest(token);
      setResult('rejected');
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al rechazar la oferta. Intenta nuevamente.');
    }
    setProcessing(false);
  };

  // Estado de carga inicial
  if (loading) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
      }}>
        <Card sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress size={48} sx={{ color: '#2596be' }} />
          <Typography mt={2}>Cargando información...</Typography>
        </Card>
      </Box>
    );
  }

  // Resultado de la acción
  if (result) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        p: 2
      }}>
        <Card sx={{ maxWidth: 450, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            {result === 'accepted' && (
              <>
                <CheckCircleIcon sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
                <Typography variant="h5" fontWeight={700} color="#4caf50" gutterBottom>
                  ¡Hora Aceptada!
                </Typography>
                <Typography color="text.secondary" mb={3}>
                  Tu cita ha sido movida a la nueva hora. Recibirás un recordatorio por WhatsApp.
                </Typography>
                {offerData?.horaOfertada && (
                  <Paper elevation={1} sx={{ p: 2, background: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="subtitle2" fontWeight={600}>Tu nueva cita:</Typography>
                    <Typography>
                      {formatFecha(offerData.horaOfertada.fecha)} a las {offerData.horaOfertada.hora}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Con {offerData.profesional?.nombre}
                    </Typography>
                  </Paper>
                )}
              </>
            )}
            {result === 'rejected' && (
              <>
                <SwapHorizIcon sx={{ fontSize: 80, color: '#ff9800', mb: 2 }} />
                <Typography variant="h5" fontWeight={700} color="#ff9800" gutterBottom>
                  Hora Rechazada
                </Typography>
                <Typography color="text.secondary" mb={2}>
                  Has rechazado esta hora. Seguirás en la lista de espera para futuras oportunidades.
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Te notificaremos si se libera otra hora.
                </Typography>
              </>
            )}
            {result === 'expired' && (
              <>
                <CancelIcon sx={{ fontSize: 80, color: '#f44336', mb: 2 }} />
                <Typography variant="h5" fontWeight={700} color="#f44336" gutterBottom>
                  Oferta Expirada
                </Typography>
                <Typography color="text.secondary" mb={2}>
                  {error || 'El tiempo para aceptar esta hora ha expirado.'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  La hora será ofrecida al siguiente paciente en la lista.
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Error sin datos
  if (error && !offerData) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        p: 2
      }}>
        <Card sx={{ maxWidth: 450, width: '100%', textAlign: 'center' }}>
          <CardContent sx={{ p: 4 }}>
            <CancelIcon sx={{ fontSize: 80, color: '#f44336', mb: 2 }} />
            <Typography variant="h5" fontWeight={700} color="#f44336" gutterBottom>
              Error
            </Typography>
            <Typography color="text.secondary">
              {error}
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Mostrar oferta
  return (
    <Box sx={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      p: 2
    }}>
      <Card sx={{ maxWidth: 500, width: '100%' }}>
        <Box sx={{ 
          background: 'linear-gradient(90deg, #f9a825 0%, #ffc107 100%)', 
          p: 2,
          color: 'white'
        }}>
          <Typography variant="h6" fontWeight={700} textAlign="center">
            🎉 ¡Se ha liberado una hora!
          </Typography>
        </Box>

        <CardContent sx={{ p: 3 }}>
          {/* Contador */}
          <Paper elevation={0} sx={{ 
            p: 2, 
            mb: 3, 
            background: timeRemaining < 300 ? '#ffebee' : '#fff3e0',
            borderRadius: 2,
            textAlign: 'center'
          }}>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
              <AccessTimeIcon sx={{ color: timeRemaining < 300 ? '#f44336' : '#ff9800' }} />
              <Typography fontWeight={600} color={timeRemaining < 300 ? '#f44336' : '#ff9800'}>
                Tiempo restante: {formatTime(timeRemaining)}
              </Typography>
            </Stack>
            <LinearProgress 
              variant="determinate" 
              value={(timeRemaining / (20 * 60)) * 100}
              sx={{ 
                mt: 1, 
                height: 8, 
                borderRadius: 4,
                backgroundColor: '#ffecb3',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: timeRemaining < 300 ? '#f44336' : '#ff9800'
                }
              }}
            />
          </Paper>

          {/* Saludo */}
          <Typography variant="body1" mb={3}>
            Hola <strong>{offerData?.paciente?.nombre}</strong>, tienes la oportunidad de tomar 
            una hora que se ha liberado.
          </Typography>

          {/* Hora ofertada */}
          <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2, background: '#e8f5e9' }}>
            <Typography variant="subtitle2" fontWeight={600} color="#2e7d32" mb={1}>
              Hora Disponible
            </Typography>
            <Stack spacing={1}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarMonthIcon fontSize="small" sx={{ color: '#2e7d32' }} />
                <Typography>{formatFecha(offerData?.horaOfertada?.fecha)}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AccessTimeIcon fontSize="small" sx={{ color: '#2e7d32' }} />
                <Typography>{offerData?.horaOfertada?.hora}</Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <PersonIcon fontSize="small" sx={{ color: '#2e7d32' }} />
                <Typography>{offerData?.profesional?.nombre}</Typography>
              </Stack>
              {offerData?.horaOfertada?.servicio && (
                <Stack direction="row" alignItems="center" spacing={1}>
                  <LocalHospitalIcon fontSize="small" sx={{ color: '#2e7d32' }} />
                  <Typography variant="body2">{offerData.horaOfertada.servicio}</Typography>
                </Stack>
              )}
            </Stack>
          </Paper>

          {/* Cita actual (si existe) */}
          {offerData?.reservaActual && (
            <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2, background: '#fff3e0' }}>
              <Typography variant="subtitle2" fontWeight={600} color="#e65100" mb={1}>
                Tu cita actual (se moverá a la nueva hora)
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CalendarMonthIcon fontSize="small" sx={{ color: '#e65100' }} />
                <Typography variant="body2">
                  {formatFecha(offerData.reservaActual.fecha)} a las {offerData.reservaActual.hora}
                </Typography>
              </Stack>
            </Paper>
          )}

          <Divider sx={{ my: 2 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* Botones de acción */}
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              disabled={processing}
              onClick={handleAccept}
              startIcon={processing ? <CircularProgress size={20} color="inherit" /> : <CheckCircleIcon />}
              sx={{ py: 1.5 }}
            >
              {processing ? 'Procesando...' : 'Aceptar Hora'}
            </Button>
            <Button
              variant="outlined"
              color="warning"
              fullWidth
              size="large"
              disabled={processing}
              onClick={handleReject}
              sx={{ py: 1.5 }}
            >
              Rechazar
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" display="block" textAlign="center" mt={2}>
            Si rechazas, seguirás en la lista de espera para futuras oportunidades.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
