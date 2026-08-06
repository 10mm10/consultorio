import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class DespesaController {
  
  // GET /api/despesas?mes=X&ano=Y&profissional_id=Z
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

      const totaisPorForma: { [key: string]: number } = {};
      let totalGeralBruto = 0;

      // Função auxiliar para remover acentos e padronizar textos (ex: "Crédito" -> "CREDITO")
      const normalizarTexto = (texto: string) => {
        return texto
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toUpperCase()
          .trim();
      };

      atendimentos.forEach((att: any) => {
        const forma = att.forma_pagamento ? normalizarTexto(att.forma_pagamento) : '';
        const valorBruto = Number(att.total_bruto) || 0;
        totaisPorForma[forma] = (totaisPorForma[forma] || 0) + valorBruto;
        totalGeralBruto += valorBruto;
      });

      const despesasCalculadas = despesas.map((despesa: any) => {
        const tipo = despesa.tipo_base ? normalizarTexto(despesa.tipo_base) : 'FIXO';
        const perc = Number(despesa.percentual || 0);

        if (tipo !== 'FIXO' && perc > 0) {
          let baseCalculo = 0;

          if (tipo === 'TOTAL') {
            baseCalculo = totalGeralBruto;
          } else {
            baseCalculo = totaisPorForma[tipo] || 0;
          }

          const valorDinamico = (baseCalculo * perc) / 100;
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

  async criar(req: Request, res: Response) {
  try {
    const { descricao, valor, data, mes, ano, profissional_id, percentual, tipo_base } = req.body;

    // Remove qualquer validação de texto na descrição! 
    // O tipo_base vem direto do input que o usuário preencheu na tela.
    const percFinal = percentual !== undefined ? Number(percentual) : 0.00;
    const baseFinal = tipo_base ? tipo_base.toUpperCase() : 'FIXO';

    const query = `
      INSERT INTO despesas (descricao, valor, data, mes, ano, profissional_id, percentual, tipo_base) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      descricao, 
      valor !== undefined ? Number(valor) : 0, 
      data, 
      mes, 
      ano, 
      profissional_id || null, 
      percFinal, 
      baseFinal // <--- Salva exatamente o que veio do front-end (CREDITO, DEBITO, PIX, TOTAL ou FIXO)
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

  async atualizar(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { descricao, valor, data, mes, ano, profissional_id, percentual, tipo_base } = req.body;

    const percFinal = percentual !== undefined ? Number(percentual) : 0.00;
    const baseFinal = tipo_base ? tipo_base.toUpperCase() : 'FIXO';

    const query = `
      UPDATE despesas 
      SET 
        descricao = ?, 
        valor = ?, 
        data = COALESCE(?, data), 
        mes = COALESCE(?, mes), 
        ano = COALESCE(?, ano), 
        profissional_id = COALESCE(?, profissional_id), 
        percentual = ?, 
        tipo_base = ?
      WHERE id = ?
    `;

    const [result]: any = await pool.query(query, [
      descricao, 
      valor !== undefined ? Number(valor) : 0, 
      data || null, 
      mes || null, 
      ano || null, 
      profissional_id || null, 
      percFinal, 
      baseFinal, // <--- Atualiza com o tipo exato vindo do input do modal
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