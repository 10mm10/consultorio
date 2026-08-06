import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class DespesaController {
  
  // GET /api/despesas?mes=X&ano=Y&profissional_id=Z
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

      if (profissional_id) {
        query += ` AND profissional_id = ? `;
        params.push(profissional_id);
      } else {
        query += ` AND profissional_id IS NULL `;
      }

      query += ` ORDER BY data DESC, id DESC `;

      const [despesas]: any = await pool.query(query, params);

      // Buscar os totais de atendimentos do período para calcular as despesas dinâmicas em tempo real
      let queryAtendimentos = `
        SELECT forma_pagamento, SUM(valor) as total_bruto 
        FROM atendimentos 
        WHERE MONTH(data) = ? AND YEAR(data) = ?
      `;
      const paramsAtendimentos: any[] = [mes, ano];

      if (profissional_id) {
        queryAtendimentos += ` AND profissional_id = ? `;
        paramsAtendimentos.push(profissional_id);
      }

      queryAtendimentos += ` GROUP BY forma_pagamento `;

      const [atendimentos]: any = await pool.query(queryAtendimentos, paramsAtendimentos);

      // Mapear totais por forma de pagamento (ex: 'CREDITO', 'DEBITO', 'PIX', 'DINHEIRO')
      const totaisPorForma: { [key: string]: number } = {};
      let totalGeralBruto = 0;

      atendimentos.forEach((att: any) => {
        const forma = att.forma_pagamento ? att.forma_pagamento.toUpperCase().trim() : '';
        const valorBruto = Number(att.total_bruto) || 0;
        totaisPorForma[forma] = valorBruto;
        totalGeralBruto += valorBruto;
      });

      // Recalcular o valor das despesas que possuem percentual dinâmico
      const despesasCalculadas = despesas.map((despesa: any) => {
        if (despesa.tipo_base && despesa.tipo_base !== 'FIXO' && despesa.percentual > 0) {
          let baseCalculo = 0;
          const tipo = despesa.tipo_base.toUpperCase();

          if (tipo === 'TOTAL') {
            baseCalculo = totalGeralBruto;
          } else {
            baseCalculo = totaisPorForma[tipo] || 0;
          }

          // Calcula o novo valor baseado na porcentagem atualizada dos atendimentos
          const valorDinamico = (baseCalculo * Number(despesa.percentual)) / 100;
          return {
            ...despesa,
            valor: Number(valorDinamico.toFixed(2))
          };
        }
        return despesa;
      });

      return res.json(despesasCalculadas);
    } catch (error: any) {
      console.error('Erro ao buscar despesas:', error);
      return res.status(500).json({ error: 'Erro ao buscar despesas.', details: error.message || error });
    }
  }

  // POST /api/despesas (Cadastrar nova despesa)
  async criar(req: Request, res: Response) {
    try {
      const { descricao, valor, data, mes, ano, profissional_id, percentual, tipo_base } = req.body;

      if (!descricao || data === undefined || !mes || !ano) {
        return res.status(400).json({ error: 'Os campos obrigatórios da despesa devem ser preenchidos.' });
      }

      const query = `
        INSERT INTO despesas (descricao, valor, data, mes, ano, profissional_id, percentual, tipo_base) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const valorFinal = valor !== undefined ? valor : 0;
      const percFinal = percentual !== undefined ? percentual : 0.00;
      const baseFinal = tipo_base || 'FIXO';

      const values = [
        descricao, 
        valorFinal, 
        data, 
        mes, 
        ano, 
        profissional_id || null, 
        percFinal, 
        baseFinal
      ];

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

  // PUT /api/despesas/:id (Atualizar despesa)
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { descricao, valor, data, mes, ano, profissional_id, percentual, tipo_base } = req.body;

      if (!descricao || valor === undefined) {
        return res.status(400).json({ error: 'Descrição e valor são obrigatórios.' });
      }

      const query = `
        UPDATE despesas 
        SET descricao = ?, valor = ?, data = COALESCE(?, data), mes = COALESCE(?, mes), ano = COALESCE(?, ano), profissional_id = ?, percentual = ?, tipo_base = ?
        WHERE id = ?
      `;

      const percFinal = percentual !== undefined ? percentual : 0.00;
      const baseFinal = tipo_base || 'FIXO';

      const [result]: any = await pool.query(query, [
        descricao, 
        valor, 
        data || null, 
        mes || null, 
        ano || null, 
        profissional_id || null, 
        percFinal, 
        baseFinal, 
        id
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Despesa não encontrada.' });
      }

      return res.json({ message: 'Despesa atualizada com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao atualizar despesa:', error);
      return res.status(500).json({ error: 'Erro ao atualizar despesa.', details: error.message || error });
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