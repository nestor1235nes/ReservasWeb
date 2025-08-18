import { Router } from 'express';
import { createTransaction, confirmTransaction, getPaymentStatus } from '../controllers/payment.controller.js';
import { auth } from "../middlewares/auth.middleware.js";

const router = Router();

router.post('/create', createTransaction);
router.post('/confirm', confirmTransaction);
router.get('/status/:reservaId', auth, getPaymentStatus);

export default router;