import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class RelatorioController {

  // POST /api/relatorios/despesas (ou a rota que salva a despesa do profissional)
  async criarDespesaProfissional(req: Request, res: Response) {
    try {
      const { descricao, valor, data, mes, ano, profissional_id } = req.body;

      if (!descricao || !valor || !mes || !ano || !profissional_id) {
        return res.status(400).json({ error: 'Todos os campos, incluindo o profissional_id, são obrigatórios.' });
      }

      const query = `
        INSERT INTO despesas (descricao, valor, data, mes, ano, profissional_id) 
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      const dataDespesa = data || new Date().toISOString().split('T')[0];
      const values = [descricao, valor, dataDespesa, mes, ano, profissional_id];
      
      const [result]: any = await pool.query(query, values);

      return res.status(201).json({
        message: 'Despesa do profissional salva com sucesso!',
        id: result.insertId
      });
    } catch (error: any) {
      console.error('Erro ao salvar despesa do profissional:', error);
      return res.status(500).json({ error: 'Erro ao salvar despesa.', details: error.message || error });
    }
  }

  // PUT /api/relatorios/despesas/:id (Editar despesa do profissional)
  async atualizarDespesaProfissional(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { descricao, valor, data } = req.body;

      if (!descricao || !valor) {
        return res.status(400).json({ error: 'Descrição e valor são obrigatórios.' });
      }

      const query = `
        UPDATE despesas 
        SET descricao = ?, valor = ?, data = COALESCE(?, data)
        WHERE id = ?
      `;

      const [result]: any = await pool.query(query, [descricao, valor, data || null, id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Despesa não encontrada.' });
      }

      return res.json({ message: 'Despesa atualizada com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao atualizar despesa:', error);
      return res.status(500).json({ error: 'Erro ao atualizar despesa.', details: error.message || error });
    }
  }

  // DELETE /api/relatorios/despesas/:id (Excluir despesa do profissional)
  async deletarDespesaProfissional(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const [result]: any = await pool.query('DELETE FROM despesas WHERE id = ?', [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Despesa não encontrada.' });
      }

      return res.json({ message: 'Despesa excluída com sucesso!' });
    } catch (error: any) {
      console.error('Erro ao excluir despesa do profissional:', error);
      return res.status(500).json({ error: 'Erro ao excluir despesa.', details: error.message || error });
    }
  }

  // GET /api/relatorios/cliente?cliente_id=X&mes=Y&ano=Z
  async obterRelatorioCliente(req: Request, res: Response) {
    try {
      const { cliente_id, mes, ano } = req.query;

      if (!cliente_id) {
        return res.status(400).json({ error: 'O parâmetro "cliente_id" é obrigatório.' });
      }

      let queryAtendimentos = `
        SELECT 
          id,
          data_atendimento,
          valor_total,
          situacao,
          documento,
          observacao
        FROM atendimentos 
        WHERE cliente_id = ? 
          AND situacao = 'FINALIZADO'
      `;

      const queryParams: any[] = [cliente_id];

      if (mes && ano) {
        queryAtendimentos += ` AND MONTH(data_atendimento) = ? AND YEAR(data_atendimento) = ?`;
        queryParams.push(mes, ano);
      }

      queryAtendimentos += ` ORDER BY data_atendimento DESC`;

      const [rows]: any = await pool.query(queryAtendimentos, queryParams);

      let valorTotalBruto = 0;
      const atendimentosCompletos = [];

      for (const atend of rows) {
        const valor = Number(atend.valor_total || 0);
        valorTotalBruto += valor;

        const [itens]: any = await pool.query(
          `SELECT ai.quantidade, ai.valor_unitario, ai.valor_total, p.nome 
            FROM atendimento_itens ai 
            LEFT JOIN procedimentos p ON ai.item_id = p.id 
            WHERE ai.atendimento_id = ?`,
          [atend.id]
        );

        atendimentosCompletos.push({
          id: atend.id,
          data_atendimento: atend.data_atendimento,
          situacao: atend.situacao,
          valor_total: valor,
          documento: atend.documento,
          observacao: atend.observacao,
          itens: itens
        });
      }

      return res.json({
        total_atendimentos: atendimentosCompletos.length,
        valor_total_bruto: valorTotalBruto,
        atendimentos: atendimentosCompletos
      });

    } catch (error: any) {
      console.error('Erro ao gerar relatório geral do cliente:', error);
      return res.status(500).json({ error: 'Erro ao gerar relatório do cliente.', details: error.message || error });
    }
  }

  // GET /api/relatorios/profissional?profissional_id=X&mes=Y&ano=Z (ou historico_geral=true)
  async obterRelatorioProfissional(req: Request, res: Response) {
    try {
      const { profissional_id, mes, ano, historico_geral } = req.query;

      if (!profissional_id) {
        return res.status(400).json({ error: 'O parâmetro "profissional_id" é obrigatório.' });
      }

      // 1. Monta a query de atendimentos permitindo histórico geral ou filtro por mês/ano
      let queryAtendimentos = `
        SELECT 
          id,
          data_atendimento,
          valor_total,
          prof_exec_id,
          valor_exec,
          prof_venda_id,
          valor_venda,
          cliente_id
        FROM atendimentos 
        WHERE (prof_exec_id = ? OR prof_venda_id = ?)
          AND situacao = 'FINALIZADO'
      `;
      
      const queryParams: any[] = [profissional_id, profissional_id];

      // Se não for histórico geral e possuir mês e ano, restringe o período
      if (historico_geral !== 'true' && mes && ano) {
        queryAtendimentos += ` AND MONTH(data_atendimento) = ? AND YEAR(data_atendimento) = ?`;
        queryParams.push(mes, ano);
      }
      
      const [rows]: any = await pool.query(queryAtendimentos, queryParams);

      let totalAtendimentos = 0;
      let totalComissoesExec = 0;
      let totalComissoesVenda = 0;
      const atendimentoIds = rows.map((a: any) => a.id);
      const profIdNum = Number(profissional_id);

      const clientesMap: { [key: number]: { cliente_id: number; nome: string; valor_total: number; total_atendimentos: number } } = {};

      for (const atend of rows) {
        let contouNesteAtendimento = false;

        if (Number(atend.prof_exec_id) === profIdNum) {
          totalComissoesExec += Number(atend.valor_exec || 0);
          contouNesteAtendimento = true;
        }
        if (Number(atend.prof_venda_id) === profIdNum) {
          totalComissoesVenda += Number(atend.valor_venda || 0);
          contouNesteAtendimento = true;
        }

        if (contouNesteAtendimento) {
          totalAtendimentos += 1;
        }

        // Acumular dados do cliente
        if (atend.cliente_id) {
          if (!clientesMap[atend.cliente_id]) {
            const [cliRows]: any = await pool.query(
              'SELECT id, nome, razao_social, tipo_pessoa FROM clientes WHERE id = ?',
              [atend.cliente_id]
            );
            const cli = cliRows[0];
            const nomeCliente = cli ? (cli.tipo_pessoa === 'PJ' ? cli.razao_social : cli.nome) : 'Cliente não identificado';

            clientesMap[atend.cliente_id] = {
              cliente_id: atend.cliente_id,
              nome: nomeCliente,
              valor_total: 0,
              total_atendimentos: 0
            };
          }
          clientesMap[atend.cliente_id].valor_total += Number(atend.valor_total || 0);
          clientesMap[atend.cliente_id].total_atendimentos += 1;
        }
      }

      const clientesAtendidos = Object.values(clientesMap);
      const valorTotalComissoes = totalComissoesExec + totalComissoesVenda;

      // 2. Buscar pagamentos por forma
      let brutoDinheiro = 0;
      let brutoPix = 0;
      let brutoDebito = 0;
      let brutoCredito = 0;

      if (atendimentoIds.length > 0) {
        const queryPagamentos = `
          SELECT forma_pagamento, SUM(valor) as total_valor
          FROM atendimento_pagamentos
          WHERE atendimento_id IN (?) AND status = 'PAGO'
          GROUP BY forma_pagamento
        `;
        const [rowsPagamentos]: any = await pool.query(queryPagamentos, [atendimentoIds]);

        rowsPagamentos.forEach((p: any) => {
          const forma = (p.forma_pagamento || '').toUpperCase();
          const val = Number(p.total_valor || 0);

          if (forma === 'DINHEIRO') brutoDinheiro += val;
          else if (forma === 'PIX') brutoPix += val;
          else if (forma === 'DEBITO') brutoDebito += val;
          else if (forma === 'CREDITO') brutoCredito += val;
        });
      }

      const brutoTotalPeriodo = brutoDinheiro + brutoPix + brutoDebito + brutoCredito;

      // 3. Buscar despesas variáveis com suporte a regras dinâmicas percentuais
      let queryDespesas = `
        SELECT id, descricao, valor, data, percentual, tipo_base 
        FROM despesas 
        WHERE profissional_id = ?
      `;
      const queryDespesasParams: any[] = [profissional_id];

      if (historico_geral !== 'true' && mes && ano) {
        queryDespesas += ` AND mes = ? AND ano = ?`;
        queryDespesasParams.push(mes, ano);
      }

      queryDespesas += ` ORDER BY id DESC`;

      const [rowsDespesas]: any = await pool.query(queryDespesas, queryDespesasParams);
      
      const despesas = rowsDespesas.map((d: any) => {
        let valorCalculado = Number(d.valor || 0);
        const tipo = (d.tipo_base || 'FIXO').toUpperCase();
        const perc = Number(d.percentual || 0);

        if (tipo !== 'FIXO' && perc > 0) {
          let baseCalculo = 0;
          if (tipo === 'CREDITO') baseCalculo = brutoCredito;
          else if (tipo === 'DEBITO') baseCalculo = brutoDebito;
          else if (tipo === 'PIX') baseCalculo = brutoPix;
          else if (tipo === 'TOTAL') baseCalculo = brutoTotalPeriodo;

          valorCalculado = Number(((baseCalculo * perc) / 100).toFixed(2));
        }

        return {
          id: d.id,
          descricao: d.descricao,
          valor: valorCalculado,
          percentual: d.percentual,
          tipo_base: d.tipo_base
        };
      });

      const totalDespesas = despesas.reduce((acc: number, curr: any) => acc + curr.valor, 0);

      return res.json({
        total_atendimentos: totalAtendimentos,
        valor_total_comissoes: valorTotalComissoes,
        bruto_dinheiro: brutoDinheiro,
        bruto_pix: brutoPix,
        bruto_debito: brutoDebito,
        bruto_credito: brutoCredito,
        total_despesas: totalDespesas,
        despesas: despesas,
        clientes_atendidos: clientesAtendidos,
        atendimentos: rows 
      });

    } catch (error: any) {
      console.error('Erro ao gerar relatório do profissional:', error);
      return res.status(500).json({ error: 'Erro ao gerar relatório.', details: error.message || error });
    }
  }
}