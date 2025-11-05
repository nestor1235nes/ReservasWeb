import { Router } from 'express';
import { createTransaction, createTransactionPublic, confirmTransaction, getPaymentStatus } from '../controllers/payment.controller.js';

const router = Router();

router.post('/create', createTransaction);
// Público: inicia pago sin crear entidades; se crearán al confirmar
router.post('/create-public', createTransactionPublic);
router.post('/confirm', confirmTransaction);
// Hacer pública la consulta de estado para permitir a los pacientes (no autenticados) verificar su pago
router.get('/status/:reservaId', getPaymentStatus);

export default router;