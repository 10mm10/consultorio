import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class DashboardFinanceiroController {

  async obterResumo(req: Request, res: Response) {
    
    try {
      const { mes, ano, tipo } = req.query;

      const anoAtual = ano ? Number(ano) : new Date().getFullYear();
      const mesAtual = mes ? Number(mes) : new Date().getMonth() + 1;
      const tipoFiltro = tipo || 'mes';

      let condicaoDataAtendimento = '';
      let condicaoDataPagamento = '';
      let condicaoDataPendente = '';
      let parametrosAtendimento: any[] = [];
      let parametrosPagamento: any[] = [];
      let parametrosPendente: any[] = [];

      if (tipoFiltro === 'ano') {
        condicaoDataAtendimento = 'YEAR(a.data_atendimento) = ?';
        parametrosAtendimento = [anoAtual];

        condicaoDataPagamento = 'YEAR(ap.data_vencimento) = ? AND ap.status = "PAGO"';
        parametrosPagamento = [anoAtual];

        // Pendentes do ano inteiro
        condicaoDataPendente = 'YEAR(ap.data_vencimento) = ? AND ap.status = "PENDENTE"';
        parametrosPendente = [anoAtual];
      } else {
        condicaoDataAtendimento = 'MONTH(a.data_atendimento) = ? AND YEAR(a.data_atendimento) = ?';
        parametrosAtendimento = [mesAtual, anoAtual];

        condicaoDataPagamento = 'MONTH(ap.data_vencimento) = ? AND YEAR(ap.data_vencimento) = ? AND ap.status = "PAGO"';
        parametrosPagamento = [mesAtual, anoAtual];

        // Pendentes do mês e ano específicos
        condicaoDataPendente = 'MONTH(ap.data_vencimento) = ? AND YEAR(ap.data_vencimento) = ? AND ap.status = "PENDENTE"';
        parametrosPendente = [mesAtual, anoAtual];
      }

      // 1. Total Faturado: Soma apenas pagamentos de atendimentos que estão FINALIZADOS no período
      const [faturadoRows]: any = await pool.query(
        `SELECT COALESCE(SUM(ap.valor), 0) AS total_faturado 
         FROM atendimento_pagamentos ap 
         INNER JOIN atendimentos a ON ap.atendimento_id = a.id
         WHERE ${condicaoDataPagamento.replace('ap.data_vencimento', 'a.data_atendimento')} 
           AND a.situacao = 'FINALIZADO'`,
        parametrosPagamento
      );

      // 2. Valores Pendentes: Soma o valor total dos atendimentos que estão com situacao = 'PENDENTE' no período
      const [pendenteRows]: any = await pool.query(
        `SELECT COALESCE(SUM(a.valor_total), 0) AS total_pendente 
         FROM atendimentos a 
         WHERE ${condicaoDataAtendimento} 
           AND a.situacao = 'PENDENTE'`,
        parametrosAtendimento
      );

      const [atendimentosRows]: any = await pool.query(
        `SELECT 
            COUNT(a.id) AS total_atendimentos,
            COALESCE(SUM(a.valor_total), 0) AS valor_total_atendimentos,
            COALESCE(SUM(a.valor_consultorio), 0) AS total_consultorio,
            COALESCE(SUM(a.valor_exec), 0) AS total_comissoes_exec,
            COALESCE(SUM(a.valor_venda), 0) AS total_comissoes_venda
         FROM atendimentos a 
         WHERE ${condicaoDataAtendimento} 
           AND a.situacao != 'PENDENTE'`, // <-- ADICIONADO AQUI
        parametrosAtendimento
      );

      const [comissoesExec]: any = await pool.query(
        `SELECT 
            a.prof_exec_id AS profissional_id,
            p.nome AS profissional_nome,
            SUM(a.valor_exec) AS total_comissao
         FROM atendimentos a
         INNER JOIN profissionais p ON a.prof_exec_id = p.id
         WHERE ${condicaoDataAtendimento} 
           AND a.prof_exec_id IS NOT NULL 
           AND a.situacao != 'PENDENTE' -- <-- ADICIONADO AQUI
         GROUP BY a.prof_exec_id, p.nome`,
        parametrosAtendimento
      );

      const [comissoesVenda]: any = await pool.query(
        `SELECT 
            a.prof_venda_id AS profissional_id,
            p.nome AS profissional_nome,
            SUM(a.valor_venda) AS total_comissao
         FROM atendimentos a
         INNER JOIN profissionais p ON a.prof_venda_id = p.id
         WHERE ${condicaoDataAtendimento} 
           AND a.prof_venda_id IS NOT NULL 
           AND a.situacao != 'PENDENTE' -- <-- ADICIONADO AQUI
         GROUP BY a.prof_venda_id, p.nome`,
        parametrosAtendimento
      );

      // Dados para Gráficos (Evolução Temporal Limpa)
      let dadosGraficoEvolucao = [];
      if (tipoFiltro === 'ano') {
        const [evolucaoAno]: any = await pool.query(
          `SELECT 
             MONTH(COALESCE(a.data_atendimento, NOW())) AS periodo,
             SUM(a.valor_total) AS total
           FROM atendimentos a
           WHERE YEAR(COALESCE(a.data_atendimento, NOW())) = ?
           GROUP BY MONTH(COALESCE(a.data_atendimento, NOW()))
           ORDER BY periodo ASC`,
          [anoAtual]
        );
        dadosGraficoEvolucao = evolucaoAno;
      } else {
        const [evolucaoMes]: any = await pool.query(
          `SELECT 
             DAY(COALESCE(a.data_atendimento, NOW())) AS periodo,
             SUM(a.valor_total) AS total
           FROM atendimentos a
           WHERE MONTH(COALESCE(a.data_atendimento, NOW())) = ? 
             AND YEAR(COALESCE(a.data_atendimento, NOW())) = ?
           GROUP BY DAY(COALESCE(a.data_atendimento, NOW()))
           ORDER BY periodo ASC`,
          [mesAtual, anoAtual]
        );
        dadosGraficoEvolucao = evolucaoMes;
      }

      const [formasPagamento]: any = await pool.query(
        `SELECT 
            ap.forma_pagamento, 
            SUM(ap.valor) AS total 
         FROM atendimento_pagamentos ap 
         INNER JOIN atendimentos a ON ap.atendimento_id = a.id
         WHERE ${condicaoDataPagamento.replace('ap.data_vencimento', 'a.data_atendimento')} 
           AND a.situacao = 'FINALIZADO'
         GROUP BY ap.forma_pagamento`,
        parametrosPagamento
      );

      return res.json({
        metricas: {
          total_faturado: faturadoRows[0]?.total_faturado || 0,
          total_pendente: pendenteRows[0]?.total_pendente || 0,
          total_atendimentos: atendimentosRows[0]?.total_atendimentos || 0,
          valor_total_atendimentos: atendimentosRows[0]?.valor_total_atendimentos || 0,
          total_consultorio: atendimentosRows[0]?.total_consultorio || 0,
          total_comissoes_exec: atendimentosRows[0]?.total_comissoes_exec || 0,
          total_comissoes_venda: atendimentosRows[0]?.total_comissoes_venda || 0,
        },
        comissoesExecutantes: comissoesExec,
        comissoesVendedores: comissoesVenda,
        faturamentoPorForma: formasPagamento,
        evolucao: dadosGraficoEvolucao
      });

    } catch (error: any) {
      console.error('Erro ao buscar dashboard financeiro:', error);
      return res.status(500).json({ error: 'Erro ao carregar dados financeiros.', details: error.message });
    }
  }
}