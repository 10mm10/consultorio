import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class DashboardController {
  
  // GET /api/dashboard/resumo?mes=X&ano=Y
  async obterResumo(req: Request, res: Response) {
    
    try {
      const hoje = new Date();
      const mes = req.query.mes ? Number(req.query.mes) : hoje.getMonth() + 1;
      const ano = req.query.ano ? Number(req.query.ano) : hoje.getFullYear();

      // 1. Atendimentos realizados especificamente neste mês
      const [resumoAtendimentos]: any = await pool.query(
        `
        SELECT 
          COUNT(id) AS total_atendimentos
        FROM atendimentos
        WHERE MONTH(data_atendimento) = ? AND YEAR(data_atendimento) = ?
      `,
        [mes, ano]
      );

      // 2. Consulta de Pagamentos / Parcelas do Mês (Quitadas vs Pendentes/Futuras)
      const [resumoPagamentos]: any = await pool.query(
        `
        SELECT 
          -- Parcelas pendentes / a receber com vencimento no mês selecionado
          COALESCE(SUM(CASE 
            WHEN ap.status = 'PENDENTE' OR a.situacao = 'PENDENTE' THEN ap.valor 
            ELSE 0 
          END), 0) AS total_pendente,

          -- Entradas pagas/quitadas no mês selecionado
          COALESCE(SUM(CASE 
            WHEN ap.status = 'PAGO' OR (a.situacao = 'QUITADO' AND (ap.status IS NULL OR ap.status != 'PENDENTE')) THEN ap.valor 
            ELSE 0 
          END), 0) AS total_faturado
        FROM atendimento_pagamentos ap
        INNER JOIN atendimentos a ON a.id = ap.atendimento_id
        WHERE (
          (MONTH(ap.data_vencimento) = ? AND YEAR(ap.data_vencimento) = ?)
          OR (ap.data_vencimento IS NULL AND MONTH(a.data_atendimento) = ? AND YEAR(a.data_atendimento) = ?)
        )
      `,
        [mes, ano, mes, ano]
      );

      const totalFaturado = Number(resumoPagamentos[0]?.total_faturado || 0);
      const totalPendente = Number(resumoPagamentos[0]?.total_pendente || 0);

      // 3. Comissões Geradas nos Atendimentos Realizados no Mês Selecionado
      const [resumoFinanceiroAtendimentos]: any = await pool.query(
        `
        SELECT 
          COALESCE(SUM(valor_exec), 0) AS total_comissoes_exec,
          COALESCE(SUM(valor_venda), 0) AS total_comissoes_venda
        FROM atendimentos
        WHERE MONTH(data_atendimento) = ? AND YEAR(data_atendimento) = ?
      `,
        [mes, ano]
      );

      const totalComissoesExec = Number(resumoFinanceiroAtendimentos[0]?.total_comissoes_exec || 0);
      const totalComissoesVenda = Number(resumoFinanceiroAtendimentos[0]?.total_comissoes_venda || 0);

      // 4. Todas as parcelas/recebimentos (PAGOS ou PENDENTES) que caem no MÊS SELECIONADO vindo de atendimentos do MÊS ATUAL
      const [parcelasMesAtual]: any = await pool.query(
        `
        SELECT 
          COALESCE(SUM(ap.valor), 0) AS total_parcelas_mes_atual
        FROM atendimento_pagamentos ap
        INNER JOIN atendimentos a ON a.id = ap.atendimento_id
        WHERE (
          (MONTH(ap.data_vencimento) = ? AND YEAR(ap.data_vencimento) = ?)
          OR (ap.data_vencimento IS NULL AND MONTH(a.data_atendimento) = ? AND YEAR(a.data_atendimento) = ?)
        )
        AND MONTH(a.data_atendimento) = ? AND YEAR(a.data_atendimento) = ?
      `,
        [mes, ano, mes, ano, mes, ano]
      );

      const totalParcelasMesAtual = Number(parcelasMesAtual[0]?.total_parcelas_mes_atual || 0);

      // 5. Todas as parcelas/recebimentos (PAGOS ou PENDENTES) que caem no MÊS SELECIONADO vindas de atendimentos de MESES ANTERIORES
      const [parcelasMesesAnteriores]: any = await pool.query(
        `
        SELECT 
          COALESCE(SUM(ap.valor), 0) AS total_parcelas_anteriores
        FROM atendimento_pagamentos ap
        INNER JOIN atendimentos a ON a.id = ap.atendimento_id
        WHERE MONTH(ap.data_vencimento) = ? AND YEAR(ap.data_vencimento) = ?
          AND (MONTH(a.data_atendimento) != ? OR YEAR(a.data_atendimento) != ?)
      `,
        [mes, ano, mes, ano]
      );

      const totalParcelasAnteriores = Number(parcelasMesesAnteriores[0]?.total_parcelas_anteriores || 0);

      // 6. CÁLCULO DA RETENÇÃO DO CONSULTÓRIO:
      // Parte A (Atendimentos do próprio mês): Pega o que entra no mês do atendimento e abate as comissões devidas
      const retencaoAtendimentosNovos = totalParcelasMesAtual - (totalComissoesExec + totalComissoesVenda);

      // Parte B (Parcelas de meses anteriores): 100% do valor da parcela vai para o consultório
      const saldoTotalConsultorio = retencaoAtendimentosNovos + totalParcelasAnteriores;

      const totalConsultorio = saldoTotalConsultorio > 0 ? saldoTotalConsultorio : 0;

      // 7. Faturamento Por Forma de Pagamento
      const [faturamentoPorForma]: any = await pool.query(
        `
        SELECT 
          ap.forma_pagamento,
          COALESCE(SUM(ap.valor), 0) as total
        FROM atendimento_pagamentos ap
        INNER JOIN atendimentos a ON a.id = ap.atendimento_id
        WHERE (a.situacao = 'QUITADO' OR ap.status = 'PAGO')
          AND (
            (MONTH(ap.data_vencimento) = ? AND YEAR(ap.data_vencimento) = ?)
            OR (ap.data_vencimento IS NULL AND MONTH(a.data_atendimento) = ? AND YEAR(a.data_atendimento) = ?)
          )
        GROUP BY ap.forma_pagamento
      `,
        [mes, ano, mes, ano]
      );

      // 8. Comissões por Profissional Executante (Atendimentos do Mês)
      const [comissoesExecutantes]: any = await pool.query(
        `
        SELECT 
          p.id AS profissional_id,
          p.nome AS profissional_nome,
          COUNT(a.id) AS total_atendimentos,
          COALESCE(SUM(a.valor_total), 0) AS valor_total_gerado,
          COALESCE(SUM(a.valor_exec), 0) AS total_comissao
        FROM atendimentos a
        INNER JOIN profissionais p ON p.id = a.prof_exec_id
        WHERE MONTH(a.data_atendimento) = ? 
          AND YEAR(a.data_atendimento) = ?
        GROUP BY p.id, p.nome
        ORDER BY total_comissao DESC
      `,
        [mes, ano]
      );

      // 9. Comissões por Profissional Vendedor (Atendimentos do Mês)
      const [comissoesVendedores]: any = await pool.query(
        `
        SELECT 
          p.id AS profissional_id,
          p.nome AS profissional_nome,
          COUNT(a.id) AS total_vendas,
          COALESCE(SUM(a.valor_total), 0) AS valor_total_gerado,
          COALESCE(SUM(a.valor_venda), 0) AS total_comissao
        FROM atendimentos a
        INNER JOIN profissionais p ON p.id = a.prof_venda_id
        WHERE MONTH(a.data_atendimento) = ? 
          AND YEAR(a.data_atendimento) = ?
        GROUP BY p.id, p.nome
        ORDER BY total_comissao DESC
      `,
        [mes, ano]
      );

      return res.json({
        metricas: {
          total_faturado: totalFaturado,
          total_pendente: totalPendente,
          total_atendimentos: resumoAtendimentos[0]?.total_atendimentos || 0,
          total_comissoes_exec: totalComissoesExec,
          total_comissoes_venda: totalComissoesVenda,
          total_consultorio: totalConsultorio,
        },
        faturamentoPorForma,
        comissoesExecutantes,
        comissoesVendedores,
      });
    } catch (error: any) {
      console.error('Erro ao obter dados do dashboard:', error);
      return res.status(500).json({
        error: 'Erro ao carregar dados do dashboard.',
        details: error.message,
      });
    }
  }
}