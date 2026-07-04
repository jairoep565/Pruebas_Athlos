import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/db';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import chatRoutes from './routes/chat.routes';
import planRoutes from './routes/plan.routes';
import planAlimenticioRoutes from './routes/planAlimenticio.routes';
import { authMiddleware } from './middlewares/auth.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (_req, res) => {
  res.json({ message: '🏋️ Athlos API funcionando correctamente' });
});

// Rutas públicas (sin JWT)
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);

// Rutas privadas (con JWT)
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/plans', authMiddleware, planRoutes);
app.use('/api/plan-alimenticio', authMiddleware, planAlimenticioRoutes);

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
