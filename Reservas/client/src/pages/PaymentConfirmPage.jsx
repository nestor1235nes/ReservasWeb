import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress,
  IconButton,
  Stack,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CloseIcon from '@mui/icons-material/Close';
import { confirmPaymentRequest, getPaymentStatusRequest } from '../api/payment';
import { useSubscription } from '../context/subscriptionContext';

const PaymentConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loadCurrent: loadSubscriptionCurrent } = useSubscription();
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState(null);
  const confirmInFlightRef = useRef(false);

  const tokenWs = searchParams.get('token_ws');

  const isSubscriptionPayment = (data) => {
    // Para suscripción el backend retorna `scope` y `subscription`.
    // Para reservas retorna `reserva`.
    return !!data?.success && (!!data?.subscription || (data?.scope === 'USER' || data?.scope === 'SUCURSAL'));
  };

  useEffect(() => {
    let pollingInterval = null;
    let attempts = 0;
    const maxAttempts = 15; // ~30s

    const startPolling = async (reservaId) => {
      pollingInterval = setInterval(async () => {
        attempts += 1;
        try {
          const statusRes = await getPaymentStatusRequest(reservaId);
          const status = statusRes.data.paymentStatus;
          if (status === 'completed') {
            clearInterval(pollingInterval);
            setResult({ success: true, message: 'Pago confirmado (verificado)', transaction: statusRes.data.paymentData });
            setLoading(false);
            setOpen(true);
          } else if (status === 'failed') {
            clearInterval(pollingInterval);
            setResult({ success: false, message: 'Pago rechazado', transaction: statusRes.data.paymentData });
            setLoading(false);
            setOpen(true);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollingInterval);
            setResult({ success: false, message: 'Tiempo de espera agotado. Intente nuevamente más tarde.' });
            setLoading(false);
            setOpen(true);
          }
        } catch (err) {
          console.error('Polling error:', err);
          if (attempts >= maxAttempts) {
            clearInterval(pollingInterval);
            setResult({ success: false, message: 'No fue posible verificar el estado del pago.' });
            setLoading(false);
            setOpen(true);
          }
        }
      }, 2000);
    };

    const confirm = async () => {
      if (!tokenWs) {
        setResult({ success: false, message: 'Token inválido' });
        setLoading(false);
        return;
      }

      if (confirmInFlightRef.current) return;
      confirmInFlightRef.current = true;

      try {
        // Primer intento de commit/confirmación
        const res = await confirmPaymentRequest(tokenWs);

        // Si backend indica éxito, mostrar inmediatamente
        if (res.data?.success) {
          setResult(res.data);
          setLoading(false);
          setOpen(true);
          try { await loadSubscriptionCurrent(); } catch {}
          return;
        }

        // Si es fallo pero backend devolvió reserva, iniciamos polling por reservaId
        const reservaId = res.data?.reserva?._id;
        if (reservaId) {
          // Mantener modal abierto en modo carga mientras esperamos confirmación final
          setLoading(true);
          setOpen(true);
          startPolling(reservaId);
        } else {
          // No tenemos reserva para consultar -> mostrar fallo
          // Intentar un reintento corto antes de mostrar error
          let retry = 0;
          const maxRetry = 3;
          while (retry < maxRetry) {
            retry += 1;
            try {
              const retryRes = await confirmPaymentRequest(tokenWs);
              if (retryRes.data?.success) {
                setResult(retryRes.data);
                setLoading(false);
                setOpen(true);
                try { await loadSubscriptionCurrent(); } catch {}
                return;
              }
              const rId = retryRes.data?.reserva?._id;
              if (rId) {
                startPolling(rId);
                return;
              }
            } catch (e) {
              // continuar reintentos
            }
            await new Promise(r => setTimeout(r, 1000));
          }

          setResult({ success: false, message: res.data?.message || 'Pago rechazado' });
          setLoading(false);
          setOpen(true);
        }

      } catch (err) {
        // No mostrar fallo inmediato: si el backend incluye la reserva en la respuesta de error, iniciar polling
        const reservaId = err?.response?.data?.reserva?._id;
        if (reservaId) {
          setLoading(true);
          setOpen(true);
          startPolling(reservaId);
          return;
        }

        // Intentar pocos reintentos de confirmación antes de fallar
        let retry = 0;
        const maxRetry = 3;
        while (retry < maxRetry) {
          retry += 1;
          try {
            const retryRes = await confirmPaymentRequest(tokenWs);
            if (retryRes.data?.success) {
              setResult(retryRes.data);
              setLoading(false);
              setOpen(true);
              try { await loadSubscriptionCurrent(); } catch {}
              return;
            }
            const rId = retryRes.data?.reserva?._id;
            if (rId) {
              setLoading(true);
              setOpen(true);
              startPolling(rId);
              return;
            }
          } catch (e) {
            // espera antes del siguiente intento
            await new Promise(r => setTimeout(r, 1000));
          }
        }

        setResult({ success: false, message: err?.response?.data?.message || 'Error de red' });
        setLoading(false);
        setOpen(true);
      } finally {
        confirmInFlightRef.current = false;
      }
    };

    confirm();

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [tokenWs, loadSubscriptionCurrent]);

  const handleClose = () => {
    // Evitar que se cierre mientras está confirmando (consistencia con otros modales)
    if (loading) return;
    setOpen(false);
    // Redirect when modal is closed (volver al contexto previo si existe)
    let returnTo = null;
    try {
      returnTo = sessionStorage.getItem('webpay:returnTo');
      sessionStorage.removeItem('webpay:returnTo');
    } catch {
      // ignore
    }

    const target = isSubscriptionPayment(result)
      ? '/perfil'
      : (returnTo || '/');

    // No pasar paymentResult al destino para evitar doble-modal (HomePageNew/HomePage)
    navigate(target, { replace: true });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
        },
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #2596be 0%, #21cbe6 100%)',
          color: 'white',
          px: 3,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={800}>
            {loading ? 'Confirmando pago...' : result?.success ? 'Pago Exitoso' : 'Pago Fallido'}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {isSubscriptionPayment(result)
              ? 'Al finalizar te llevaremos a tu perfil.'
              : 'Al finalizar te llevaremos al inicio.'}
          </Typography>
        </Box>
        <IconButton onClick={handleClose} sx={{ color: 'white' }} disabled={loading}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 3, backgroundColor: '#f8fafc' }}>
        {loading ? (
          <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" color="text.secondary">
              Esto puede tardar unos segundos…
            </Typography>
          </Stack>
        ) : result?.success ? (
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 3,
              p: 3,
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 84,
                  height: 84,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, rgba(37, 150, 190, 0.12) 0%, rgba(33, 203, 230, 0.12) 100%)',
                }}
              >
                <CheckCircleOutlineIcon sx={{ fontSize: 56, color: '#2596be' }} />
              </Box>
              <Typography variant="body1" fontWeight={700} textAlign="center">
                {result?.message || 'El pago fue procesado correctamente.'}
              </Typography>

              {result?.transaction && (
                <Box sx={{ width: '100%', mt: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Detalles
                  </Typography>
                  <Typography variant="body2">
                    Código autorización: {result.transaction.authorization_code || '-'}
                  </Typography>
                  <Typography variant="body2">
                    Monto: {result.transaction.amount != null ? `$${Number(result.transaction.amount).toLocaleString('es-CL')}` : '-'}
                  </Typography>
                  <Typography variant="body2">
                    Fecha: {result.transaction.transaction_date ? new Date(result.transaction.transaction_date).toLocaleString() : '-'}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>
        ) : (
          <Box
            sx={{
              backgroundColor: 'white',
              borderRadius: 3,
              p: 3,
              border: '1px solid rgba(0,0,0,0.06)',
            }}
          >
            <Stack spacing={2} alignItems="center">
              <Box
                sx={{
                  width: 84,
                  height: 84,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(211, 47, 47, 0.10)',
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 56, color: '#d32f2f' }} />
              </Box>
              <Typography variant="body1" fontWeight={700} textAlign="center">
                {result?.message || 'Hubo un problema procesando el pago.'}
              </Typography>
            </Stack>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2, backgroundColor: '#f8fafc' }}>
        <Button
          onClick={handleClose}
          variant="contained"
          disabled={loading}
          sx={{
            textTransform: 'none',
            borderRadius: 999,
            px: 3,
            backgroundColor: '#2596be',
            '&:hover': { backgroundColor: '#1e7a9e' },
          }}
        >
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentConfirmPage;
