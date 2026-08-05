import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class DespesaController {
  
  // GET /api/despesas?mes=X&ano=Y&profissional_id=Z (Listar despesas gerais ou de um profissional)
  async listar(req: Request, res: Response) {
    try {
      const { mes, ano, profissional_id } = req.query;

      if (!mes || !ano) {
        return res.status(400).json({ error: 'Os parâmetros "mes" e "ano" são obrigatórios.' });
      }

      let query = `
        SELECT * FROM despesas 
        WHERE mes = ? AND ano = ? 
      `;
      const params: any[] = [mes, ano];

      // Se passar profissional_id, filtra por ele. Senão, traz apenas as do escritório (profissional_id IS NULL)
      if (profissional_id) {
        query += ` AND profissional_id = ? `;
        params.push(profissional_id);
      } else {
        query += ` AND profissional_id IS NULL `;
      }

      query += ` ORDER BY data DESC, id DESC `;

      const [rows]: any = await pool.query(query, params);
      return res.json(rows);
    } catch (error: any) {
      console.error('Erro ao buscar despesas:', error);
      return res.status(500).json({ error: 'Erro ao buscar despesas.', details: error.message || error });
    }
  }

  // POST /api/despesas (Cadastrar nova despesa - geral ou de profissional)
  async criar(req: Request, res: Response) {
    try {
      const { descricao, valor, data, mes, ano, profissional_id } = req.body;

      if (!descricao || !valor || !data || !mes || !ano) {
        return res.status(400).json({ error: 'Todos os campos obrigatórios da despesa devem ser preenchidos.' });
      }

      const query = `
        INSERT INTO despesas (descricao, valor, data, mes, ano, profissional_id) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      // Se profissional_id não vier, salva como NULL (despesa do escritório)
      const values = [descricao, valor, data, mes, ano, profissional_id || null];
      const [result]: any = await pool.query(query, values);

      return res.status(201).json({
        message: 'Despesa cadastrada com sucesso!',
        despesaId: result.insertId
      });
    } catch (error: any) {
      console.error('Erro ao cadastrar despesa:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar despesa.', details: error.message || error });
    }
  }

  // DELETE /api/despesas/:id (Excluir despesa)
  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const [result]: any = await pool.query('DELETE FROM despesas WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Despesa não encontrada.' });
      }

      return res.json({ message: 'Despesa excluída com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao excluir despesa:', error);
      return res.status(500).json({ error: 'Erro ao excluir despesa.', details: error.message || error });
    }
  }
}