import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import reservaRoutes from './routes/reserva.routes.js';
import fichaRoutes from './routes/ficha.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import funcionRoutes from './routes/funciones.routes.js';
import deletePerfilRoutes from './routes/deletePerfil.routes.js';

const app = express();

//console.log(process.env.FRONTEND_URL);
app.use(
  cors({
    credentials: true,
    origin: 'http://localhost:5173', // process.env.FRONTEND_URL,
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/", reservaRoutes);
app.use("/api/", fichaRoutes);
app.use("/api/", uploadRoutes);
app.use("/api/", funcionRoutes);
app.use("/api/", deletePerfilRoutes);
app.use('/uploads', express.static('uploads'))

if (process.env.NODE_ENV === "production") {
  const path = await import("path");
  app.use(express.static("client/dist"));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve("client", "dist", "index.html"));
  });
}

export default app;