import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import './config/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5432;

// Middlewares globales
app.use(cors());
app.use(express.json());

// Ruta de prueba
app.get('/', (_req, res) => {
  res.json({ message: '🏋️ Athlos API funcionando correctamente' });
});

// Arrancar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

export default app;
