import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  CircularProgress
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { confirmPaymentRequest, getPaymentStatusRequest } from '../api/payment';

const PaymentConfirmPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(true);
  const [result, setResult] = useState(null);

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
      const token = searchParams.get('token_ws');
      if (!token) {
        setResult({ success: false, message: 'Token inválido' });
        setLoading(false);
        return;
      }

      try {
        // Primer intento de commit/confirmación
        const res = await confirmPaymentRequest(token);

        // Si backend indica éxito, mostrar inmediatamente
        if (res.data?.success) {
          setResult(res.data);
          setLoading(false);
          setOpen(true);
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
              const retryRes = await confirmPaymentRequest(token);
              if (retryRes.data?.success) {
                setResult(retryRes.data);
                setLoading(false);
                setOpen(true);
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
            const retryRes = await confirmPaymentRequest(token);
            if (retryRes.data?.success) {
              setResult(retryRes.data);
              setLoading(false);
              setOpen(true);
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
      }
    };

    confirm();

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [searchParams]);

  const handleClose = () => {
    setOpen(false);
    // Redirect to home when modal is closed (fallback)
    navigate('/', { replace: true, state: { paymentResult: result } });
  };

  // When we have a final result and loading finished, redirect to home and pass the result
  useEffect(() => {
    if (!loading && result) {
      navigate('/', { state: { paymentResult: result } });
    }
  }, [loading, result, navigate]);

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {loading ? 'Confirmando pago...' : result?.success ? 'Pago Exitoso' : 'Pago Fallido'}
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" alignItems="center" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : result?.success ? (
          <Box textAlign="center">
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 64 }} />
            <Typography variant="body1" mt={2}>
              {result?.message || 'El pago fue procesado correctamente.'}
            </Typography>
            {result?.transaction && (
              <Box mt={2} textAlign="left">
                <Typography variant="subtitle2">Detalles:</Typography>
                <Typography variant="body2">Código autorización: {result.transaction.authorization_code}</Typography>
                <Typography variant="body2">Monto: ${result.transaction.amount?.toLocaleString()}</Typography>
                <Typography variant="body2">Fecha: {new Date(result.transaction.transaction_date).toLocaleString()}</Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box textAlign="center">
            <ErrorOutlineIcon color="error" sx={{ fontSize: 64 }} />
            <Typography variant="body1" mt={2}>
              {result?.message || 'Hubo un problema procesando el pago.'}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} variant="contained">
          Cerrar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaymentConfirmPage;
