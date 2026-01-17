import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { requestPatientOtp, verifyPatientOtp } from '../controllers/patientAuth.controller.js';

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/request-otp', otpLimiter, requestPatientOtp);
router.post('/verify-otp', otpLimiter, verifyPatientOtp);

export default router;
