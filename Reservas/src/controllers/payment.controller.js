import pkg from 'transbank-sdk';
const { WebpayPlus, Options, Environment } = pkg;
import Reserva from '../models/ficha.model.js';
import Paciente from '../models/paciente.model.js';

// Opciones de integración
const webpayOptions = new Options(
  process.env.WEBPAY_COMMERCE_CODE || '597055555532',
  process.env.WEBPAY_API_KEY || '579B532A7440BB0C9079DED94D31EA1615BACEB56610332264630D42D0A36B1C',
  Environment.Integration // Usa Environment.Production para producción
);

// Crear transacción
export const createTransaction = async (req, res) => {
  try {
    const { reservaId, amount, patientRut } = req.body;

    const reserva = await Reserva.findById(reservaId).populate('paciente');
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    const shortReservaId = String(reservaId).slice(-10); // últimos 10 caracteres
    const shortTimestamp = String(Date.now()).slice(-8); // últimos 8 dígitos
    const buyOrder = `R${shortReservaId}${shortTimestamp}`.slice(0, 26);
    const sessionId = `${patientRut}-${Date.now()}`;
  // El frontend de React se ejecuta por defecto en el puerto 5173 (Vite).
  // Asegúrate de definir FRONTEND_URL en .env si usas otro puerto.
  const frontendUrl = process.env.FRONTEND_URL?.trim() || 'http://localhost:5173';
    const returnUrl = `${frontendUrl}/payment/confirm`;

    // Depuración: revisar valores antes de llamar al SDK
    console.log('Creating Webpay transaction with:', {
      buyOrder,
      sessionId,
      amount,
      returnUrl,
      environment: webpayOptions?.environment
    });

    // Ahora se pasan las opciones aquí
    const response = await new WebpayPlus.Transaction(webpayOptions).create(
      buyOrder,
      sessionId,
      amount,
      returnUrl
    );

    // Guardar estado pendiente (no registrar en paymentHistory hasta confirmación)
    await Reserva.findByIdAndUpdate(reservaId, {
      $set: {
        paymentStatus: 'pending',
        paymentToken: response.token,
        paymentAmount: amount,
        buyOrder: buyOrder
      }
    });

    res.json({
      token: response.token,
      url: response.url
    });

  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({ message: 'Error al crear la transacción' });
  }
};

// Confirmar transacción
export const confirmTransaction = async (req, res) => {
  try {
    const { token_ws } = req.body;

    if (!token_ws) {
      return res.status(400).json({ message: 'Token requerido' });
    }

    // Ahora se pasan las opciones aquí
    const response = await new WebpayPlus.Transaction(webpayOptions).commit(token_ws);

    const reserva = await Reserva.findOne({ paymentToken: token_ws }).populate('paciente');
    
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    if (response.response_code === 0) {
      // Actualizar reserva: pago completado y añadir al historial
  const updatedReserva = await Reserva.findByIdAndUpdate(reserva._id, {
        $set: {
          paymentStatus: 'completed',
          paymentData: {
            authorizationCode: response.authorization_code,
            responseCode: response.response_code,
            transactionDate: response.transaction_date,
            accountingDate: response.accounting_date,
            paymentTypeCode: response.payment_type_code,
            amount: response.amount,
            cardNumber: response.card_detail?.card_number
          }
        },
        $push: {
          paymentHistory: {
            status: 'completed',
            amount: response.amount || reserva.paymentAmount || 0,
            transactionId: response.authorization_code || response.transaction_id || token_ws,
            notes: 'Pago exitoso'
          }
        }
      }, { new: true });

      res.json({
        success: true,
        message: 'Pago procesado exitosamente',
        transaction: response,
        reserva: updatedReserva
      });
    } else {
      // Actualizar reserva: pago fallido (no registrar en paymentHistory)
      const updatedReserva = await Reserva.findByIdAndUpdate(reserva._id, {
        $set: {
          paymentStatus: 'failed',
          paymentData: response
        }
      }, { new: true });

      res.json({
        success: false,
        message: 'Pago rechazado',
        transaction: response,
        reserva: updatedReserva
      });
    }

  } catch (error) {
    console.error('Error confirming transaction:', error);
    res.status(500).json({ message: 'Error al confirmar la transacción' });
  }
};

// Obtener estado de pago (sin cambios)
export const getPaymentStatus = async (req, res) => {
  try {
    const { reservaId } = req.params;
    
    const reserva = await Reserva.findById(reservaId);
    if (!reserva) {
      return res.status(404).json({ message: 'Reserva no encontrada' });
    }

    res.json({
      paymentStatus: reserva.paymentStatus || 'not_initiated',
      paymentData: reserva.paymentData
    });

  } catch (error) {
    console.error('Error getting payment status:', error);
    res.status(500).json({ message: 'Error al obtener estado del pago' });
  }
};