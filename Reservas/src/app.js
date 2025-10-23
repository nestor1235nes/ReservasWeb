import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
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

const app = express();

// Si corres detrás de proxy (Cloud Run) permite cookies seguras y IP correcta
app.set('trust proxy', 1);

// CORS: permitir lista de orígenes (frontend principal + localhost + posibles IPs locales)
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  // Producción Vercel
  'https://agendavitalink.vercel.app/',
  // Agrega dinámicamente la IP local si se despliega en red (acepta cualquier origen que empiece con http://192.168.)
];

app.use(
  cors({
    credentials: true,
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

// Redirección en desarrollo para /confirmacion/:token
if (process.env.NODE_ENV !== 'production') {
  app.get('/confirmacion/:token', (req, res) => {
    const frontend = FRONTEND_URL;
    return res.redirect(`${frontend}/confirmacion/${req.params.token}`);
  });
}

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