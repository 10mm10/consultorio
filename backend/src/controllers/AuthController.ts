import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';

export class AuthController {
  // POST /api/register
  async register(req: Request, res: Response) {
    try {
      const { nome, email, senha, perfil } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Preencha os campos obrigatórios (nome, email, senha).' });
      }

      // Validação de perfil com base no ENUM do banco
      const perfisValidos = ['ADMIN', 'MEDICO', 'RECEPCAO'];
      const perfilFinal = perfil ? perfil.toUpperCase() : 'RECEPCAO';

      if (!perfisValidos.includes(perfilFinal)) {
        return res.status(400).json({ error: 'Perfil inválido. Use ADMIN, MEDICO ou RECEPCAO.' });
      }

      // Verifica e-mail duplicado
      const [existingUser]: any = await pool.query(
        'SELECT id FROM usuarios WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'E-mail já cadastrado.' });
      }

      // Criptografa a senha
      const hashedPassword = await bcrypt.hash(senha, 8);

      // Insere o usuário
      const [result]: any = await pool.query(
        'INSERT INTO usuarios (nome, email, senha, perfil) VALUES (?, ?, ?, ?)',
        [nome, email, hashedPassword, perfilFinal]
      );

      return res.status(201).json({
        message: 'Usuário cadastrado com sucesso!',
        userId: result.insertId
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno ao cadastrar usuário.', details: error });
    }
  }

  // POST /api/login
  async login(req: Request, res: Response) {
    try {
      // Mudamos de 'email' para 'identificador' (pode ser nome ou email)
      const { identificador, senha } = req.body;

      if (!identificador || !senha) {
        return res.status(400).json({ error: 'Informe o e-mail ou nome e a senha.' });
      }

      // Busca o usuário verificando se bate com email OU nome
      const [rows]: any = await pool.query(
        'SELECT * FROM usuarios WHERE email = ? OR nome = ?',
        [identificador, identificador]
      );

      if (rows.length === 0) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      const usuario = rows[0];

      const isValidPassword = await bcrypt.compare(senha, usuario.senha);

      if (!isValidPassword) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      // No login, inclua o must_change_password na resposta:
      const token = jwt.sign(
        { id: usuario.id, email: usuario.email, perfil: usuario.perfil },
        process.env.JWT_SECRET || 'chave_secreta_fallback',
        { expiresIn: '1d' }
      );

      return res.json({
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
          must_change_password: usuario.must_change_password // <-- Envia para o front saber
        },
        token
      });
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno ao realizar login.', details: error });
    }
  }
}