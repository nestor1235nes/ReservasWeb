import React, { useState } from 'react';
import { 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  Typography,
  CircularProgress,
  Alert,
  Box,
  TextField
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import { createPaymentRequest } from '../api/payment';
import { useAlert } from '../context/AlertContext'; 

const PaymentButton = ({ reserva, amount = 50000, onPaymentSuccess }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState(amount);
  const showAlert = useAlert();

  const handlePayment = async () => {
    try {
      setLoading(true);
      
      const response = await createPaymentRequest(
        reserva._id, 
        customAmount, 
        reserva.paciente.rut
      );

      // Redirigir a Webpay
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = response.data.url;
      
      const tokenInput = document.createElement('input');
      tokenInput.type = 'hidden';
      tokenInput.name = 'token_ws';
      tokenInput.value = response.data.token;
      
      form.appendChild(tokenInput);
      document.body.appendChild(form);
      form.submit();
      
    } catch (error) {
      console.error('Error al iniciar pago:', error);
      showAlert('error', 'Error al procesar el pago');
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<PaymentIcon />}
        onClick={() => setOpen(true)}
        sx={{
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
          color: 'white'
        }}
      >
        Pagar Consulta
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Pago de Consulta Médica
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body1" gutterBottom>
              <strong>Paciente:</strong> {reserva.paciente.nombre}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>RUT:</strong> {reserva.paciente.rut}
            </Typography>
            <Typography variant="body1" gutterBottom>
              <strong>Fecha:</strong> {new Date(reserva.siguienteCita).toLocaleDateString()}
            </Typography>
          </Box>
          
          <TextField
            label="Monto a pagar (CLP)"
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(Number(e.target.value))}
            fullWidth
            variant="outlined"
            sx={{ mb: 2 }}
            inputProps={{ min: 1000, max: 1000000 }}
          />

          <Alert severity="info" sx={{ mb: 2 }}>
            Será redirigido a Webpay para completar el pago de forma segura.
          </Alert>
        </DialogContent>
        
        <DialogActions>
          <Button 
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handlePayment}
            variant="contained"
            disabled={loading || customAmount < 1000}
            startIcon={loading ? <CircularProgress size={20} /> : <PaymentIcon />}
          >
            {loading ? 'Procesando...' : `Pagar $${customAmount.toLocaleString()}`}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentButton;