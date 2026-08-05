import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class ProcedimentoController {
  // GET /api/procedimentos
  async listar(req: Request, res: Response) {
    try {
      const [rows]: any = await pool.query('SELECT * FROM procedimentos ORDER BY nome ASC');
      return res.json(rows);
    } catch (error: any) {
      console.error('Erro ao listar procedimentos:', error);
      return res.status(500).json({ error: 'Erro ao buscar procedimentos.', details: error.message });
    }
  }

  // PUT /api/procedimentos/:id
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nome, categoria, valor_padrao, valor } = req.body;

      const preco = valor_padrao !== undefined ? valor_padrao : (valor !== undefined ? valor : 0);

      // Removida a coluna 'ativo' da query
      await pool.query(
        'UPDATE procedimentos SET nome = ?, categoria = ?, valor_padrao = ? WHERE id = ?',
        [nome, categoria || null, preco, id]
      );

      return res.json({ message: 'Procedimento atualizado com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao atualizar procedimento:', error);
      return res.status(500).json({ error: 'Erro ao atualizar procedimento.', details: error.message });
    }
  }

  // DELETE /api/procedimentos/:id
  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM procedimentos WHERE id = ?', [id]);
      return res.json({ message: 'Procedimento excluído com sucesso' });
    } catch (error: any) {
      console.error('Erro ao excluir procedimento:', error);
      return res.status(500).json({ error: 'Erro ao excluir procedimento' });
    }
  }

  // POST /api/procedimentos
  async criar(req: Request, res: Response) {
    try {
      const { nome, categoria, valor_padrao, valor } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'O nome do procedimento é obrigatório.' });
      }

      const preco = valor_padrao !== undefined ? valor_padrao : (valor !== undefined ? valor : 0);

      const [result]: any = await pool.query(
        'INSERT INTO procedimentos (nome, categoria, valor_padrao) VALUES (?, ?, ?)',
        [nome, categoria || null, preco]
      );

      return res.status(201).json({
        message: 'Procedimento cadastrado com sucesso!',
        procedimentoId: result.insertId
      });
    } catch (error: any) {
      console.error('Erro ao cadastrar procedimento:', error);
      return res.status(500).json({
        error: 'Erro ao cadastrar procedimento no banco de dados.',
        details: error.message
      });
    }
  }
}