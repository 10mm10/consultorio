import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class ClienteController {
  // GET /api/clientes (Listar todos ou buscar por nome/CPF/CNPJ/Razão Social)
  async listar(req: Request, res: Response) {
    try {
      const { busca } = req.query;

      let query = 'SELECT * FROM clientes';
      const params: any[] = [];

      if (busca) {
        query += ' WHERE nome LIKE ? OR cpf LIKE ? OR cnpj LIKE ? OR razao_social LIKE ? OR email LIKE ?';
        const termoBusca = `%${busca}%`;
        params.push(termoBusca, termoBusca, termoBusca, termoBusca, termoBusca);
      }

      query += ' ORDER BY id DESC';

      const [rows]: any = await pool.query(query, params);
      return res.json(rows);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      return res.status(500).json({ error: 'Erro ao buscar clientes.', details: error });
    }
  }

  // GET /api/clientes/:id (Buscar por ID)
  async obterPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const [rows]: any = await pool.query('SELECT * FROM clientes WHERE id = ?', [id]);

      if (rows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      return res.json(rows[0]);
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      return res.status(500).json({ error: 'Erro ao buscar cliente.', details: error });
    }
  }

  // POST /api/clientes (Cadastrar novo cliente)
  async criar(req: Request, res: Response) {
    try {
      const {
        tipo_pessoa,
        nome,
        razao_social,
        nome_fantasia,
        cpf,
        cnpj,
        rg,
        ie,
        im,
        email,
        telefone,
        cep,
        logradouro,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        estado
      } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'O nome / razão social do cliente é obrigatório.' });
      }

      // Garante tipo de pessoa correto
      const tipoPessoaFinal = tipo_pessoa || 'PF';

      // Validação de duplicidade CPF
      if (tipoPessoaFinal === 'PF' && cpf) {
        const [existenteCpf]: any = await pool.query('SELECT id FROM clientes WHERE cpf = ?', [cpf]);
        if (existenteCpf.length > 0) {
          return res.status(400).json({ error: 'Já existe um cliente cadastrado com este CPF.' });
        }
      }

      // Validação de duplicidade CNPJ
      if (tipoPessoaFinal === 'PJ' && cnpj) {
        const [existenteCnpj]: any = await pool.query('SELECT id FROM clientes WHERE cnpj = ?', [cnpj]);
        if (existenteCnpj.length > 0) {
          return res.status(400).json({ error: 'Já existe um cliente cadastrado com este CNPJ.' });
        }
      }

      // Trata logradouro/endereço para compatibilidade
      const logradouroFinal = logradouro || endereco || null;
      const ufFinal = estado || uf || null;

      const query = `
        INSERT INTO clientes (
          tipo_pessoa, nome, razao_social, nome_fantasia,
          cpf, cnpj, rg, ie, im,
          email, telefone, cep, logradouro, endereco,
          numero, complemento, bairro, cidade, uf, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        tipoPessoaFinal,
        nome,
        razao_social || nome,
        nome_fantasia || null,
        cpf || null,
        cnpj || null,
        rg || null,
        ie || null,
        im || null,
        email || null,
        telefone || null,
        cep || null,
        logradouroFinal,
        logradouroFinal,
        numero || null,
        complemento || null,
        bairro || null,
        cidade || null,
        ufFinal,
        ufFinal
      ];

      const [result]: any = await pool.query(query, values);

      return res.status(201).json({
        message: 'Cliente cadastrado com sucesso!',
        clienteId: result.insertId
      });
    } catch (error: any) {
      console.error('Erro ao criar cliente:', error);
      return res.status(500).json({ error: 'Erro ao cadastrar cliente.', details: error.message || error });
    }
  }

  // PUT /api/clientes/:id (Atualizar dados do cliente)
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const {
        tipo_pessoa,
        nome,
        razao_social,
        nome_fantasia,
        cpf,
        cnpj,
        rg,
        ie,
        im,
        email,
        telefone,
        cep,
        logradouro,
        endereco,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        estado
      } = req.body;

      if (!nome) {
        return res.status(400).json({ error: 'O nome do cliente é obrigatório.' });
      }

      const logradouroFinal = logradouro || endereco || null;
      const ufFinal = estado || uf || null;

      const query = `
        UPDATE clientes SET
          tipo_pessoa = ?,
          nome = ?,
          razao_social = ?,
          nome_fantasia = ?,
          cpf = ?,
          cnpj = ?,
          rg = ?,
          ie = ?,
          im = ?,
          email = ?,
          telefone = ?,
          cep = ?,
          logradouro = ?,
          endereco = ?,
          numero = ?,
          complemento = ?,
          bairro = ?,
          cidade = ?,
          uf = ?,
          estado = ?
        WHERE id = ?
      `;

      const values = [
        tipo_pessoa || 'PF',
        nome,
        razao_social || nome,
        nome_fantasia || null,
        cpf || null,
        cnpj || null,
        rg || null,
        ie || null,
        im || null,
        email || null,
        telefone || null,
        cep || null,
        logradouroFinal,
        logradouroFinal,
        numero || null,
        complemento || null,
        bairro || null,
        cidade || null,
        ufFinal,
        ufFinal,
        id
      ];

      await pool.query(query, values);

      return res.json({ message: 'Cliente atualizado com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao atualizar cliente:', error);
      return res.status(500).json({ error: 'Erro ao atualizar cliente.', details: error.message || error });
    }
  }

  // DELETE /api/clientes/:id (Excluir cliente)
  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM clientes WHERE id = ?', [id]);
      return res.json({ message: 'Cliente excluído com sucesso!' });
    } catch (error) {
      console.error('Erro ao excluir cliente:', error);
      return res.status(500).json({ error: 'Erro ao excluir cliente' });
    }
  }
}