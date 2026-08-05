import { Request, Response } from 'express';
import { pool } from '../config/database.js';

export class NotaFiscalClienteController {

  // GET /api/notas-fiscais-clientes/simular?cliente_id=X&mes=Y&ano=Z
  async simularNotaFiscalCliente(req: Request, res: Response) {
    try {
      const { cliente_id, mes, ano } = req.query;

      if (!cliente_id || !mes || !ano) {
        return res.status(400).json({ error: 'Parâmetros obrigatórios faltando.' });
      }

      // 1. Buscar dados do cliente
      const [clienteRows]: any = await pool.query(
        'SELECT id, tipo_pessoa, nome, razao_social, cpf, cnpj, logradouro, numero, bairro, cidade, estado FROM clientes WHERE id = ?',
        [cliente_id]
      );

      if (clienteRows.length === 0) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const cliente = clienteRows[0];
      const isPJ = cliente.tipo_pessoa === 'PJ';
      const nomeCliente = isPJ ? cliente.razao_social : cliente.nome;
      const documentoCliente = isPJ ? cliente.cnpj : cliente.cpf;

      // 2. Buscar atendimentos do cliente no mês/ano para somar o valor total bruto
      const queryAtendimentos = `
        SELECT id, data_atendimento, valor_total, situacao
        FROM atendimentos 
        WHERE cliente_id = ?
          AND MONTH(data_atendimento) = ? 
          AND YEAR(data_atendimento) = ?
          AND situacao != 'CANCELADO'
      `;
      const [atendRows]: any = await pool.query(queryAtendimentos, [cliente_id, mes, ano]);

      let valorTotalBruto = 0;
      atendRows.forEach((atend: any) => {
        valorTotalBruto += Number(atend.valor_total || 0);
      });

      // Meses por extenso para o cabeçalho da nota
      const mesesNomes = ['', 'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const competencia = `${mesesNomes[Number(mes)]}/${ano}`;
      const numeroNotaSimulado = `CLI2026${String(cliente_id).padStart(4, '0')}`;
      const codigoVerificacao = `CUR-CLI-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // 3. Retornar o HTML estruturado simulando rigorosamente o padrão NFS-e Curitiba para Clientes
      const htmlNota = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <title>NFS-e (Tomador Cliente) - Prefeitura Municipal de Curitiba</title>
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

            <!-- PRESTADOR (EMPRESA / SISTEMA) -->
            <div class="box-section">
              <div class="box-title">Prestador de Serviços</div>
              <div class="box-content">
                <div class="field-group" style="margin-bottom: 8px;">
                  <label>Razão Social / Estabelecimento:</label>
                  <span>MM10 Sistemas e Gestão Ltda</span>
                </div>
                <div class="grid-2">
                  <div class="col">
                    <div class="field-group"><label>Município:</label><span>Curitiba - PR</span></div>
                  </div>
                  <div class="col">
                    <div class="field-group"><label>Ambiente:</label><span>Homologação / Simulação</span></div>
                  </div>
                </div>
              </div>
            </div>

            <!-- TOMADOR DE SERVIÇOS (CLIENTE) -->
            <div class="box-section">
              <div class="box-title">Tomador de Serviços (Cliente)</div>
              <div class="box-content">
                <div class="field-group" style="margin-bottom: 8px;">
                  <label>${isPJ ? 'Razão Social' : 'Nome do Cliente'}:</label>
                  <span>${nomeCliente || 'Não informado'}</span>
                </div>
                <div class="grid-2">
                  <div class="col">
                    <div class="field-group"><label>${isPJ ? 'CNPJ' : 'CPF'}:</label><span>${documentoCliente || 'Não informado'}</span></div>
                  </div>
                  <div class="col">
                    <div class="field-group"><label>Competência:</label><span>${competencia}</span></div>
                  </div>
                </div>
                ${cliente.logradouro ? `
                <div class="field-group" style="margin-top: 6px;">
                  <label>Endereço:</label>
                  <span>${cliente.logradouro}, ${cliente.numero || 'S/N'} - ${cliente.bairro || ''} (${cliente.cidade || 'Curitiba'}/${cliente.estado || 'PR'})</span>
                </div>` : ''}
              </div>
            </div>

            <!-- DISCRIMINAÇÃO DOS SERVIÇOS -->
            <div class="box-section">
              <div class="box-title">Discriminação dos Serviços</div>
              <div class="box-content" style="padding: 0;">
                <table class="table-servicos">
                  <thead>
                    <tr>
                      <th>Especificação dos Serviços Realizados</th>
                      <th class="text-right" style="width: 150px;">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        Serviços de estética e procedimentos especializados realizados referentes à competência de ${competencia}.
                      </td>
                      <td class="text-right">R$ ${valorTotalBruto.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- VALOR TOTAL -->
            <div class="totais-box">
              <div>
                <span style="font-size: 10px; color: #37474f; font-weight: bold; display: block; text-transform: uppercase;">Valor Total da Nota Fiscal</span>
                <span style="font-size: 9px; color: #555;">(Soma dos atendimentos realizados no período)</span>
              </div>
              <div class="val-total">
                R$ ${valorTotalBruto.toFixed(2)}
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
      console.error('Erro ao simular nota fiscal de cliente:', error);
      return res.status(500).json({ error: 'Erro ao gerar simulação de nota fiscal para o cliente.' });
    }
  }
}