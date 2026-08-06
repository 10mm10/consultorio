'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  listarProfissionais,
  obterRelatorioProfissional,
  salvarDespesaProfissional,
  atualizarDespesaProfissional,
  deletarDespesaProfissional
} from '@/services/api';
import { toast } from 'sonner';

export default function RelatoriosPage() {
  const router = useRouter();
  const hoje = new Date();
  const [dia, setDia] = useState<number | null>(null);
  const [mes, setMes] = useState<number | null>(hoje.getMonth() + 1);
  const [ano, setAno] = useState<number | null>(hoje.getFullYear());

  // Regra de bloqueio de período (mês passado / histórico)
  const mesAtualSistema = hoje.getMonth() + 1;
  const anoAtualSistema = hoje.getFullYear();
  const isPeriodoPassado =
    (ano !== null && ano < anoAtualSistema) ||
    (ano === anoAtualSistema && mes !== null && mes < mesAtualSistema);

  const [modoHistoricoCliente, setModoHistoricoCliente] = useState<boolean>(false);
  const [modoHistoricoProfissional, setModoHistoricoProfissional] = useState<boolean>(false);
  const [tipoRelatorio, setTipoRelatorio] = useState<'profissional' | 'cliente'>('cliente');

  // Estados do Profissional
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [profissionalId, setProfissionalId] = useState<string>('');
  const [dadosRelatorio, setDadosRelatorio] = useState<any>(null);

  // Estados do Cliente (PF / PJ)
  const [clientes, setClientes] = useState<any[]>([]);
  const [clienteId, setClienteId] = useState<string>('');
  const [dadosRelatorioCliente, setDadosRelatorioCliente] = useState<any>(null);

  const [carregando, setCarregando] = useState(false);

  // Estados do Modal unificado (Criação e Edição)
  const [modalAberto, setModalAberto] = useState(false);
  const [despesaEmEdicaoId, setDespesaEmEdicaoId] = useState<number | null>(null);
  const [descricaoDespesa, setDescricaoDespesa] = useState('');
  const [valorDespesa, setValorDespesa] = useState('');

  const [porcentagemTotal, setPorcentagemTotal] = useState('');
  const [porcentagemCredito, setPorcentagemCredito] = useState('');
  const [porcentagemDebito, setPorcentagemDebito] = useState('');
  const [porcentagemPix, setPorcentagemPix] = useState('');

  const [salvandoDespesa, setSalvandoDespesa] = useState(false);

  const dataCompletaAtual = dia
    ? `${ano}-${String(mes || 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    : '';

  const handleMudancaDataProfissional = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valorData = e.target.value; // Formato "YYYY-MM-DD"
    if (!valorData) {
      setDia(null);
      return;
    }

    const partes = valorData.split('-');
    const anoSelecionado = Number(partes[0]);
    const mesSelecionado = Number(partes[1]);
    const diaSelecionado = Number(partes[2]);

    setAno(anoSelecionado);
    setMes(mesSelecionado);
    setDia(diaSelecionado);
    setModoHistoricoProfissional(false);
  };

  function handleMudancaDataCliente(e: React.ChangeEvent<HTMLInputElement>) {
    const valor = e.target.value;
    if (valor) {
      const [anoStr, mesStr, diaStr] = valor.split('-');
      setAno(Number(anoStr));
      setMes(Number(mesStr));
      setDia(Number(diaStr));
      setModoHistoricoCliente(false);
    } else {
      setDia(hoje.getDate());
    }
  }

  useEffect(() => {
    carregarListaProfissionais();
    carregarListaClientes();
  }, []);

  useEffect(() => {
    if (tipoRelatorio === 'profissional') {
      if (profissionalId) {
        buscarRelatorio();
      } else {
        setDadosRelatorio(null);
      }
    }
  }, [profissionalId, mes, ano, dia, modoHistoricoProfissional, tipoRelatorio]);

  useEffect(() => {
    if (tipoRelatorio === 'cliente') {
      if (clienteId) {
        buscarRelatorioCliente();
      } else {
        setDadosRelatorioCliente(null);
      }
    }
  }, [clienteId, mes, ano, dia, modoHistoricoCliente, tipoRelatorio]);

  async function carregarListaProfissionais() {
    try {
      const lista = await listarProfissionais();
      setProfissionais(Array.isArray(lista) ? lista : []);
    } catch (err: any) {
      if (err.message?.includes('Token')) router.push('/login');
    }
  }

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function carregarListaClientes() {
    try {
      const token = localStorage.getItem('@consultorio:token');
      const response = await fetch(`${API_URL}/clientes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClientes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Erro ao carregar lista de clientes:', err);
    }
  }

  async function buscarRelatorio() {
    if (!profissionalId) return;
    setCarregando(true);
    try {
      const res = await obterRelatorioProfissional(
        Number(profissionalId),
        mes,
        ano,
        modoHistoricoProfissional
      );

      const listaBrutaAtendimentos = res?.atendimentos || [];
      const profIdNum = Number(profissionalId);

      let atendimentosFiltrados = listaBrutaAtendimentos;

      // Filtros de período (Ano, Mês e Dia)
      if (!modoHistoricoProfissional && ano !== null) {
        atendimentosFiltrados = atendimentosFiltrados.filter((atend: any) => {
          if (!atend.data_atendimento) return false;
          return Number(atend.data_atendimento.substring(0, 4)) === ano;
        });
      }

      if (!modoHistoricoProfissional && mes !== null) {
        atendimentosFiltrados = atendimentosFiltrados.filter((atend: any) => {
          if (!atend.data_atendimento) return false;
          return Number(atend.data_atendimento.substring(5, 7)) === mes;
        });
      }

      if (!modoHistoricoProfissional && dia !== null) {
        const dataAlvoStr = `${ano}-${String(mes || 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        atendimentosFiltrados = atendimentosFiltrados.filter((atend: any) => {
          if (!atend.data_atendimento) return false;
          return atend.data_atendimento.substring(0, 10) === dataAlvoStr;
        });
      }

      let qtdExecucoes = 0;
      let qtdIndicacoes = 0;

      // Pegamos os brutos originais que vieram do backend
      let calcBrutoDinheiro = Number(res?.bruto_dinheiro || 0);
      let calcBrutoCredito = Number(res?.bruto_credito || 0);
      let calcBrutoDebito = Number(res?.bruto_debito || 0);
      let calcBrutoPix = Number(res?.bruto_pix || 0);

      // Variáveis para acumular as comissões de indicação separadas por forma de pagamento
      let calcComissaoDinheiro = 0;
      let calcComissaoCredito = 0;
      let calcComissaoDebito = 0;
      let calcComissaoPix = 0;
      let calcValorTotalComissoes = 0;

      // Mapeia os clientes usando o ID do cliente retornado pelo backend para pegar o nome correto
      const mapaClientesBackend = (res?.clientes_atendidos || []).reduce((acc: any, cli: any) => {
        acc[cli.cliente_id] = cli.nome;
        return acc;
      }, {});

      const mapaClientesProcessados: { [key: string]: { nome: string; total_atendimentos: number; total_indicacoes: number; valor_total: number } } = {};

      atendimentosFiltrados.forEach((atend: any) => {
        const execId = Number(atend.prof_exec_id || 0);
        const vendaId = Number(atend.prof_venda_id || 0);

        const clienteNome = mapaClientesBackend[atend.cliente_id] || 'Cliente não identificado';
        const valorAtend = Number(atend.valor_total || atend.valor || 0);
        const formaPgto = (atend.forma_pagamento || '').toLowerCase();

        const eleExecutou = execId === profIdNum;
        const eleApenasIndicou = vendaId === profIdNum && execId !== profIdNum;

        if (eleExecutou) {
          qtdExecucoes++;
          const comissaoExecutante = Number(atend.valor_exec || valorAtend);
          calcValorTotalComissoes += comissaoExecutante;
        }

        if (eleApenasIndicou) {
          qtdIndicacoes++;
          const comissaoIndicacao = Number(atend.valor_venda || 0);
          calcValorTotalComissoes += comissaoIndicacao;

          // Se o backend jogou o valor total do atendimento indicado dentro do bruto, 
          // nós removemos ele do bruto correspondente para não inflar o valor.
          if (formaPgto.includes('credito') || formaPgto.includes('crédito')) {
            calcBrutoCredito -= valorAtend;
            calcComissaoCredito += comissaoIndicacao;
          } else if (formaPgto.includes('debito') || formaPgto.includes('débito')) {
            calcBrutoDebito -= valorAtend;
            calcComissaoDebito += comissaoIndicacao;
          } else if (formaPgto.includes('pix')) {
            calcBrutoPix -= valorAtend;
            calcComissaoPix += comissaoIndicacao;
          } else {
            calcBrutoDinheiro -= valorAtend;
            calcComissaoDinheiro += comissaoIndicacao;
          }
        }

        if (eleExecutou || eleApenasIndicou) {
          if (!mapaClientesProcessados[clienteNome]) {
            mapaClientesProcessados[clienteNome] = {
              nome: clienteNome,
              total_atendimentos: 0,
              total_indicacoes: 0,
              valor_total: 0
            };
          }

          if (eleExecutou) {
            mapaClientesProcessados[clienteNome].total_atendimentos += 1;
            mapaClientesProcessados[clienteNome].valor_total += valorAtend;
          }
          if (eleApenasIndicou) {
            mapaClientesProcessados[clienteNome].total_indicacoes += 1;
          }
        }
      });

      const clientesProcessados = Object.values(mapaClientesProcessados);

      // Recalcula o bruto total atualizado após os ajustes de indicação
      const brutoTotalAtualizado = Math.max(0, calcBrutoDinheiro) + Math.max(0, calcBrutoCredito) + Math.max(0, calcBrutoDebito) + Math.max(0, calcBrutoPix);

      // Processa e recalcula as despesas vindas do backend no front-end para garantir o reflexo visual imediato
      // Processa e recalcula as despesas vindas do backend no front-end
      const listaDespesasBrutas = res?.despesas || [];
      
      let taxaDescontoCredito = 0;
      let taxaDescontoDebito = 0;
      let taxaDescontoPix = 0;
      let taxaDescontoDinheiro = 0;

      const despesasProcessadas = listaDespesasBrutas.map((d: any) => {
        let valorCalculado = Number(d.valor || 0);
        const tipo = (d.tipo_base || 'FIXO').toUpperCase();
        const perc = Number(d.percentual || 0);

        // SE HOUVER PORCENTAGEM CADASTRADA NO MODAL, CALCULA INDEPENDENTE DO NOME
        if (tipo !== 'FIXO' && perc > 0) {
          let baseCalculo = 0;
          if (tipo === 'CREDITO') baseCalculo = Math.max(0, calcBrutoCredito);
          else if (tipo === 'DEBITO') baseCalculo = Math.max(0, calcBrutoDebito);
          else if (tipo === 'PIX') baseCalculo = Math.max(0, calcBrutoPix);
          else if (tipo === 'TOTAL') baseCalculo = brutoTotalAtualizado;

          valorCalculado = Number(((baseCalculo * perc) / 100).toFixed(2));
        }

        // Acumula para o card correspondente com base no tipo selecionado no modal
        if (tipo === 'CREDITO') taxaDescontoCredito += valorCalculado;
        else if (tipo === 'DEBITO') taxaDescontoDebito += valorCalculado;
        else if (tipo === 'PIX') taxaDescontoPix += valorCalculado;
        else if (tipo === 'DINHEIRO') taxaDescontoDinheiro += valorCalculado;

        return {
          ...d,
          valor: valorCalculado
        };
      });

      const totalDespesasCalculado = despesasProcessadas.reduce((acc: number, curr: any) => acc + curr.valor, 0);

      setDadosRelatorio({
        ...res,
        total_atendimentos: qtdExecucoes,
        total_indicacoes: qtdIndicacoes,
        clientes_atendidos: clientesProcessados,
        atendimentos: atendimentosFiltrados,
        bruto_dinheiro: Math.max(0, calcBrutoDinheiro),
        bruto_credito: Math.max(0, calcBrutoCredito),
        bruto_debito: Math.max(0, calcBrutoDebito),
        bruto_pix: Math.max(0, calcBrutoPix),
        
        taxa_dinheiro: taxaDescontoDinheiro,
        taxa_credito: taxaDescontoCredito,
        taxa_debito: taxaDescontoDebito,
        taxa_pix: taxaDescontoPix,

        comissao_dinheiro: calcComissaoDinheiro,
        comissao_credito: calcComissaoCredito,
        comissao_debito: calcComissaoDebito,
        comissao_pix: calcComissaoPix,
        valor_total_comissoes: calcValorTotalComissoes,
        despesas: despesasProcessadas,
        total_despesas: totalDespesasCalculado
      });
    } catch (err) {
      console.error('Erro ao buscar relatório do profissional:', err);
      setDadosRelatorio(null);
    } finally {
      setCarregando(false);
    }
  }

  async function buscarRelatorioCliente() {
    if (!clienteId) return;
    setCarregando(true);
    try {
      const token = localStorage.getItem('@consultorio:token');

      let url = `NEXT_PUBLIC_API_URL/relatorios/cliente?cliente_id=${clienteId}`;
      if (modoHistoricoCliente) {
        url += `&historico_geral=true`;
      } else {
        url += `&mes=${mes ?? ''}&ano=${ano ?? ''}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        let listaAtendimentos = data.atendimentos || data.historico || data.dados || [];

        if (!modoHistoricoCliente && dia !== null) {
          listaAtendimentos = listaAtendimentos.filter((atend: any) => {
            const dataAtendStr = atend.data_atendimento ? atend.data_atendimento.split('T')[0] : '';
            const dataAlvoStr = `${ano}-${String(mes || 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            return dataAtendStr === dataAlvoStr;
          });
        }

        const clienteIdNum = Number(clienteId);
        let totalAtendimentosCalculado = 0;
        let totalIndicacoesCalculado = 0;

        // Conta separadamente o que foi atendimento real vs indicação do cliente
        listaAtendimentos.forEach((atend: any) => {
          const clienteAtendId = Number(atend.cliente_id || 0);
          const vendaId = Number(atend.prof_venda_id || 0);

          if (clienteAtendId === clienteIdNum || !atend.prof_venda_id) {
            totalAtendimentosCalculado++;
          }
          if (vendaId === clienteIdNum) {
            totalIndicacoesCalculado++;
          }
        });

        const listaClientesProcessada = (data.clientes_atendidos || [data]).map((c: any) => {
          const cId = Number(c.id || c.cliente_id || clienteIdNum);
          let atendeCount = 0;
          let indicaCount = 0;

          listaAtendimentos.forEach((atend: any) => {
            const execId = Number(atend.cliente_id || atend.id || 0);
            const vendaId = Number(atend.prof_venda_id || 0);

            if (execId === cId || !atend.prof_venda_id) atendeCount++;
            if (vendaId === cId) indicaCount++;
          });

          return {
            ...c,
            total_atendimentos: atendeCount > 0 ? atendeCount : listaAtendimentos.length,
            total_indicacoes: indicaCount
          };
        });

        const valorBrutoCalculado = listaAtendimentos.reduce((acc: number, curr: any) => {
          return acc + Number(curr.valor_total || curr.valor || 0);
        }, 0);

        setDadosRelatorioCliente({
          ...data,
          total_atendimentos: totalAtendimentosCalculado,
          total_indicacoes: totalIndicacoesCalculado,
          valor_total_bruto: valorBrutoCalculado,
          clientes_atendidos: listaClientesProcessada,
          atendimentos: listaAtendimentos
        });
      } else {
        setDadosRelatorioCliente(null);
      }
    } catch (err) {
      console.error('Erro ao buscar relatório do cliente:', err);
      setDadosRelatorioCliente(null);
    } finally {
      setCarregando(false);
    }
  }

  async function handleGerarNotaFiscal() {
    const token = localStorage.getItem('@consultorio:token');
    if (!token) {
      toast.error('Sessão expirada ou usuário não autenticado. Faça login novamente.');
      router.push('/login');
      return;
    }

    try {
      let url = '';

      if (tipoRelatorio === 'profissional') {
        if (!profissionalId) return;
        url = `NEXT_PUBLIC_API_URL/notas-fiscais/simular?profissional_id=${profissionalId}`;
        if (!modoHistoricoProfissional) {
          if (mes !== null) url += `&mes=${mes}`;
          if (ano !== null) url += `&ano=${ano}`;
          if (dia !== null) url += `&dia=${dia}`;
        } else {
          url += `&historico_geral=true`;
        }
      } else {
        if (!clienteId) return;
        url = `NEXT_PUBLIC_API_URL/notas-fiscais-clientes/simular?cliente_id=${clienteId}`;
        if (!modoHistoricoCliente) {
          if (mes !== null) url += `&mes=${mes}`;
          if (ano !== null) url += `&ano=${ano}`;
          if (dia !== null) url += `&dia=${dia}`;
        } else {
          url += `&historico_geral=true`;
        }
      }

      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.status === 401) {
        toast.error('Não autorizado. Faça login novamente.');
        router.push('/login');
        return;
      }
      if (!response.ok) throw new Error('Erro ao gerar nota fiscal.');

      const htmlContent = await response.text();
      const novaAba = window.open('', '_blank');
      if (novaAba) {
        novaAba.document.write(htmlContent);
        novaAba.document.close();
      }
    } catch (err) {
      toast.error('Erro ao gerar simulação de nota fiscal.');
    }
  }

  async function handleGerarNotaFiscalAtendimento(atend: any) {
    const token = localStorage.getItem('@consultorio:token');
    if (!token) {
      toast.error('Sessão expirada ou usuário não autenticado. Faça login novamente.');
      router.push('/login');
      return;
    }

    try {
      if (!clienteId || !atend?.data_atendimento) return;

      const [anoAtend, mesAtend, diaAtend] = atend.data_atendimento.split('T')[0].split('-');
      const url = `NEXT_PUBLIC_API_URL/notas-fiscais-clientes/simular?cliente_id=${clienteId}&mes=${Number(mesAtend)}&ano=${Number(anoAtend)}&dia=${Number(diaAtend)}`;

      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (response.status === 401) {
        toast.error('Não autorizado. Faça login novamente.');
        router.push('/login');
        return;
      }
      if (!response.ok) throw new Error('Erro ao gerar nota fiscal.');

      const htmlContent = await response.text();
      const novaAba = window.open('', '_blank');
      if (novaAba) {
        novaAba.document.write(htmlContent);
        novaAba.document.close();
      }
    } catch (err) {
      toast.error('Erro ao gerar simulação de nota fiscal para este atendimento.');
    }
  }

  const valorBruto = dadosRelatorio?.valor_total_comissoes || 0;
  const brutoCredito = dadosRelatorio?.bruto_credito || 0;
  const brutoDebito = dadosRelatorio?.bruto_debito || 0;
  const brutoDinheiro = dadosRelatorio?.bruto_dinheiro || 0;
  const brutoPix = dadosRelatorio?.bruto_pix || 0;
  const totalDespesas = dadosRelatorio?.total_despesas || 0;

  let totalDescontoCredito = 0;
  let totalDescontoDebito = 0;
  let totalDescontoPix = 0;
  let totalDescontoDinheiro = 0;

  if (dadosRelatorio?.despesas) {
    dadosRelatorio.despesas.forEach((d: any) => {
      const tipo = (d.tipo_base || '').toUpperCase();
      const valorDespesaItem = Number(d.valor || 0);

      if (tipo === 'CREDITO') totalDescontoCredito += valorDespesaItem;
      else if (tipo === 'DEBITO') totalDescontoDebito += valorDespesaItem;
      else if (tipo === 'PIX') totalDescontoPix += valorDespesaItem;
      else if (tipo === 'DINHEIRO') totalDescontoDinheiro += valorDespesaItem;
    });
  }

  // Mapeamento das taxas baseado puramente no tipo selecionado no modal (tipo_base)
  const taxaPixValor = totalDescontoPix;
  const taxaDebitoValor = totalDescontoDebito;
  const taxaCreditoValor = totalDescontoCredito;

  const liquidoDinheiro = brutoDinheiro;
  const liquidoPix = Math.max(0, brutoPix - taxaPixValor);
  const liquidoDebito = Math.max(0, brutoDebito - taxaDebitoValor);
  const liquidoCredito = Math.max(0, brutoCredito - taxaCreditoValor);
  const valorLiquido = valorBruto - totalDespesas;

  function calcularValorComPorcentagens(tot: string, cred: string, deb: string, pix: string) {
    const pTot = Number(tot || 0);
    const pCred = Number(cred || 0);
    const pDeb = Number(deb || 0);
    const pPix = Number(pix || 0);

    let calculatedValor = 0;

    if (pTot > 0) {
      const brutoTotal = (dadosRelatorio?.bruto_dinheiro || 0) + (dadosRelatorio?.bruto_credito || 0) + (dadosRelatorio?.bruto_debito || 0) + (dadosRelatorio?.bruto_pix || 0);
      calculatedValor = (brutoTotal * pTot) / 100;
    } else if (pCred > 0) {
      const brutoCred = dadosRelatorio?.bruto_credito || 0;
      calculatedValor = (brutoCred * pCred) / 100;
    } else if (pDeb > 0) {
      const brutoDeb = dadosRelatorio?.bruto_debito || 0;
      calculatedValor = (brutoDeb * pDeb) / 100;
    } else if (pPix > 0) {
      const brutoPixVal = dadosRelatorio?.bruto_pix || 0;
      calculatedValor = (brutoPixVal * pPix) / 100;
    }

    if (calculatedValor > 0) {
      setValorDespesa(calculatedValor.toFixed(2));
    }
  }

  function handlePorcentagemTotalChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPorcentagemTotal(val);
    calcularValorComPorcentagens(val, porcentagemCredito, porcentagemDebito, porcentagemPix);
  }

  function handlePorcentagemCreditoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPorcentagemCredito(val);
    calcularValorComPorcentagens(porcentagemTotal, val, porcentagemDebito, porcentagemPix);
  }

  function handlePorcentagemDebitoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPorcentagemDebito(val);
    calcularValorComPorcentagens(porcentagemTotal, porcentagemCredito, val, porcentagemPix);
  }

  function handlePorcentagemPixChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPorcentagemPix(val);
    calcularValorComPorcentagens(porcentagemTotal, porcentagemCredito, porcentagemDebito, val);
  }

  function abrirModalCriacao() {
    if (isPeriodoPassado) return;
    setDespesaEmEdicaoId(null);
    setDescricaoDespesa('');
    setValorDespesa('');
    setPorcentagemTotal('');
    setPorcentagemCredito('');
    setPorcentagemDebito('');
    setPorcentagemPix('');
    setModalAberto(true);
  }

  function abrirModalEdicao(item: any) {
    if (isPeriodoPassado) return;
    setDespesaEmEdicaoId(item.id);
    setDescricaoDespesa(item.descricao);
    setValorDespesa(item.valor);
    setPorcentagemTotal('');
    setPorcentagemCredito('');
    setPorcentagemDebito('');
    setPorcentagemPix('');
    setModalAberto(true);
  }

  async function handleSalvarDespesa(e: React.FormEvent) {
    e.preventDefault();
    if (isPeriodoPassado) return;
    if (!descricaoDespesa) return;

    // Detecta automaticamente qual tipo foi preenchido com base nos inputs do modal
    let tipoBase = 'FIXO';
    let percentualValor = 0;
    const valorFinal = Number(valorDespesa || 0);

    if (porcentagemCredito && Number(porcentagemCredito) > 0) {
      tipoBase = 'CREDITO';
      percentualValor = Number(porcentagemCredito);
    } else if (porcentagemDebito && Number(porcentagemDebito) > 0) {
      tipoBase = 'DEBITO';
      percentualValor = Number(porcentagemDebito);
    } else if (porcentagemPix && Number(porcentagemPix) > 0) {
      tipoBase = 'PIX';
      percentualValor = Number(porcentagemPix);
    } else if (porcentagemTotal && Number(porcentagemTotal) > 0) {
      tipoBase = 'TOTAL';
      percentualValor = Number(porcentagemTotal);
    }

    setSalvandoDespesa(true);
    try {
      if (despesaEmEdicaoId) {
        await atualizarDespesaProfissional(despesaEmEdicaoId, {
          descricao: descricaoDespesa,
          valor: valorFinal,
          percentual: percentualValor,
          tipo_base: tipoBase
        });
      } else {
        await salvarDespesaProfissional({
          profissional_id: Number(profissionalId),
          mes: mes ?? hoje.getMonth() + 1,
          ano: ano ?? hoje.getFullYear(),
          descricao: descricaoDespesa,
          valor: valorFinal,
          percentual: percentualValor,
          tipo_base: tipoBase
        });
      }

      setModalAberto(false);
      setDespesaEmEdicaoId(null);
      setDescricaoDespesa('');
      setValorDespesa('');
      setPorcentagemTotal('');
      setPorcentagemCredito('');
      setPorcentagemDebito('');
      setPorcentagemPix('');
      await buscarRelatorio();
    } catch (err) {
      toast.error('Erro ao salvar despesa do profissional.');
    } finally {
      setSalvandoDespesa(false);
    }
  }

  async function handleExcluir(id: number) {
    if (isPeriodoPassado) return;

    toast('Deseja realmente excluir esta despesa?', {
      description: 'Esta ação não poderá ser desfeita.',
      action: {
        label: 'Sim, excluir',
        onClick: async () => {
          try {
            await deletarDespesaProfissional(id);
            toast.success('Despesa removida com sucesso!');
            await buscarRelatorio();
          } catch (err: any) {
            const mensagemErro = err.response?.data?.error || err.message || 'Erro ao remover despesa.';
            toast.error(mensagemErro);
          }
        },
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => { },
      },
    });
  }

  function formatarMoeda(valor: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }
  
  
  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Relatório de Fechamento</h1>
            <p className="text-sm text-gray-500 mt-1">Acompanhamento de atendimentos, comissões e custos operacionais</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/financeiro')}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer border border-gray-200/60"
            >
              Voltar ao Financeiro
            </button>
            <button
              onClick={handleGerarNotaFiscal}
              disabled={tipoRelatorio === 'profissional' ? !profissionalId : !clienteId}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              📄 Simular NFS-e ({tipoRelatorio === 'profissional' ? 'Profissional' : 'Cliente'})
            </button>
          </div>
        </div>

        {/* Abas e Filtro */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex border-b border-gray-100 pb-4 gap-4">
            <button
              onClick={() => setTipoRelatorio('cliente')}
              className={` cursor-pointer px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${tipoRelatorio === 'cliente' ? 'bg-blue-50 text-blue-600 border border-blue-200' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              Por Cliente (PF / PJ)
            </button>
            <button
              onClick={() => setTipoRelatorio('profissional')}
              className={`cursor-pointer px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${tipoRelatorio === 'profissional' ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              Por Profissional
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            {tipoRelatorio === 'profissional' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Profissional</label>
                <select
                  value={profissionalId}
                  onChange={(e) => {
                    setProfissionalId(e.target.value);
                    setModoHistoricoProfissional(false);
                  }}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none bg-white focus:ring-2 focus:ring-rose-500 transition cursor-pointer"
                >
                  <option value="">-- Escolha um profissional --</option>
                  {profissionais.map((p) => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1.5">Cliente (PF ou PJ)</label>
                <select
                  value={clienteId}
                  onChange={(e) => {
                    setClienteId(e.target.value);
                    setModoHistoricoCliente(false);
                  }}
                  className="cursor-pointer w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none bg-white focus:ring-2 focus:ring-blue-500 transition"
                >
                  <option value="">-- Escolha um cliente --</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.tipo_pessoa === 'PJ' ? `${c.razao_social} (PJ)` : `${c.nome} (PF)`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {tipoRelatorio === 'profissional' ? (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-gray-600">Data de Referência</label>
                  <button
                    onClick={() => {
                      setModoHistoricoProfissional(false);
                      setAno(hoje.getFullYear());
                      setMes(hoje.getMonth() + 1);
                      setDia(hoje.getDate());
                    }}
                    className="text-sm text-rose-600 hover:underline cursor-pointer font-medium"
                  >
                    Voltar para hoje
                  </button>
                </div>

                {/* Filtros Independentes: Ano, Mês e Dia */}
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={ano !== null ? ano : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setAno(null);
                        setModoHistoricoProfissional(true);
                      } else {
                        setAno(Number(val));
                        setModoHistoricoProfissional(false);
                      }
                    }}
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none bg-white focus:ring-2 focus:ring-rose-500 transition cursor-pointer"
                  >
                    <option value="">Todos os anos</option>
                    {[2024, 2025, 2026, 2027].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>

                  <select
                    value={mes !== null ? mes : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setMes(null);
                      } else {
                        setMes(Number(val));
                      }
                    }}
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none bg-white focus:ring-2 focus:ring-rose-500 transition cursor-pointer"
                  >
                    <option value="">Todos os meses</option>
                    {[
                      { num: 1, nome: 'Janeiro' },
                      { num: 2, nome: 'Fevereiro' },
                      { num: 3, nome: 'Março' },
                      { num: 4, nome: 'Abril' },
                      { num: 5, nome: 'Maio' },
                      { num: 6, nome: 'Junho' },
                      { num: 7, nome: 'Julho' },
                      { num: 8, nome: 'Agosto' },
                      { num: 9, nome: 'Setembro' },
                      { num: 10, nome: 'Outubro' },
                      { num: 11, nome: 'Novembro' },
                      { num: 12, nome: 'Dezembro' }
                    ].map((m) => (
                      <option key={m.num} value={m.num}>{m.nome}</option>
                    ))}
                  </select>

                  <select
                    value={dia !== null ? dia : ''}
                    onChange={(e) => setDia(e.target.value ? Number(e.target.value) : null)}
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none bg-white focus:ring-2 focus:ring-rose-500 transition cursor-pointer"
                  >
                    <option value="">Todo o mês</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>Dia {d}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-semibold text-gray-600">Data de Referência</label>
                  <button
                    onClick={() => {
                      setModoHistoricoCliente(false);
                      setAno(hoje.getFullYear());
                      setMes(hoje.getMonth() + 1);
                      setDia(hoje.getDate());
                    }}
                    className="text-sm text-blue-600 hover:underline cursor-pointer font-medium"
                  >
                    Voltar para hoje
                  </button>
                </div>

                {/* Filtros Independentes: Ano, Mês e Dia (Cliente) */}
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={ano !== null ? ano : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setAno(null);
                        setModoHistoricoCliente(true);
                      } else {
                        setAno(Number(val));
                        setModoHistoricoCliente(false);
                      }
                    }}
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none bg-white focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                  >
                    <option value="">Todos os anos</option>
                    {[2024, 2025, 2026, 2027].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>

                  <select
                    value={mes !== null ? mes : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setMes(null);
                      } else {
                        setMes(Number(val));
                      }
                    }}
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none bg-white focus:ring-2 focus:ring-blue-500 transition cursor-pointer"
                  >
                    <option value="">Todos os meses</option>
                    {[
                      { num: 1, nome: 'Janeiro' },
                      { num: 2, nome: 'Fevereiro' },
                      { num: 3, nome: 'Março' },
                      { num: 4, nome: 'Abril' },
                      { num: 5, nome: 'Maio' },
                      { num: 6, nome: 'Junho' },
                      { num: 7, nome: 'Julho' },
                      { num: 8, nome: 'Agosto' },
                      { num: 9, nome: 'Setembro' },
                      { num: 10, nome: 'Outubro' },
                      { num: 11, nome: 'Novembro' },
                      { num: 12, nome: 'Dezembro' }
                    ].map((m) => (
                      <option key={m.num} value={m.num}>{m.nome}</option>
                    ))}
                  </select>

                  <select
                    value={dia !== null ? dia : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDia(val === '' ? (null as unknown as number) : Number(val));
                    }}
                    className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-800 outline-none bg-white focus:ring-2 focus:ring-rose-500 transition cursor-pointer"
                  >
                    <option value="">Todo o mês</option>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>Dia {d}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CLIENTE */}
        {tipoRelatorio === 'cliente' && (
          <div>
            {!clienteId ? (
              <div className="bg-white p-16 text-center text-gray-400 rounded-2xl shadow-sm border border-gray-100 text-sm">
                Selecione um cliente acima para visualizar o fechamento e valor bruto.
              </div>
            ) : carregando ? (
              <div className="bg-white p-16 text-center text-gray-400 rounded-2xl shadow-sm border border-gray-100 text-sm">
                Carregando dados do cliente...
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">
                      {modoHistoricoCliente ? 'Total de Atendimentos (Histórico Geral)' : 'Total de Atendimentos'}
                    </span>
                    <p className="text-3xl font-extrabold text-gray-800 mt-2">{dadosRelatorioCliente?.total_atendimentos || 0}</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">
                      {modoHistoricoCliente ? 'Valor Bruto (Histórico Geral)' : 'Valor Bruto Total'}
                    </span>
                    <p className="text-3xl font-extrabold text-emerald-600 mt-2">{formatarMoeda(dadosRelatorioCliente?.valor_total_bruto || 0)}</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
                  <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Histórico de Atendimentos</h3>
                  {(!dadosRelatorioCliente?.atendimentos || dadosRelatorioCliente.atendimentos.length === 0) ? (
                    <p className="text-sm text-gray-400 py-3">Nenhum atendimento registrado para este cliente no período selecionado.</p>
                  ) : (
                    /* Tabela Minimalista com Rolagem Estritamente Interna */
                    <div className="max-h-96 overflow-y-auto border border-gray-100 rounded-xl pr-1">
                      <table className="w-full text-left text-sm border-collapse">
                        <thead className="sticky top-0 bg-white border-b border-gray-100 z-10">
                          <tr className="text-gray-400 font-medium text-sm uppercase tracking-wider">
                            <th className="py-3 px-4">Data / Procedimentos</th>
                            <th className="py-3 px-4">Situação</th>
                            <th className="py-3 px-4 text-right">Valor / Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {dadosRelatorioCliente.atendimentos.map((atend: any) => (
                            <tr key={atend.id} className="hover:bg-gray-50/50 transition align-top">
                              <td className="py-3 px-4 text-gray-800">
                                <div className="font-medium">{new Date(atend.data_atendimento).toLocaleDateString('pt-BR')}</div>
                                {atend.itens && atend.itens.length > 0 && (
                                  <div className="mt-2 space-y-1 text-sm text-gray-500 bg-gray-50/80 p-2.5 rounded-lg border border-gray-100">
                                    <p className="font-semibold text-gray-600 uppercase tracking-wider mb-1">Procedimentos Realizados:</p>
                                    {atend.itens.map((item: any, idx: number) => (
                                      <div key={idx} className="flex justify-between items-center py-0.5">
                                        <span>{item.quantidade}x {item.nome || 'Procedimento'}</span>
                                        <span className="font-mono text-gray-700">{formatarMoeda(item.valor_total || item.valor)}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4 text-gray-600 font-medium pt-3.5">
                                <span className="inline-block px-2.5 py-0.5 text-sm font-medium rounded-full bg-gray-100 text-gray-700">{atend.situacao}</span>
                              </td>
                              <td className="py-3 px-4 text-right pt-3.5">
                                <div className="font-mono text-emerald-600 font-semibold">{formatarMoeda(atend.valor_total || atend.valor)}</div>
                                <div className="mt-2">
                                  <button
                                    onClick={() => handleGerarNotaFiscalAtendimento(atend)}
                                    disabled={tipoRelatorio === 'cliente' ? !clienteId : !profissionalId}
                                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-3 py-2 rounded-xl transition shadow-sm cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ml-auto"
                                  >
                                    📄 Simular NFS-e
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PROFISSIONAL */}
        {tipoRelatorio === 'profissional' && (
          <div>
            {!profissionalId ? (
              <div className="bg-white p-16 text-center text-gray-400 rounded-2xl shadow-sm border border-gray-100 text-sm cursor-pointer">
                Selecione um profissional acima para visualizar o fechamento mensal.
              </div>
            ) : carregando ? (
              <div className="bg-white p-16 text-center text-gray-400 rounded-2xl shadow-sm border border-gray-100 text-sm cursor-pointer">
                Carregando dados do fechamento...
              </div>
            ) : (
              <div className="space-y-6">

                {/* Resumo superior */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card 1: Total de Atendimentos Realizados */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                      <div>
                        <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">
                          {modoHistoricoProfissional ? 'Atendimentos (Histórico Geral)' : 'Atendimentos Realizados'}
                        </span>
                        <p className="text-3xl font-extrabold text-gray-800 mt-2">
                          {dadosRelatorio?.total_atendimentos || 0}
                        </p>
                      </div>
                      <p className="text-sm text-gray-400 mt-4">
                        {modoHistoricoProfissional
                          ? 'Histórico Geral (Todos os Períodos)'
                          : (dia !== null ? `Filtrado pelo dia ${dia}/${mes}/${ano}` : `Realizados no período de ${mes}/${ano}`)}
                      </p>
                    </div>

                    {/* Card 2: Total de Indicações de Venda */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
                      <div>
                        <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">
                          {modoHistoricoProfissional ? 'Indicações (Histórico Geral)' : 'Indicações de Pacientes'}
                        </span>
                        <p className="text-3xl font-extrabold text-gray-800 mt-2">
                          {dadosRelatorio?.total_indicacoes || 0}
                        </p>
                      </div>
                      <p className="text-sm text-gray-400 mt-4">
                        {modoHistoricoProfissional
                          ? 'Histórico Geral (Todos os Períodos)'
                          : (dia !== null ? `Filtrado pelo dia ${dia}/${mes}/${ano}` : `Geradas no período de ${mes}/${ano}`)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 md:col-span-2 flex flex-col justify-between space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div>
                        <span className="text-sm font-bold text-emerald-600 uppercase tracking-wider">
                          {modoHistoricoProfissional ? 'Valores do Histórico Geral' : 'Valores do Período'}
                        </span>
                        <h2 className="text-3xl font-extrabold text-emerald-600 mt-1">Líquido Geral: {formatarMoeda(valorLiquido)}</h2>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-400">Bruto Total</span>
                        <p className="text-base font-bold text-gray-700">{formatarMoeda(valorBruto)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">

                      {/* Dinheiro (Sem taxa de máquina) */}
                      <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 space-y-1">
                        <span className="text-[11px] font-bold text-gray-500 uppercase block">Dinheiro</span>

                        <div className="text-[11px] text-gray-500 flex justify-between">
                          <span>Bruto:</span>
                          <span className="font-medium text-gray-700">{formatarMoeda(dadosRelatorio?.bruto_dinheiro || 0)}</span>
                        </div>

                        {/* Linha adicionada para exibir a comissão de indicação separada */}
                        {(dadosRelatorio?.comissao_dinheiro || 0) > 0 && (
                          <div className="text-[11px] text-gray-500 flex justify-between">
                            <span className="text-indigo-600 font-medium">Comissão:</span>
                            <span className="font-semibold text-indigo-600">{formatarMoeda(dadosRelatorio?.comissao_dinheiro || 0)}</span>
                          </div>
                        )}

                        <div className="text-[11px] text-gray-500 flex justify-between">
                          <span>Taxa:</span>
                          <span className="font-medium text-red-500"> - {formatarMoeda(0)}</span>
                        </div>

                        <div className="text-[11px] text-gray-500 flex justify-between pt-1 border-t border-gray-200/60 font-semibold">
                          <span>Líquido:</span>
                          <span className="text-emerald-600">
                            {formatarMoeda(
                              (dadosRelatorio?.bruto_dinheiro || 0) + (dadosRelatorio?.comissao_dinheiro || 0)
                            )}
                          </span>
                        </div>
                      </div>

                      {/* PIX (Normalmente sem taxa ou ajuste conforme sua regra) */}
                      <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 space-y-1">
                        <span className="text-[11px] font-bold text-teal-600 uppercase block">PIX</span>
                        <div className="text-[11px] text-gray-500 flex justify-between"><span>Bruto:</span> <span className="font-medium text-gray-700">{formatarMoeda(brutoPix)}</span></div>
                        <div className="text-[11px] text-gray-500 flex justify-between"><span>Taxa:</span> <span className="font-medium text-red-500">- {formatarMoeda(taxaPixValor)}</span></div>
                        <div className="text-[11px] text-gray-500 flex justify-between pt-1 border-t border-gray-200/60 font-semibold"><span>Líquido:</span> <span className="text-emerald-600">{formatarMoeda(liquidoPix)}</span></div>
                      </div>

                      {/* Débito (Com taxa da máquina) */}
                      <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 space-y-1">
                        <span className="text-[11px] font-bold text-blue-600 uppercase block">Débito</span>
                        <div className="text-[11px] text-gray-500 flex justify-between"><span>Bruto:</span> <span className="font-medium text-gray-700">{formatarMoeda(brutoDebito)}</span></div>
                        <div className="text-[11px] text-gray-500 flex justify-between"><span>Taxa:</span> <span className="font-medium text-red-500"> - {formatarMoeda(taxaDebitoValor)}</span></div>
                        <div className="text-[11px] text-gray-500 flex justify-between pt-1 border-t border-gray-200/60 font-semibold"><span>Líquido:</span> <span className="text-emerald-600">{formatarMoeda(liquidoDebito)}</span></div>
                      </div>

                      {/* Crédito (Com taxa da máquina) */}
                      <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100 space-y-1">
                        <span className="text-[11px] font-bold text-purple-600 uppercase block">Crédito</span>
                        <div className="text-[11px] text-gray-500 flex justify-between"><span>Bruto:</span> <span className="font-medium text-gray-700">{formatarMoeda(brutoCredito)}</span></div>
                        <div className="text-[11px] text-gray-500 flex justify-between"><span>Taxa:</span> <span className="font-medium text-red-500">- {formatarMoeda(taxaCreditoValor)}</span></div>
                        <div className="text-[11px] text-gray-500 flex justify-between pt-1 border-t border-gray-200/60 font-semibold"><span>Líquido:</span> <span className="text-emerald-600">{formatarMoeda(liquidoCredito)}</span></div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Grid Lado a Lado: Despesas x Clientes Atendidos */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                  {/* CARD 1: Despesas e Ajustes */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <div>
                        <span className="text-sm font-bold text-rose-500 uppercase tracking-wider">Despesas / Descontos Variáveis</span>
                        <p className="text-2xl font-extrabold text-rose-600 mt-1">{formatarMoeda(totalDespesas)}</p>
                      </div>
                      {!isPeriodoPassado && (
                        <button
                          onClick={abrirModalCriacao}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold px-4 py-2.5 rounded-xl transition border border-rose-200 cursor-pointer"
                        >
                          + Lançar Despesa
                        </button>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      {(!dadosRelatorio?.despesas || dadosRelatorio.despesas.length === 0) ? (
                        <p className="text-sm text-gray-400 py-6 text-center">Nenhum custo variável lançado neste período.</p>
                      ) : (
                        <div className="text-sm max-h-72 overflow-y-auto divide-y divide-gray-50 pr-1">
                          {dadosRelatorio.despesas.map((d: any) => (
                            <div key={d.id} className="py-2.5 flex justify-between items-center text-sm">
                              <div>
                                <p className="font-medium text-sm text-gray-800">{d.descricao}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-mono text-rose-600 font-semibold">{formatarMoeda(d.valor)}</span>
                                {!isPeriodoPassado && (
                                  <div className="space-x-1">
                                    <button onClick={() => abrirModalEdicao(d)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded text-xs font-medium transition border border-gray-300 cursor-pointer">Editar</button>
                                    <button onClick={() => handleExcluir(d.id)} className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded text-xs font-medium transition border border-red-200 cursor-pointer">Excluir</button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CARD 2: Clientes Atendidos pelo Profissional */}
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <div>
                        <span className="text-sm font-bold text-blue-600 uppercase tracking-wider">Clientes Atendidos</span>
                        <p className="text-2xl text-sm font-extrabold text-gray-800 mt-1">{dadosRelatorio?.clientes_atendidos?.length || 0} cliente(s)</p>
                      </div>
                    </div>

                    <div className="space-y-2 flex-1">
                      {(!dadosRelatorio?.clientes_atendidos || dadosRelatorio.clientes_atendidos.length === 0) ? (
                        <p className="text-sm text-gray-400 py-6 text-center">Nenhum cliente atendido neste período.</p>
                      ) : (
                        <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 pr-1">
                          {dadosRelatorio.clientes_atendidos.map((c: any, idx: number) => (
                            <div key={idx} className="py-2.5 flex justify-between items-center text-sm">
                              <div>
                                <p className="font-medium text-sm text-gray-800">{c.nome || c.cliente_nome || 'Cliente não identificado'}</p>
                                <p className="text-sm text-gray-400 space-x-1">
                                  {c.total_atendimentos > 0 && <span>{c.total_atendimentos} atendimento(s)</span>}
                                  {c.total_atendimentos > 0 && c.total_indicacoes > 0 && <span>•</span>}
                                  {c.total_indicacoes > 0 && <span className="text-emerald-600 font-medium">{c.total_indicacoes} indicação(ões)</span>}
                                </p>
                              </div>
                              <span className="font-mono text-emerald-600 font-semibold">{formatarMoeda(c.valor_total || 0)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}
          </div>
        )}

        {/* Modal de Despesa */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
              <div>
                <h2 className="text-lg font-bold text-gray-800">{despesaEmEdicaoId ? 'Editar Despesa' : 'Lançar Despesa Variável'}</h2>
              </div>
              <form onSubmit={handleSalvarDespesa} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5">Descrição</label>
                  <input
                    type="text"
                    placeholder="Ex: Taxa PIX, Maquininha, Insumos"
                    value={descricaoDespesa}
                    onChange={(e) => setDescricaoDespesa(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">% Total</label>
                    <input type="number" step="0.01" value={porcentagemTotal} onChange={handlePorcentagemTotalChange} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-teal-600 mb-1">% PIX</label>
                    <input type="number" step="0.01" value={porcentagemPix} onChange={handlePorcentagemPixChange} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-blue-600 mb-1">% Débito</label>
                    <input type="number" step="0.01" value={porcentagemDebito} onChange={handlePorcentagemDebitoChange} className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-purple-600 mb-1">% Crédito</label>
                    <input
                      type="number"
                      step="0.01"
                      value={porcentagemCredito}
                      onChange={handlePorcentagemCreditoChange}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-600 mb-1.5">Valor Final (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valorDespesa}
                    onChange={(e) => setValorDespesa(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-rose-500 font-semibold text-rose-600"
                    placeholder="0,00"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setModalAberto(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium">Cancelar</button>
                  <button type="submit" disabled={salvandoDespesa} className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold">{salvandoDespesa ? 'Salvando...' : 'Salvar'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}