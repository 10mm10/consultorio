import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class AtendimentoController {

  // GET /api/atendimentos
  async listar(req: Request, res: Response) {
    try {
      const { situacao, data } = req.query;

      let query = `
        SELECT 
          a.id,
          a.data_atendimento,
          a.valor_total,
          a.porcentagem_exec,
          a.valor_exec,
          a.porcentagem_venda,
          a.valor_venda,
          a.valor_consultorio,
          a.situacao,
          a.documento,
          a.observacao,
          a.cliente_id,
          a.prof_venda_id,
          a.prof_exec_id,
          c.nome AS cliente_nome,
          pv.nome AS prof_venda_nome,
          pe.nome AS prof_exec_nome
        FROM atendimentos a
        INNER JOIN clientes c ON a.cliente_id = c.id
        LEFT JOIN profissionais pv ON a.prof_venda_id = pv.id
        LEFT JOIN profissionais pe ON a.prof_exec_id = pe.id
      `;

      const queryParams: any[] = [];
      const conditions: string[] = [];

      // Se a situação foi informada
      if (situacao) {
        conditions.push(`a.situacao = ?`);
        queryParams.push(situacao);
      }

      // Se a data foi informada (compara apenas a parte da data no formato YYYY-MM-DD)
      if (data) {
        conditions.push(`DATE(a.data_atendimento) = ?`);
        queryParams.push(data);
      }

      // Se houver condições, adiciona o WHERE na query
      if (conditions.length > 0) {
        query += ` WHERE ` + conditions.join(' AND ');
      }

      query += ` ORDER BY a.data_atendimento DESC`;

      const [rows]: any = await pool.query(query, queryParams);

      // Busca os itens e pagamentos com ordenação de parcelas
      for (const atendimento of rows) {
        const [itens]: any = await pool.query(
          `SELECT ai.*, COALESCE(ai.nome_item, p.nome, 'Procedimento') AS nome 
           FROM atendimento_itens ai 
           LEFT JOIN procedimentos p ON ai.item_id = p.id 
           WHERE ai.atendimento_id = ?`,
          [atendimento.id]
        );

        const [pagamentos]: any = await pool.query(
          `SELECT * FROM atendimento_pagamentos 
           WHERE atendimento_id = ? 
           ORDER BY parcela_numero ASC`,
          [atendimento.id]
        );

        atendimento.itens = itens;
        atendimento.pagamentos = pagamentos;
      }

      return res.json(rows);
    } catch (error: any) {
      console.error('Erro ao listar atendimentos:', error);
      return res.status(500).json({ error: 'Erro ao buscar atendimentos.', details: error.message });
    }
  }

  // POST /api/atendimentos
  async criar(req: Request, res: Response) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const {
        cliente_id,
        prof_venda_id,
        porcentagem_venda,
        valor_venda,
        prof_exec_id,
        porcentagem_exec,
        valor_exec,
        valor_consultorio,
        situacao,
        documento,
        observacao,
        itens,      // Array de { tipo, item_id, quantidade, valor_unitario }
        pagamentos  // Array de { forma_pagamento, valor, parcela_numero, data_vencimento, status }
      } = req.body;

      if (!cliente_id || !prof_exec_id) {
        return res.status(400).json({ error: 'Cliente e Profissional Executante são obrigatórios.' });
      }

      // 1. Calcula Valor Total dos Itens
      let valorTotal = 0;
      if (itens && itens.length > 0) {
        valorTotal = itens.reduce((acc: number, item: any) => {
          return acc + (Number(item.quantidade || 1) * Number(item.valor_unitario || 0));
        }, 0);
      }

      // Fallback de cálculos de retentativa caso a UI não os envie
      const pctExec = Number(porcentagem_exec || 0);
      const valExec = valor_exec !== undefined ? Number(valor_exec) : Number(((valorTotal * pctExec) / 100).toFixed(2));

      const pctVenda = Number(porcentagem_venda || 0);
      const valVenda = valor_venda !== undefined ? Number(valor_venda) : Number(((valorTotal * pctVenda) / 100).toFixed(2));

      const valConsultorio = valor_consultorio !== undefined 
        ? Number(valor_consultorio) 
        : Number((valorTotal - (valExec + valVenda)).toFixed(2));

      // 2. Insere Cabeçalho do Atendimento
      const [resAtendimento]: any = await connection.query(
        `INSERT INTO atendimentos 
          (cliente_id, prof_venda_id, porcentagem_venda, valor_venda, 
           prof_exec_id, porcentagem_exec, valor_exec, valor_consultorio, 
           valor_total, situacao, documento, observacao) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cliente_id,
          prof_venda_id || null,
          pctVenda,
          valVenda,
          prof_exec_id,
          pctExec,
          valExec,
          valConsultorio,
          valorTotal,
          situacao || 'PENDENTE',
          documento || 'CAIXA',
          observacao || null
        ]
      );

      const atendimentoId = resAtendimento.insertId;

      // 3. Insere os Itens
      if (itens && itens.length > 0) {
        for (const item of itens) {
          const itemQtd = Number(item.quantidade || 1);
          const itemValorUnit = Number(item.valor_unitario || 0);
          const itemValorTotal = itemQtd * itemValorUnit;
          const nomeItem = item.nome || item.nome_procedimento || 'Procedimento'; 

          await connection.query(
            `INSERT INTO atendimento_itens 
              (atendimento_id, tipo, item_id, nome_item, quantidade, valor_unitario, valor_total) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [atendimentoId, item.tipo || 'PROCEDIMENTO', item.item_id, nomeItem, itemQtd, itemValorUnit, itemValorTotal]
          );
        }
      }

      // 4. Insere os Pagamentos Detalhados
      if (pagamentos && pagamentos.length > 0) {
        for (const pgto of pagamentos) {
          const parcelaNum = Number(pgto.parcela_numero || 1);
          const dataVenc = pgto.data_vencimento || new Date().toISOString().split('T')[0];
          const st = pgto.status || 'PAGO';

          await connection.query(
            `INSERT INTO atendimento_pagamentos 
              (atendimento_id, forma_pagamento, valor, parcela_numero, data_vencimento, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [atendimentoId, pgto.forma_pagamento, Number(pgto.valor), parcelaNum, dataVenc, st]
          );
        }
      }

      await connection.commit();

      return res.status(201).json({
        message: 'Atendimento registrado com sucesso!',
        atendimentoId
      });
    } catch (error: any) {
      await connection.rollback();
      console.error('Erro ao registrar atendimento:', error);
      return res.status(500).json({ error: 'Erro ao registrar atendimento.', details: error.message });
    } finally {
      connection.release();
    }
  }

  // PUT /api/atendimentos/:id
  async atualizar(req: Request, res: Response) {
    const { id } = req.params;
    const connection = await pool.getConnection();

    try {
      // 0. TRAVA DE SEGURANÇA: Verifica se o atendimento já foi FINALIZADO
      const [atendAtual]: any = await connection.query(
        `SELECT situacao FROM atendimentos WHERE id = ?`,
        [id]
      );

      if (atendAtual.length === 0) {
        connection.release();
        return res.status(404).json({ error: 'Atendimento não encontrado.' });
      }

      const isAdmin = req.body.user_role === 'ADMIN';

      if (atendAtual[0].situacao === 'FINALIZADO' && !isAdmin) {
        connection.release();
        return res.status(403).json({ error: 'Este atendimento já foi finalizado. Não é permitido alterá-lo.' });
      }

      await connection.beginTransaction();

      const {
        cliente_id,
        prof_venda_id,
        porcentagem_venda,
        valor_venda,
        prof_exec_id,
        porcentagem_exec,
        valor_exec,
        valor_consultorio,
        situacao,
        documento,
        observacao,
        itens,
        pagamentos
      } = req.body;

      if (!cliente_id || !prof_exec_id) {
        await connection.rollback();
        return res.status(400).json({ error: 'Cliente e Profissional Executante são obrigatórios.' });
      }

      // 1. Recalcula Valor Total
      let valorTotal = 0;
      if (itens && itens.length > 0) {
        valorTotal = itens.reduce((acc: number, item: any) => {
          return acc + (Number(item.quantidade || 1) * Number(item.valor_unitario || 0));
        }, 0);
      }

      const pctExec = Number(porcentagem_exec || 0);
      const valExec = valor_exec !== undefined ? Number(valor_exec) : Number(((valorTotal * pctExec) / 100).toFixed(2));

      const pctVenda = Number(porcentagem_venda || 0);
      const valVenda = valor_venda !== undefined ? Number(valor_venda) : Number(((valorTotal * pctVenda) / 100).toFixed(2));

      const valConsultorio = valor_consultorio !== undefined 
        ? Number(valor_consultorio) 
        : Number((valorTotal - (valExec + valVenda)).toFixed(2));

      // 2. Atualiza Cabeçalho do Atendimento
      await connection.query(
        `UPDATE atendimentos 
         SET cliente_id = ?, 
             prof_venda_id = ?, 
             porcentagem_venda = ?,
             valor_venda = ?,
             prof_exec_id = ?, 
             porcentagem_exec = ?,
             valor_exec = ?,
             valor_consultorio = ?,
             valor_total = ?, 
             situacao = ?, 
             documento = ?, 
             observacao = ?
         WHERE id = ?`,
        [
          cliente_id,
          prof_venda_id || null,
          pctVenda,
          valVenda,
          prof_exec_id,
          pctExec,
          valExec,
          valConsultorio,
          valorTotal,
          situacao || 'PENDENTE',
          documento || 'CAIXA',
          observacao || null,
          id
        ]
      );

      // 3. Substitui Itens
      await connection.query(`DELETE FROM atendimento_itens WHERE atendimento_id = ?`, [id]);

      if (itens && itens.length > 0) {
        for (const item of itens) {
          const itemQtd = Number(item.quantidade || 1);
          const itemValorUnit = Number(item.valor_unitario || 0);
          const itemValorTotal = itemQtd * itemValorUnit;
          const nomeItem = item.nome || item.nome_procedimento || 'Procedimento';

          await connection.query(
            `INSERT INTO atendimento_itens 
             (atendimento_id, tipo, item_id, nome_item, quantidade, valor_unitario, valor_total) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, item.tipo || 'PROCEDIMENTO', item.item_id, nomeItem, itemQtd, itemValorUnit, itemValorTotal]
          );
        }
      }

      // 4. Substitui Pagamentos
      await connection.query(`DELETE FROM atendimento_pagamentos WHERE atendimento_id = ?`, [id]);

      if (pagamentos && pagamentos.length > 0) {
        for (const pgto of pagamentos) {
          const parcelaNum = Number(pgto.parcela_numero || 1);
          const dataVenc = pgto.data_vencimento || new Date().toISOString().split('T')[0];
          const st = pgto.status || 'PAGO';

          await connection.query(
            `INSERT INTO atendimento_pagamentos 
             (atendimento_id, forma_pagamento, valor, parcela_numero, data_vencimento, status) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, pgto.forma_pagamento, Number(pgto.valor), parcelaNum, dataVenc, st]
          );
        }
      }

      await connection.commit();

      return res.json({ message: 'Atendimento atualizado com sucesso!' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Erro ao atualizar atendimento:', error);
      return res.status(500).json({ error: 'Erro ao atualizar atendimento.', details: error.message });
    } finally {
      connection.release();
    }
  }

  // DELETE /api/atendimentos/:id
  async excluir(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID do atendimento não informado.' });
    }

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      await connection.query(`DELETE FROM atendimento_itens WHERE atendimento_id = ?`, [id]);
      await connection.query(`DELETE FROM atendimento_pagamentos WHERE atendimento_id = ?`, [id]);

      const [result]: any = await connection.query(`DELETE FROM atendimentos WHERE id = ?`, [id]);

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Atendimento não encontrado no banco de dados.' });
      }

      await connection.commit();
      return res.json({ message: 'Atendimento excluído com sucesso!' });
    } catch (error: any) {
      await connection.rollback();
      console.error('Erro ao excluir atendimento:', error);
      return res.status(500).json({ error: 'Cliente ja finalizado, não é possivel excluir.', details: error.message });
    } finally {
      connection.release();
    }
  }
}