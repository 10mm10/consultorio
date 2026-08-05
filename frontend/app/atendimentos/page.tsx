'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  listarAtendimentos,
  criarAtendimento,
  atualizarAtendimento,
  excluirAtendimento,
  listarClientes,
  listarProfissionais,
  listarProcedimentos
} from '@/services/api';
import { toast } from 'sonner';

// Função utilitária para gerar data no formato YYYY-MM-DD considerando a hora local
function obterDataLocalString(data: Date = new Date()): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

export default function AtendimentosPage() {
  const router = useRouter();
  const [atendimentos, setAtendimentos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [procedimentos, setProcedimentos] = useState<any[]>([]);

  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [atendimentoEditando, setAtendimentoEditando] = useState<any>(null);

  // --- ESTADOS DE FILTRO INDIVIDUAIS (Padrão: Ano, Mês e Dia Atuais) ---
  const dataAtual = new Date();
  const [anoFiltro, setAnoFiltro] = useState<string>(dataAtual.getFullYear().toString());
  const [mesFiltro, setMesFiltro] = useState<string>((dataAtual.getMonth() + 1).toString().padStart(2, '0'));
  const [diaFiltro, setDiaFiltro] = useState<string>(dataAtual.getDate().toString().padStart(2, '0'));

  // Formulário de Atendimento
  const [clienteId, setClienteId] = useState('');
  const [buscaCliente, setBuscaCliente] = useState('');
  const [mostrarDropdownClientes, setMostrarDropdownClientes] = useState(false);
  const dropdownClienteRef = useRef<HTMLDivElement>(null);
  const [situacaoFiltro, setSituacaoFiltro] = useState('');

  const [profVendaId, setProfVendaId] = useState('');
  const [pctVenda, setPctVenda] = useState(''); // % Vendedor / Indicador
  const [profExecId, setProfExecId] = useState('');
  const [pctExec, setPctExec] = useState('');   // % Executante

  const [situacao, setSituacao] = useState('PENDENTE');
  const [documento, setDocumento] = useState('CAIXA');
  const [observacao, setObservacao] = useState('');

  // Itens selecionados
  const [itens, setItens] = useState<any[]>([]);
  const [procedimentoSel, setProcedimentoSel] = useState('');

  // Pagamentos
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [parcelas, setParcelas] = useState('1');
  const [valorPagamento, setValorPagamento] = useState('');
  const [pagamentos, setPagamentos] = useState<any[]>([]);

  const carregarAtendimentos = async () => {
    try {
      const data = await listarAtendimentos({
        situacao: situacaoFiltro
      });
      setAtendimentos(Array.isArray(data) ? data : (data?.data || []));
    } catch (error) {
      toast.error('Erro ao carregar atendimentos:');
    }
  };

  useEffect(() => {
    carregarAtendimentos();
  }, [situacaoFiltro]);

  // Fechar dropdown de clientes ao clicar fora
  useEffect(() => {
    function handleClickFora(event: MouseEvent) {
      if (dropdownClienteRef.current && !dropdownClienteRef.current.contains(event.target as Node)) {
        setMostrarDropdownClientes(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Clientes filtrados para o Autocomplete
  const clientesFiltrados = useMemo(() => {
    if (!buscaCliente.trim()) {
      return clientes.slice(0, 10);
    }
    const termo = buscaCliente.toLowerCase();
    return clientes.filter(c =>
      c.nome.toLowerCase().includes(termo) ||
      (c.cpf && c.cpf.toLowerCase().includes(termo))
    );
  }, [clientes, buscaCliente]);

  // Totais Calculados
  const valorTotalCalculado = useMemo(() => {
    return itens.reduce((acc, item) => acc + (item.quantidade * item.valor_unitario), 0);
  }, [itens]);

  const totalPago = useMemo(() => {
    return pagamentos.reduce((acc, pg) => acc + Number(pg.valor), 0);
  }, [pagamentos]);

  // --- CÁLCULO DAS COMISSÕES E REPASSE DA CLÍNICA ---
  const valorExecCalculado = useMemo(() => {
    const pct = parseFloat(pctExec) || 0;
    return Number(((valorTotalCalculado * pct) / 100).toFixed(2));
  }, [valorTotalCalculado, pctExec]);

  const valorVendaCalculado = useMemo(() => {
    const pct = parseFloat(pctVenda) || 0;
    return Number(((valorTotalCalculado * pct) / 100).toFixed(2));
  }, [valorTotalCalculado, pctVenda]);

  const valorConsultorioCalculado = useMemo(() => {
    const sobra = valorTotalCalculado - (valorExecCalculado + valorVendaCalculado);
    return Number(sobra.toFixed(2));
  }, [valorTotalCalculado, valorExecCalculado, valorVendaCalculado]);

  // --- LISTAS DE OPÇÕES PARA OS SELECTS DE DATA ---
  const anosDisponiveis = ['2024', '2025', '2026', '2027'];
  const mesesDisponiveis = [
    { valor: '01', nome: 'Janeiro' },
    { valor: '02', nome: 'Fevereiro' },
    { valor: '03', nome: 'Março' },
    { valor: '04', nome: 'Abril' },
    { valor: '05', nome: 'Maio' },
    { valor: '06', nome: 'Junho' },
    { valor: '07', nome: 'Julho' },
    { valor: '08', nome: 'Agosto' },
    { valor: '09', nome: 'Setembro' },
    { valor: '10', nome: 'Outubro' },
    { valor: '11', nome: 'Novembro' },
    { valor: '12', nome: 'Dezembro' },
  ];

  // Gerador dinâmico de dias para o select de dias (1 a 31)
  const diasDisponiveis = Array.from({ length: 31 }, (_, i) => {
    const diaNum = i + 1;
    return {
      valor: String(diaNum).padStart(2, '0'),
      nome: String(diaNum)
    };
  });

  // --- LISTA FILTRADA DE ATENDIMENTOS (Por Ano, Mês e Dia Independentes) ---
  const atendimentosFiltrados = useMemo(() => {
    return atendimentos.filter((a) => {
      const dataAtendimentoStr = a.data_atendimento || a.created_at || '';
      if (!dataAtendimentoStr) return false;

      const dataObj = new Date(dataAtendimentoStr);
      if (isNaN(dataObj.getTime())) return false;

      const dataStrAtend = obterDataLocalString(dataObj); // Ex: "2026-03-15"
      const [anoAtend, mesAtend, diaAtend] = dataStrAtend.split('-');

      // Validação do Ano (se selecionado)
      if (anoFiltro && anoAtend !== anoFiltro) return false;

      // Validação do Mês (se selecionado)
      if (mesFiltro && mesAtend !== mesFiltro) return false;

      // Validação do Dia (se selecionado, filtra o dia exato; se vazio, mostra o mês/ano inteiro)
      if (diaFiltro) {
        const diaFormatado = diaFiltro.padStart(2, '0');
        if (diaAtend !== diaFormatado) return false;
      }

      return true;
    });
  }, [atendimentos, anoFiltro, mesFiltro, diaFiltro]);

  useEffect(() => {
    carregarDados();
  }, []);

  // Atualiza sugestão de valor restante sem travar a digitação manual
  useEffect(() => {
    const restante = valorTotalCalculado - totalPago;
    if (restante > 0) {
      setValorPagamento(restante.toFixed(2));
    } else {
      setValorPagamento('');
    }
  }, [valorTotalCalculado, totalPago]);

  async function carregarDados() {
    setCarregando(true);
    try {
      const [cliData, profData, procData] = await Promise.all([
        listarClientes(),
        listarProfissionais(),
        listarProcedimentos()
      ]);
      setClientes(cliData);
      setProfissionais(profData);
      setProcedimentos(procData);
    } catch (err: any) {
      if (err.message?.includes('Token')) router.push('/login');
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovoAtendimento() {
    setAtendimentoEditando(null);
    setClienteId('');
    setBuscaCliente('');
    setMostrarDropdownClientes(false);
    setProfVendaId('');
    setPctVenda('');
    setProfExecId('');
    setPctExec('100'); // Já inicia com 100%
    setSituacao('PENDENTE');
    setDocumento('CAIXA');
    setObservacao('');
    setItens([]);
    setPagamentos([]);
    setFormaPagamento('PIX');
    setParcelas('1');
    setValorPagamento('');
    setErro('');
    setModalAberto(true);
  }

  function abrirEditarAtendimento(a: any) {
    setAtendimentoEditando(a);
    setClienteId(a.cliente_id ? String(a.cliente_id) : '');

    const clienteEncontrado = clientes.find(c => c.id === a.cliente_id);
    setBuscaCliente(clienteEncontrado ? clienteEncontrado.nome : (a.cliente_nome || ''));
    setMostrarDropdownClientes(false);

    setProfExecId(a.prof_exec_id ? String(a.prof_exec_id) : '');
    setPctExec(a.porcentagem_exec ? String(a.porcentagem_exec) : '');

    setProfVendaId(a.prof_venda_id ? String(a.prof_venda_id) : '');
    setPctVenda(a.porcentagem_venda ? String(a.porcentagem_venda) : '');

    setSituacao(a.situacao || 'PENDENTE');
    setDocumento(a.documento || 'CAIXA');
    setObservacao(a.observacao || '');

    if (a.itens && Array.isArray(a.itens)) {
      setItens(a.itens.map((i: any) => ({
        tipo: i.tipo || 'PROCEDIMENTO',
        item_id: i.item_id || i.procedimento_id,
        nome: i.nome || i.procedimento_nome,
        quantidade: i.quantidade || 1,
        valor_unitario: Number(i.valor_unitario || 0)
      })));
    } else {
      setItens([]);
    }

    if (a.pagamentos && Array.isArray(a.pagamentos)) {
      setPagamentos(a.pagamentos.map((p: any) => ({
        forma_pagamento: p.forma_pagamento,
        valor: Number(p.valor || 0),
        parcela_numero: p.parcela_numero || 1,
        data_vencimento: p.data_vencimento ? p.data_vencimento.split('T')[0] : obterDataLocalString(),
        status: p.status || 'PAGO'
      })));
    } else {
      setPagamentos([]);
    }

    setFormaPagamento('PIX');
    setParcelas('1');
    setValorPagamento('');
    setErro('');
    setModalAberto(true);
  }

  async function handleExcluir(id: number, situacaoAtual: string) {
    if (situacaoAtual === 'FINALIZADO') {
      toast.error('Atenção: Atendimentos finalizados não podem ser excluídos por segurança.');
      return;
    }

    toast('Tem certeza que deseja excluir este atendimento?', {
      description: 'Esta ação não poderá ser desfeita.',
      action: {
        label: 'Sim, excluir',
        onClick: async () => {
          try {
            await excluirAtendimento(id);
            toast.success('Atendimento excluído com sucesso!');
            carregarAtendimentos();
          } catch (err: any) {
            const mensagemErro = err.response?.data?.error || err.message || 'Erro ao excluir atendimento.';
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
  function handleAdicionarItem() {
    if (!procedimentoSel) return;
    const proc = procedimentos.find(p => p.id === parseInt(procedimentoSel));
    if (!proc) return;

    setItens([...itens, {
      tipo: 'PROCEDIMENTO',
      item_id: proc.id,
      nome: proc.nome,
      quantidade: 1,
      valor_unitario: Number(proc.valor_padrao || 0)
    }]);

    setProcedimentoSel('');
  }

  function handleRemoverItem(index: number) {
    setItens(itens.filter((_, i) => i !== index));
  }

  function handleAdicionarPagamento() {
    const saldoRestante = valorTotalCalculado - totalPago;
    const valorFinal = valorPagamento ? parseFloat(valorPagamento) : saldoRestante;

    if (valorFinal <= 0 || isNaN(valorFinal)) return;

    const numParcelas = parseInt(parcelas) || 1;
    const novosPagamentos: any[] = [];

    if (formaPagamento === 'CREDITO' && numParcelas > 1) {
      const valorBaseParcela = Math.floor((valorFinal / numParcelas) * 100) / 100;
      const diferencaCentavos = Number((valorFinal - (valorBaseParcela * numParcelas)).toFixed(2));

      const hoje = new Date();

      for (let i = 0; i < numParcelas; i++) {
        const dataVenc = new Date(hoje);
        dataVenc.setMonth(hoje.getMonth() + i);

        if (dataVenc.getDate() !== hoje.getDate()) {
          dataVenc.setDate(0);
        }

        const valorParcela = i === 0 ? Number((valorBaseParcela + diferencaCentavos).toFixed(2)) : valorBaseParcela;

        novosPagamentos.push({
          forma_pagamento: `CREDITO (${i + 1}/${numParcelas}x)`,
          valor: valorParcela,
          parcela_numero: i + 1,
          data_vencimento: obterDataLocalString(dataVenc),
          status: i === 0 ? 'PAGO' : 'PENDENTE'
        });
      }
    } else {
      novosPagamentos.push({
        forma_pagamento: formaPagamento,
        valor: Number(valorFinal.toFixed(2)),
        parcela_numero: 1,
        data_vencimento: obterDataLocalString(),
        status: 'PAGO'
      });
    }

    setPagamentos([...pagamentos, ...novosPagamentos]);
    setParcelas('1');
  }

  function handleRemoverPagamento(index: number) {
    setPagamentos(pagamentos.filter((_, i) => i !== index));
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');

    if (!clienteId) {
      setErro('Selecione um cliente válido da lista.');
      return;
    }

    if (itens.length === 0) {
      setErro('Adicione pelo menos um procedimento ao atendimento.');
      return;
    }

    try {
      const payload = {
        cliente_id: parseInt(clienteId),

        prof_exec_id: parseInt(profExecId),
        porcentagem_exec: pctExec ? parseFloat(pctExec) : 0,
        valor_exec: valorExecCalculado,

        prof_venda_id: profVendaId ? parseInt(profVendaId) : null,
        porcentagem_venda: pctVenda ? parseFloat(pctVenda) : 0,
        valor_venda: valorVendaCalculado,

        valor_consultorio: valorConsultorioCalculado,

        situacao,
        documento,
        observacao,
        itens,
        pagamentos
      };

      if (atendimentoEditando) {
        await atualizarAtendimento(atendimentoEditando.id, payload);
      } else {
        await criarAtendimento(payload);
      }

      setModalAberto(false);
      setClienteId('');
      setBuscaCliente('');
      setProfVendaId('');
      setPctVenda('');
      setProfExecId('');
      setPctExec('');
      setObservacao('');
      setItens([]);
      setPagamentos([]);
      setAtendimentoEditando(null);
      carregarAtendimentos();
    } catch (err: any) {
      const mensagemErro = err.response?.data?.error || 'Este atendimento já foi finalizado. Não é permitido alterá-lo.';
      toast.error(mensagemErro);
    }
  }

  function formatarMoeda(valor: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Atendimentos & Vendas</h1>
            <p className="text-sm text-gray-500">Gestão financeira e registro de atendimentos</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              Voltar ao Painel
            </button>
            <button
              onClick={abrirNovoAtendimento}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              + Novo Atendimento
            </button>
          </div>
        </div>

        {/* Barra de Filtros (Ano, Mês, Dia Independentes e Situação) */}
        <div className="bg-white rounded-xl shadow border border-gray-100 p-4 mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Filtro de Ano */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Ano</label>
              <select
                value={anoFiltro}
                onChange={(e) => setAnoFiltro(e.target.value)}
                className="px-3 py-2 border rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white cursor-pointer"
              >
                <option value="">Todos</option>
                {anosDisponiveis.map((ano) => (
                  <option key={ano} value={ano}>{ano}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Mês */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Mês</label>
              <select
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                className="px-3 py-2 border rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white cursor-pointer"
              >
                <option value="">Todos os Meses</option>
                {mesesDisponiveis.map((m) => (
                  <option key={m.valor} value={m.valor}>{m.nome}</option>
                ))}
              </select>
            </div>

            {/* Filtro de Dia */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Dia </label>
              <select
                value={diaFiltro}
                onChange={(e) => setDiaFiltro(e.target.value)}
                className="px-3 py-2 border rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white cursor-pointer"
              >
                <option value="">Todos os Dias</option>
                {diasDisponiveis.map((d) => (
                  <option key={d.valor} value={d.valor}>{d.nome}</option>
                ))}
              </select>
            </div>

            {/* Filtro por Situação */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-1">Situação</label>
              <select
                value={situacaoFiltro}
                onChange={(e) => setSituacaoFiltro(e.target.value)}
                className="px-3 py-2 border rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white cursor-pointer"
              >
                <option value="">Todas as Situações</option>
                <option value="PENDENTE">Pendente</option>
                <option value="FINALIZADO">Finalizado</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                const hoje = new Date();
                setAnoFiltro(hoje.getFullYear().toString());
                setMesFiltro((hoje.getMonth() + 1).toString().padStart(2, '0'));
                setDiaFiltro(hoje.getDate().toString().padStart(2, '0'));
                setSituacaoFiltro('');
              }}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold transition border border-gray-300 cursor-pointer"
            >
              Hoje
            </button>
            <button
              onClick={() => {
                setAnoFiltro('');
                setMesFiltro('');
                setDiaFiltro('');
                setSituacaoFiltro('');
              }}
              className="bg-gray-50 hover:bg-gray-100 text-gray-500 px-3 py-2 rounded-lg text-sm font-semibold transition border border-gray-200 cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        </div>

        {/* Tabela de Atendimentos com Rolagem Estritamente Interna */}
        <div className="bg-white rounded-xl shadow border border-gray-100 flex flex-col max-h-[calc(100vh-260px)] overflow-hidden">
          {carregando ? (
            <div className="p-8 text-center text-gray-500">Carregando atendimentos...</div>
          ) : atendimentosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum atendimento registrado para este filtro.</div>
          ) : (
            <div className="overflow-y-auto flex-1 relative">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-100 border-b text-[11px] font-semibold text-gray-600 uppercase tracking-wider shadow-sm">
                    <th className="py-3 px-4 bg-gray-100">ID</th>
                    <th className="py-3 px-4 bg-gray-100">Data</th>
                    <th className="py-3 px-4 bg-gray-100">Cliente</th>
                    <th className="py-3 px-4 bg-gray-100">Executado Por</th>
                    <th className="py-3 px-4 bg-gray-100">Situação</th>
                    <th className="py-3 px-4 bg-gray-100 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {atendimentosFiltrados.map((a) => {
                    const dataAtend = a.data_atendimento || a.created_at;
                    return (
                      <tr key={a.id} className="hover:bg-gray-50/85 transition">
                        <td className="py-3 px-4 font-mono text-sm text-gray-500">{a.id}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{dataAtend ? new Date(dataAtend).toLocaleDateString('pt-BR') : '-'}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{a.cliente_nome || 'Cliente não informado'}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{a.prof_exec_nome || '-'}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex px-2 py-0.5 text-[11px] rounded-full font-bold ${a.situacao === 'FINALIZADO' ? 'bg-green-100 text-green-700' :
                              a.situacao === 'PENDENTE' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                            }`}>
                            {a.situacao}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => abrirEditarAtendimento(a)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded text-xs font-medium transition border border-gray-300 cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleExcluir(a.id, a.situacao)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 px-2.5 py-1 rounded text-xs font-medium transition border border-red-200 cursor-pointer"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal de Cadastro/Edição */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col overflow-hidden">

              {/* Cabeçalho Fixo do Modal */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h2 className="text-lg font-bold text-gray-800">
                  {atendimentoEditando ? 'Editar Atendimento' : 'Novo Atendimento'}
                </h2>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="text-gray-400 hover:text-gray-600 text-base font-bold p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Corpo Compacto Sem Scroll */}
              <form onSubmit={handleSalvar} className="flex flex-col">
                <div className="p-4 space-y-3">
                  {erro && (
                    <div className="p-2.5 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                      {erro}
                    </div>
                  )}

                  {/* Linha 1: Cliente (Linha Única) */}
                  <div className="relative" ref={dropdownClienteRef}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente *</label>
                    <input
                      type="text"
                      placeholder="Digite o nome do cliente..."
                      value={buscaCliente}
                      onChange={(e) => {
                        setBuscaCliente(e.target.value);
                        setMostrarDropdownClientes(true);
                        setClienteId('');
                      }}
                      onFocus={() => setMostrarDropdownClientes(true)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white shadow-sm cursor-pointer"
                    />

                    {/* Dropdown de Sugestões */}
                    {mostrarDropdownClientes && (
                      <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-20 max-h-32 overflow-y-auto">
                        {clientesFiltrados.length === 0 ? (
                          <div className="p-2 text-sm text-gray-500 text-center">Nenhum cliente encontrado.</div>
                        ) : (
                          clientesFiltrados.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setClienteId(String(c.id));
                                setBuscaCliente(c.nome);
                                setMostrarDropdownClientes(false);
                              }}
                              className="px-3 py-1.5 hover:bg-rose-50 cursor-pointer text-sm text-gray-800 border-b border-gray-50 last:border-0 flex justify-between items-center"
                            >
                              <span className="font-medium">{c.nome}</span>
                              <span className="text-[10px] text-gray-400">{c.cpf || 'Sem CPF'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                    {clienteId && (
                      <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">
                        ✓ Cliente selecionado corretamente.
                      </span>
                    )}
                  </div>

                  {/* Linha 2: 3 Colunas (Profissionais | Procedimentos | Pagamento) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                    {/* Coluna 1: Profissionais */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5">
                      <span className="text-sm font-bold text-gray-700 block border-b pb-1">👤 Profissionais</span>

                      {/* Executante */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Executante *</label>
                        <div className="flex gap-1">
                          <select
                            required
                            value={profExecId}
                            onChange={(e) => {
                              setProfExecId(e.target.value);
                              if (e.target.value && !pctExec) setPctExec('100');
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            {profissionais.map(p => (
                              <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                          </select>
                          <div className="relative w-14">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="100"
                              value={pctExec}
                              onChange={(e) => setPctExec(e.target.value)}
                              className="w-full pr-3 pl-1 py-1 border border-gray-300 rounded-lg text-gray-800 text-sm text-right focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                            />
                            <span className="absolute right-1 top-1 text-[10px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>
                        {parseFloat(pctExec) > 0 && (
                          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block text-right">
                            = {formatarMoeda(valorExecCalculado)}
                          </span>
                        )}
                      </div>

                      {/* Vendedor / Indicador */}
                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Indicador / Vendedor</label>
                        <div className="flex gap-1">
                          <select
                            value={profVendaId}
                            onChange={(e) => {
                              const novoVendaId = e.target.value;
                              setProfVendaId(novoVendaId);
                              if (!novoVendaId) {
                                setPctVenda('');
                                setPctExec('100');
                              }
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white cursor-pointer"
                          >
                            <option value="">Nenhum...</option>
                            {profissionais.map(p => (
                              <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                          </select>
                          <div className="relative w-14">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0"
                              value={pctVenda}
                              onChange={(e) => {
                                const valVenda = parseFloat(e.target.value) || 0;
                                setPctVenda(e.target.value);
                                const restoExec = 100 - valVenda;
                                if (restoExec >= 0) setPctExec(restoExec.toString());
                              }}
                              className="w-full pr-3 pl-1 py-1 border border-gray-300 rounded-lg text-gray-800 text-sm text-right focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                            />
                            <span className="absolute right-1 top-1 text-[10px] text-gray-400 font-bold">%</span>
                          </div>
                        </div>
                        {parseFloat(pctVenda) > 0 && (
                          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block text-right">
                            = {formatarMoeda(valorVendaCalculado)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Coluna 2: Procedimentos */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col justify-between">
                      <div>
                        <span className="text-sm font-bold text-gray-700 block border-b pb-1 mb-2">💉 Procedimentos *</span>
                        <div className="flex gap-1.5 mb-2">
                          <select
                            value={procedimentoSel}
                            onChange={(e) => setProcedimentoSel(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white cursor-pointer"
                          >
                            <option value="">Selecione...</option>
                            {procedimentos.map(p => (
                              <option key={p.id} value={p.id}>{p.nome} ({formatarMoeda(Number(p.valor_padrao))})</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleAdicionarItem}
                            className="bg-gray-800 hover:bg-black text-white px-2 py-1 rounded-lg text-sm font-semibold cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {itens.length > 0 ? (
                          <div className="bg-white rounded-lg p-1.5 space-y-1 max-h-20 overflow-y-auto border border-gray-200">
                            {itens.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[11px]">
                                <span className="truncate pr-1">{item.nome}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-bold">{formatarMoeda(item.valor_unitario)}</span>
                                  <button type="button" onClick={() => handleRemoverItem(idx)} className="text-red-500 hover:text-red-700 font-bold cursor-pointer">✕</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">Nenhum adicionado.</p>
                        )}
                      </div>
                    </div>

                    {/* Coluna 3: Plano de Pagamento */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 flex flex-col justify-between">
                      <div>
                        <span className="text-sm font-bold text-gray-700 block border-b pb-1 mb-2">💳 Pagamento</span>
                        <div className="flex gap-1 mb-2">
                          <select
                            value={formaPagamento}
                            onChange={(e) => {
                              setFormaPagamento(e.target.value);
                              if (e.target.value !== 'CREDITO') setParcelas('1');
                            }}
                            className="w-20 px-1 py-1 border border-gray-300 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white cursor-pointer"
                          >
                            <option value="PIX">PIX</option>
                            <option value="CREDITO">Crédito</option>
                            <option value="DEBITO">Débito</option>
                            <option value="DINHEIRO">Dinheiro</option>
                          </select>

                          {formaPagamento === 'CREDITO' && (
                            <select
                              value={parcelas}
                              onChange={(e) => setParcelas(e.target.value)}
                              className="w-12 px-0.5 py-1 border border-gray-300 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white cursor-pointer"
                            >
                              {[1, 2, 3, 4, 5, 6, 10, 12].map(n => <option key={n} value={n}>{n}x</option>)}
                            </select>
                          )}

                          <input
                            type="number"
                            step="0.01"
                            placeholder="R$"
                            value={valorPagamento}
                            onChange={(e) => setValorPagamento(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white cursor-pointer"
                          />

                          <button
                            type="button"
                            onClick={handleAdicionarPagamento}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-lg text-sm font-semibold cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {pagamentos.length > 0 ? (
                          <div className="bg-emerald-50/60 rounded-lg p-1.5 space-y-1 max-h-20 overflow-y-auto border border-emerald-100">
                            {pagamentos.map((p, idx) => (
                              <div key={idx} className="flex justify-between items-center text-[10px] text-emerald-900 border-b border-emerald-100 last:border-0 pb-0.5">
                                <span className="font-semibold">{p.forma_pagamento}</span>
                                <div className="flex items-center gap-1">
                                  <span className={`px-1 py-0.2 rounded font-bold ${p.status === 'PAGO' ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'}`}>
                                    {p.status}
                                  </span>
                                  <span className="font-bold">{formatarMoeda(p.valor)}</span>
                                  <button type="button" onClick={() => handleRemoverPagamento(idx)} className="text-red-500 font-bold cursor-pointer">✕</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-[11px] text-gray-400 italic">Nenhum pagamento.</p>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Linha 3: Resumo Financeiro & Totais (Compactos) */}
                  {(() => {
                    const diferenca = Number((totalPago - valorTotalCalculado).toFixed(2));
                    const tolerancia = Math.abs(diferenca) < 0.01;
                    const caixaHoje = pagamentos.filter(p => p.status === 'PAGO').reduce((acc, p) => acc + Number(p.valor), 0);
                    const aReceberFuturo = pagamentos.filter(p => p.status === 'PENDENTE').reduce((acc, p) => acc + Number(p.valor), 0);

                    return (
                      <div className="space-y-2">
                        {/* Alerta de Status */}
                        <div className={`px-3 py-1.5 rounded-lg border flex justify-between items-center text-sm font-semibold ${tolerancia && valorTotalCalculado > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                            diferenca < 0 ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-blue-50 border-blue-200 text-blue-800'
                          }`}>
                          <div className="flex items-center gap-1.5">
                            <span>{tolerancia && valorTotalCalculado > 0 ? '✅' : diferenca < 0 ? '⚠️' : 'ℹ️'}</span>
                            <span>
                              {tolerancia && valorTotalCalculado > 0 ? 'Valores conferem perfeitamente!' :
                                diferenca < 0 ? `Falta lançar no pagamento: ${formatarMoeda(Math.abs(diferenca))}` :
                                  `Troco / Valor excedente: ${formatarMoeda(diferenca)}`}
                            </span>
                          </div>
                          <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">
                            {tolerancia && valorTotalCalculado > 0 ? '100% Coberto' : diferenca < 0 ? 'Incompleto' : 'Excedente'}
                          </span>
                        </div>

                        {/* Blocos de Totais + Comissões em Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-center text-sm">
                          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex flex-col justify-center">
                            <span className="text-gray-500 text-[10px]">Total Atendimento</span>
                            <span className="font-bold text-gray-800">{formatarMoeda(valorTotalCalculado)}</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex flex-col justify-center">
                            <span className="text-gray-500 text-[10px]">Caixa Hoje</span>
                            <span className="font-bold text-emerald-600">{formatarMoeda(caixaHoje)}</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg border border-gray-200 flex flex-col justify-center">
                            <span className="text-gray-500 text-[10px]">A Receber</span>
                            <span className="font-bold text-blue-600">{formatarMoeda(aReceberFuturo)}</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 text-left text-[11px] space-y-0.5">
                            <div className="flex justify-between text-slate-600"><span>Exec.:</span><span className="font-semibold">{formatarMoeda(valorExecCalculado)}</span></div>
                            <div className="flex justify-between text-slate-600"><span>Indic.:</span><span className="font-semibold">{formatarMoeda(valorVendaCalculado)}</span></div>
                            <div className="flex justify-between text-emerald-700 font-bold border-t pt-0.5"><span>Consultório:</span><span>{formatarMoeda(valorConsultorioCalculado)}</span></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Linha 4: Situação & Documento + Botões */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center pt-1">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Situação Geral</label>
                      <select
                        value={situacao}
                        onChange={(e) => setSituacao(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white shadow-sm cursor-pointer"
                      >
                        <option value="FINALIZADO">FINALIZADO</option>
                        <option value="PENDENTE">PENDENTE</option>
                        <option value="CANCELADO">CANCELADO</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">Documento Emitido</label>
                      <select
                        value={documento}
                        onChange={(e) => setDocumento(e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white shadow-sm cursor-pointer"
                      >
                        <option value="CAIXA">CAIXA</option>
                        <option value="RECIBO">RECIBO</option>
                        <option value="NOTA FISCAL">NOTA FISCAL</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <button
                        type="button"
                        onClick={() => setModalAberto(false)}
                        className="px-3.5 py-1.5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100 transition text-sm font-semibold shadow-sm cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition font-semibold text-sm shadow-md cursor-pointer"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>

                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}