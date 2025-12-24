import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import reservaRoutes from './routes/reserva.routes.js';
import fichaRoutes from './routes/ficha.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import funcionRoutes from './routes/funciones.routes.js';
import deletePerfilRoutes from './routes/deletePerfil.routes.js';
import sucursalRoutes from './routes/sucursal.routes.js';
import calendarSyncRoutes from './routes/calendarSync.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import transbankRoutes from './routes/transbank.routes.js';
import dailyRoutes from './routes/daily.routes.js';
import confirmationRoutes from './routes/confirmation.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import subscriptionRoutes from './routes/subscription.routes.js'; 

const app = express();

// Ocultar cabecera X-Powered-By
app.disable('x-powered-by');

// Si corres detrás de proxy (Cloud Run) permite cookies seguras y IP correcta
app.set('trust proxy', 1);

// Helmet: cabeceras de seguridad por defecto (sin CSP aquí porque lo maneja Vercel para el frontend)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false, // evitar romper librerías que no estén listas para COEP
  })
);
// Política de Referer estricta
app.use(helmet.referrerPolicy({ policy: 'no-referrer' }));

// CORS: permitir lista de orígenes (frontend principal + localhost + posibles IPs locales)
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  // Producción Vercel
  'https://agendavitalink.vercel.app',
  // Agrega dinámicamente la IP local si se despliega en red (acepta cualquier origen que empiece con http://192.168.)
];

app.use(
  cors({
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // mobile apps webview a veces no mandan origin
      if (allowedOrigins.includes(origin) || /http:\/\/192\.168\./.test(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS not allowed for origin ' + origin));
    },
  })
);

app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

// Nota: COOP/COEP puede bloquear carga de recursos desde otros orígenes (especialmente en Safari/iOS).
// Habilítalo solo si realmente requieres SharedArrayBuffer, etc. Por ahora lo desactivamos para evitar problemas en móvil.
// Si requieres COOP/COEP, asegúrate de servir TODOS los recursos como cross-origin isolated.

// Health endpoint
app.get('/healthz', (_req, res) => res.json({ status: 'ok' }));

// Endpoint para reports de CSP (enviado por el frontend en modo Report-Only)
app.post('/api/csp-report', express.json({ type: ['json', 'application/csp-report'] }), (req, res) => {
  // Registrar de forma mínima; en producción enviar a logs/monitoring
  console.warn('CSP report:', JSON.stringify(req.body));
  res.status(204).end();
});

// Límite de tasa general para API (protege de scraping/abuso en endpoints no sensibles)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // hasta 1000 req por IP en la ventana
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// Rutas API
app.use('/api/auth', authRoutes);
app.use('/api/', reservaRoutes);
app.use('/api/', fichaRoutes);
app.use('/api/', uploadRoutes);
app.use('/api/', funcionRoutes);
app.use('/api/', deletePerfilRoutes);
app.use('/api', sucursalRoutes);
app.use('/api/calendarsync', calendarSyncRoutes);
app.use('/api/', analyticsRoutes);
app.use('/api/transbank', transbankRoutes);
app.use('/api/daily', dailyRoutes);
app.use('/api/', confirmationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/subscription', subscriptionRoutes);

// Archivos estáticos de uploads
// Asegurar que existan las carpetas de subida
try {
  if (!fs.existsSync('uploads')) fs.mkdirSync('uploads', { recursive: true });
  if (!fs.existsSync('imagenesPacientes')) fs.mkdirSync('imagenesPacientes', { recursive: true });
} catch (e) {
  console.warn('No se pudo crear carpeta de uploads/imagenesPacientes:', e?.message || e);
}

app.use('/uploads', express.static('uploads'));
app.use('/imagenesPacientes', express.static('imagenesPacientes'));

// Redirección universal para /confirmacion/:token hacia el frontend
app.get('/confirmacion/:token', (req, res) => {
  const frontend = FRONTEND_URL;
  return res.redirect(`${frontend}/confirmacion/${req.params.token}`);
});

// Servir frontend solo si existe un build
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../client/dist');

if (fs.existsSync(frontendDir)) {
  app.use(express.static(frontendDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
  });
} else {
  // Si no hay frontend, responde algo útil en raíz
  app.get('/', (_req, res) => {
    res.json({ ok: true, service: 'Reservas API', env: process.env.NODE_ENV || 'development' });
  });
}

export default app;