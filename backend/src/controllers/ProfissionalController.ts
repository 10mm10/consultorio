import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class ProfissionalController {
  // GET /api/profissionais
  async listar(req: Request, res: Response) {
    try {
      const [rows]: any = await pool.query('SELECT * FROM profissionais ORDER BY nome ASC');
      return res.json(rows);
    } catch (error: any) {
      console.error('Erro ao listar profissionais:', error);
      return res.status(500).json({ error: 'Erro ao buscar profissionais.', details: error.message });
    }
  }

  // POST /api/profissionais
  async criar(req: Request, res: Response) {
    try {
      const { 
        nome, 
        tipo_pessoa, 
        cpf, 
        cnpj, 
        especialidade, 
        crm_crbm, 
        registro_profissional, 
        email, 
        telefone, 
        cep, 
        logradouro, 
        numero, 
        complemento, 
        bairro, 
        cidade, 
        estado, 
        ativo 
      } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'O nome do profissional é obrigatório.' });
      }

      const [result]: any = await pool.query(
        `INSERT INTO profissionais (
          nome, tipo_pessoa, cpf, cnpj, especialidade, 
          registro_profissional, email, telefone, 
          cep, logradouro, numero, complemento, bairro, cidade, estado, ativo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          nome, 
          tipo_pessoa || 'PF', 
          cpf || null, 
          cnpj || null, 
          especialidade || null, 
          crm_crbm || registro_profissional || null, 
          email || null, 
          telefone || null, 
          cep || null, 
          logradouro || null, 
          numero || null, 
          complemento || null, 
          bairro || null, 
          cidade || null, 
          estado || null, 
          ativo !== undefined ? ativo : 1
        ]
      );

      return res.status(201).json({
        message: 'Profissional cadastrado com sucesso!',
        profissionalId: result.insertId
      });
    } catch (error: any) {
      console.error('Erro ao cadastrar profissional:', error);
      return res.status(500).json({ 
        error: 'Erro ao cadastrar profissional no banco de dados.', 
        details: error.message 
      });
    }
  }

  // PUT /api/profissionais/:id
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { 
        nome, 
        tipo_pessoa, 
        cpf, 
        cnpj, 
        especialidade, 
        crm_crbm, 
        registro_profissional, 
        email, 
        telefone, 
        cep, 
        logradouro, 
        numero, 
        complemento, 
        bairro, 
        cidade, 
        estado, 
        ativo 
      } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'O nome do profissional é obrigatório.' });
      }

      await pool.query(
        `UPDATE profissionais SET 
          nome = ?, tipo_pessoa = ?, cpf = ?, cnpj = ?, especialidade = ?, 
          registro_profissional = ?, email = ?, telefone = ?, 
          cep = ?, logradouro = ?, numero = ?, complemento = ?, 
          bairro = ?, cidade = ?, estado = ?, ativo = ? 
        WHERE id = ?`,
        [
          nome, 
          tipo_pessoa || 'PF', 
          cpf || null, 
          cnpj || null, 
          especialidade || null, 
          crm_crbm || registro_profissional || null, 
          email || null, 
          telefone || null, 
          cep || null, 
          logradouro || null, 
          numero || null, 
          complemento || null, 
          bairro || null, 
          cidade || null, 
          estado || null, 
          ativo !== undefined ? ativo : 1,
          id
        ]
      );

      return res.json({ message: 'Profissional atualizado com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao atualizar profissional:', error);
      return res.status(500).json({ error: 'Erro ao atualizar profissional.', details: error.message });
    }
  }

  // DELETE /api/profissionais/:id
  async excluir(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await pool.query('DELETE FROM profissionais WHERE id = ?', [id]);

      return res.json({ message: 'Profissional excluído com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao excluir profissional:', error);
      return res.status(500).json({ error: 'Erro ao excluir profissional.', details: error.message });
    }
  }
}