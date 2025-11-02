import rateLimit from 'express-rate-limit';

// Limita intentos fallidos de inicio de sesión por usuario (email) o IP
export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 3, // máximo de intentos fallidos en la ventana
  standardHeaders: true, // RateLimit-* headers
  legacyHeaders: false, // X-RateLimit-* headers
  skipSuccessfulRequests: true, // solo cuenta respuestas con código >= 400
  keyGenerator: (req, _res) => {
    const email = (req.body?.email || '').toString().toLowerCase().trim();
    return email || req.ip;
  },
  handler: (req, res, next, options) => {
    const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
    const retryAfterMinutes = Math.ceil(retryAfterSeconds / 60);
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(options.statusCode ?? 429).json({
      message: [
        `Demasiados intentos fallidos de inicio de sesión. Por favor, espera ${retryAfterMinutes} minutos antes de intentar nuevamente.`
      ],
      code: 'TOO_MANY_ATTEMPTS',
      retryAfterSeconds,
      retryAfterMinutes,
    });
  },
});
