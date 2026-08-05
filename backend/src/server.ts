import express from 'express';
import cors from 'cors';
import { pool } from './config/database.js';
import { router } from './routes/index.js';

const app = express();

// Lista de origens permitidas (Seu frontend na Vercel + localhost para desenvolvimento)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL || '' // URL de produção da Vercel que você colocará no .env da AWS
].filter(Boolean); // Remove strings vazias caso a variável não esteja definida

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origem (como aplicativos mobile, Postman ou curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pelas políticas de CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Rota de Health Check
app.get('/health', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 + 1 AS result');
    res.json({ status: 'OK', message: 'Conectado ao MySQL com sucesso!', rows });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', error });
  }
});

// Agrupa todas as rotas com o prefixo /api
app.use('/api', router);

const PORT = process.env.PORT || 3006;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});