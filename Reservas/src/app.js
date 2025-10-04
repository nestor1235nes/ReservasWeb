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

const app = express();

// Si corres detrás de proxy (Cloud Run) permite cookies seguras y IP correcta
app.set('trust proxy', 1);

// CORS: usa FRONTEND_URL si existe, fallback a localhost
const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
app.use(
  cors({
    credentials: true,
    origin: FRONTEND_URL,
  })
);

app.use(express.json());
app.use(morgan('dev'));
app.use(cookieParser());

// COOP/COEP si lo necesitas (p.ej., SharedArrayBuffer); mantenido como en tu código
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

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

// Archivos estáticos de uploads
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