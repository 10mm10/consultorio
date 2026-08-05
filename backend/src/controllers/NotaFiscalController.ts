import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class NotaFiscalController {

  // GET /api/notas-fiscais/simular?profissional_id=X&mes=Y&ano=Z
  async simularNotaFiscal(req: Request, res: Response) {
    try {
      const { profissional_id, mes, ano } = req.query;

      if (!profissional_id || !mes || !ano) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios faltando.' });
      }

      // 1. Buscar dados do profissional
      const [profRows]: any = await pool.query(
        'SELECT id, nome, cpf, especialidade FROM profissionais WHERE id = ?',
        [profissional_id]
      );

      if (profRows.length === 0) {
        return res.status(404).json({ error: 'Profissional não encontrado.' });
      }

      const profissional = profRows[0];

      // 2. Buscar atendimentos do mês/ano para compor o valor total bruto/líquido
      const queryAtendimentos = `
        SELECT valor_exec, valor_venda, prof_exec_id, prof_venda_id
        FROM atendimentos 
        WHERE (prof_exec_id = ? OR prof_venda_id = ?)
          AND MONTH(data_atendimento) = ? 
          AND YEAR(data_atendimento) = ?
          AND situacao != 'CANCELADO'
      `;
      const [atendRows]: any = await pool.query(queryAtendimentos, [profissional_id, profissional_id, mes, ano]);

      let valorTotalComissoes = 0;
      const profIdNum = Number(profissional_id);

      atendRows.forEach((atend: any) => {
        if (Number(atend.prof_exec_id) === profIdNum) {
          valorTotalComissoes += Number(atend.valor_exec || 0);
        }
        if (Number(atend.prof_venda_id) === profIdNum) {
          valorTotalComissoes += Number(atend.valor_venda || 0);
        }
      });

      // 3. Buscar despesas do mês
      const [despRows]: any = await pool.query(
        'SELECT SUM(valor) as total_despesas FROM despesas WHERE profissional_id = ? AND mes = ? AND ano = ?',
        [profissional_id, mes, ano]
      );
      const totalDespesas = Number(despRows[0]?.total_despesas || 0);
      const valorLiquido = valorTotalComissoes - totalDespesas;

      // Meses por extenso para o cabeçalho da nota
      const mesesNomes = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const competencia = `${mesesNomes[Number(mes)]}/${ano}`;
      const numeroNotaSimulado = `2026${String(profissional_id).padStart(4, '0')}`;
      const codigoVerificacao = `CUR-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // 4. Retornar o HTML estruturado simulando rigorosamente o padrão NFS-e Curitiba
      const htmlNota = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>NFS-e - Prefeitura Municipal de Curitiba</title>
          <style>
            body { font-family: Tahoma, Geneva, sans-serif; color: #222; margin: 0; padding: 20px; background: #eef2f5; font-size: 11px; }
            .nf-container { max-width: 780px; margin: 0 auto; background: #fff; padding: 20px; border: 1px solid #b0bec5; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
            
            /* Topo / Cabeçalho Institucional Curitiba */
            .header-table { width: 100%; border-collapse: collapse; border: 1px solid #1565c0; margin-bottom: 15px; }
            .header-table td { padding: 10px; vertical-align: middle; border: 1px solid #1565c0; }
            .prefeitura-logo { text-align: center; background: #f4f6f8; width: 25%; }
            .prefeitura-logo h1 { font-size: 11px; color: #1565c0; margin: 0; font-weight: bold; text-transform: uppercase; }
            .prefeitura-logo p { font-size: 9px; margin: 2px 0 0 0; color: #555; }
            .nf-titulo { text-align: center; width: 50%; }
            .nf-titulo h2 { font-size: 13px; color: #0d47a1; margin: 0; text-transform: uppercase; font-weight: bold; }
            .nf-titulo p { font-size: 10px; margin: 3px 0 0 0; color: #444; }
            .nf-numero-box { text-align: center; width: 25%; background: #e3f2fd; }
            .nf-numero-box .num { font-size: 14px; font-weight: bold; color: #d32f2f; }
            .nf-numero-box .cod { font-size: 9px; color: #333; margin-top: 4px; }

            /* Seções e Tabelas Padrão */
            .box-section { border: 1px solid #b0bec5; margin-bottom: 10px; }
            .box-title { background: #cfd8dc; color: #37474f; font-weight: bold; padding: 5px 8px; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #b0bec5; }
            .box-content { padding: 8px; }
            
            .grid-2 { display: flex; justify-content: space-between; gap: 10px; }
            .col { flex: 1; }
            
            .field-group { margin-bottom: 5px; }
            .field-group label { display: block; font-size: 9px; color: #607d8b; font-weight: bold; text-transform: uppercase; }
            .field-group span { font-size: 11px; color: #263238; font-weight: 500; }

            /* Tabela de Serviços */
            .table-servicos { width: 100%; border-collapse: collapse; margin-top: 5px; }
            .table-servicos th, .table-servicos td { border: 1px solid #cfd8dc; padding: 6px 8px; text-align: left; }
            .table-servicos th { background: #eceff1; font-size: 10px; color: #37474f; text-transform: uppercase; }
            .text-right { text-align: right; }

            /* Totais */
            .totais-box { margin-top: 10px; border: 1px solid #1565c0; background: #f1f8e9; padding: 10px; display: flex; justify-content: space-between; align-items: center; }
            .totais-box .val-total { font-size: 15px; font-weight: bold; color: #2e7d32; }

            .aviso-simulacao { background: #fff8e1; border: 1px dashed #ffa000; color: #b78103; padding: 6px; text-align: center; font-weight: bold; font-size: 10px; margin-bottom: 15px; text-transform: uppercase; }

            /* Rodapé e Botões */
            .no-print { margin-top: 25px; text-align: center; }
            .btn-imprimir { background: #1565c0; color: #fff; border: none; padding: 10px 24px; font-size: 12px; font-weight: bold; border-radius: 4px; cursor: pointer; text-transform: uppercase; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
            .btn-imprimir:hover { background: #0d47a1; }
            
            @media print {
              body { background: #fff; padding: 0; }
              .nf-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="nf-container">
            
            <div class="aviso-simulacao">
              ⚠️ Documento Auxiliar de Simulação — Sem Valor Fiscal (Prefeitura Municipal de Curitiba) ⚠️
            </div>

            <!-- CABEÇALHO OFICIAL NFS-E -->
            <table class="header-table">
              <tr>
                <td class="prefeitura-logo">
                  <h1>MUNICÍPIO DE CURITIBA</h1>
                  <p>Secretaria de Finanças</p>
                </td>
                <td class="nf-titulo">
                  <h2>Nota Fiscal de Serviços Eletrônica (NFS-e)</h2>
                  <p>Data de Emissão: 03/08/2026 &nbsp;|&nbsp; Competência: ${competencia}</p>
                </td>
                <td class="nf-numero-box">
                  <div style="font-size: 9px; color: #555;">Número da Nota</div>
                  <div class="num">${numeroNotaSimulado}</div>
                  <div class="cod">Código: ${codigoVerificacao}</div>
                </td>
              </tr>
            </table>

            <!-- PRESTADOR DE SERVIÇOS -->
            <div class="box-section">
              <div class="box-title">Prestador de Serviços</div>
              <div class="box-content">
                <div class="field-group" style="margin-bottom: 8px;">
                  <label>Nome / Razão Social:</label>
                  <span>${profissional.nome}</span>
                </div>
                <div class="grid-2">
                  <div class="col">
                    <div class="field-group"><label>CPF / CNPJ:</label><span>${profissional.cpf || 'Não informado'}</span></div>
                  </div>
                  <div class="col">
                    <div class="field-group"><label>Atividade / Especialidade:</label><span>${profissional.especialidade || 'Profissional Autônomo'}</span></div>
                  </div>
                  <div class="col">
                    <div class="field-group"><label>Município:</label><span>Curitiba - PR</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TOMADOR DE SERVIÇOS -->
            <div class="box-section">
              <div class="box-title">Tomador de Serviços</div>
              <div class="box-content">
                <div class="field-group" style="margin-bottom: 8px;">
                  <label>Nome / Razão Social:</label>
                  <span>Ms Serviços Médicos</span>
                </div>
                <div class="grid-2">
                  <div class="col">
                    <div class="field-group"><label>Município:</label><span>Curitiba - PR</span></div>
                  </div>
                  <div class="col">
                    <div class="field-group"><label>Competência do Faturamento:</label><span>${competencia}</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- DISCRIMINAÇÃO DOS SERVIÇOS -->
            <div class="box-section">
              <div class="box-title">Discriminação dos Serviços</div>
              <div class="box-content" style="padding: 0;">
                <table class="table-servicos">
                  <thead>
                    <tr>
                      <th>Especificação do Serviço</th>
                      <th class="text-right" style="width: 150px;">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        Prestação de serviços profissionais executados/indicados referentes ao fechamento operacional da competência de ${competencia}.
                      </td>
                      <td class="text-right">R$ ${valorTotalComissoes.toFixed(2)}</td>
                    </tr>
                    ${totalDespesas > 0 ? `
                    <tr>
                      <td>(-) Deduções / Custos Operacionais Variáveis Cadastrados no Período</td>
                      <td class="text-right" style="color: #c62828;">- R$ ${totalDespesas.toFixed(2)}</td>
                    </tr>` : ''}
                  </tbody>
                </table>
              </div>
            </div>

            <!-- VALOR LÍQUIDO -->
            <div class="totais-box">
              <div>
                <span style="font-size: 10px; color: #37474f; font-weight: bold; display: block; text-transform: uppercase;">Valor Líquido do Serviço</span>
                <span style="font-size: 9px; color: #555;">(Valor Total das Comissões (-) Descontos Aplicados)</span>
              </div>
              <div class="val-total">
                R$ ${valorLiquido.toFixed(2)}
              </div>
            </div>

            <!-- BOTÃO DE AÇÃO -->
            <div class="no-print">
              <button class="btn-imprimir" onclick="window.print()">🖨️ Imprimir / Salvar Nota Fiscal em PDF</button>
            </div>

          </div>
        </body>
        </html>
      `;

      return res.send(htmlNota);

    } catch (error: any) {
      console.error('Erro ao simular nota fiscal:', error);
      return res.status(500).json({ error: 'Erro ao gerar simulação de nota fiscal.' });
    }
  }
}