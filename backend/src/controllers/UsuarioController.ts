import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/database.js';

export class UsuarioController {
  // GET /api/usuarios
  async listar(req: Request, res: Response) {
    try {
      const [rows]: any = await pool.query(
        'SELECT id, nome, email, perfil, must_change_password FROM usuarios ORDER BY nome ASC'
      );
      return res.json(rows);
    } catch (error: any) {
      console.error('Erro ao listar usuários:', error);
      return res.status(500).json({ error: 'Erro ao listar usuários.', details: error.message });
    }
  }

  // POST /api/usuarios (Caso queira cadastrar direto pelas configurações)
  async criar(req: Request, res: Response) {
    try {
      const { nome, email, senha, perfil } = req.body;

      if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Preencha os campos obrigatórios (nome, email, senha).' });
      }

      const perfisValidos = ['ADMIN', 'MEDICO', 'RECEPCAO'];
      
      // 💡 CORREÇÃO AQUI: Se o perfil vier vazio ou nulo, define 'RECEPCAO' como padrão
      const perfilFinal = perfil ? String(perfil).trim().toUpperCase() : 'RECEPCAO';

      if (!perfisValidos.includes(perfilFinal)) {
        return res.status(400).json({ error: 'Perfil inválido. Use ADMIN, MEDICO ou RECEPCAO.' });
        console.log('Perfil:', perfilFinal);
      }

      const [existingUser]: any = await pool.query('SELECT id FROM usuarios WHERE email = ?', [email]);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'E-mail já cadastrado.' });
      }

      const hashedPassword = await bcrypt.hash(senha, 8);

      const [result]: any = await pool.query(
        'INSERT INTO usuarios (nome, email, senha, perfil, must_change_password) VALUES (?, ?, ?, ?, FALSE)',
        [nome, email, hashedPassword, perfilFinal]
      );

      return res.status(201).json({
        message: 'Usuário cadastrado com sucesso!',
        userId: result.insertId
      });
    } catch (error: any) {
      console.error('Erro ao cadastrar usuário:', error);
      return res.status(500).json({ error: 'Erro interno ao cadastrar usuário.', details: error.message });
    }
  }

  // PUT /api/usuarios/:id (Atualizar dados ou redefinir senha provisória)
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome, email, perfil, novaSenha } = req.body;

      if (!nome || !email) {
        return res.status(400).json({ error: 'Nome e e-mail são obrigatórios.' });
      }

      const perfisValidos = ['ADMIN', 'MEDICO', 'RECEPCAO'];
      const perfilFinal = perfil ? perfil.toUpperCase() : 'RECEPCAO';

      if (!perfisValidos.includes(perfilFinal)) {
        return res.status(400).json({ error: 'Perfil inválido. Use ADMIN, MEDICO ou RECEPCAO.' });
      }

      // Se foi informada uma nova senha (provisória), criptografa e define must_change_password como TRUE
      if (novaSenha) {
        const hashedPassword = await bcrypt.hash(novaSenha, 8);
        await pool.query(
          'UPDATE usuarios SET nome = ?, email = ?, perfil = ?, senha = ?, must_change_password = TRUE WHERE id = ?',
          [nome, email, perfilFinal, hashedPassword, id]
        );
      } else {
        await pool.query(
          'UPDATE usuarios SET nome = ?, email = ?, perfil = ? WHERE id = ?',
          [nome, email, perfilFinal, id]
        );
      }

      return res.json({ message: 'Usuário atualizado com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      return res.status(500).json({ error: 'Erro ao atualizar usuário.', details: error.message });
    }
  }

  // DELETE /api/usuarios/:id (Excluir usuário)
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await pool.query('DELETE FROM usuarios WHERE id = ?', [id]);

      return res.json({ message: 'Usuário excluído com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao excluir usuário:', error);
      return res.status(500).json({ error: 'Erro ao excluir usuário.', details: error.message });
    }
  }

  // Alterar senha no primeiro acesso obrigatório
  async alterarSenhaPrimeiroAcesso(req: Request, res: Response) {
    try {
      const { usuarioId, novaSenha } = req.body;

      // Validação dos requisitos de segurança
      const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
      if (!regex.test(novaSenha)) {
        return res.status(400).json({ 
          error: 'A senha deve ter no mínimo 8 caracteres, contendo pelo menos uma letra maiúscula e um símbolo.' 
        });
      }

      const salt = await bcrypt.genSalt(8);
      const hashedPassword = await bcrypt.hash(novaSenha, salt);

      await pool.query(
        'UPDATE usuarios SET senha = ?, must_change_password = FALSE WHERE id = ?',
        [hashedPassword, usuarioId]
      );

      return res.json({ message: 'Senha alterada com sucesso!' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao alterar senha.', details: error.message });
    }
  }
}