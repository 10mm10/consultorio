'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listarProcedimentos, criarProcedimento, atualizarProcedimento, excluirProcedimento } from '@/services/api';
import { toast } from 'sonner';

export default function ProcedimentosPage() {
  const router = useRouter();
  const [procedimentos, setProcedimentos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [procedimentoEditando, setProcedimentoEditando] = useState<any>(null);

  // Formulário
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [valorPadrao, setValorPadrao] = useState('');

  useEffect(() => {
    carregarProcedimentos();
  }, []);

  async function carregarProcedimentos() {
    setCarregando(true);
    try {
      const data = await listarProcedimentos();
      setProcedimentos(data);
    } catch (err: any) {
      if (err.message?.includes('Token')) router.push('/login');
    } finally {
      setCarregando(false);
    }
  }

  function abrirNovoProcedimento() {
    setProcedimentoEditando(null);
    setNome('');
    setCategoria('');
    setValorPadrao('');
    setErro('');
    setModalAberto(true);
  }

  function abrirEditarProcedimento(item: any) {
    setProcedimentoEditando(item);
    setNome(item.nome || '');
    setCategoria(item.categoria || '');

    const valor = item.valor_padrao ?? item.valor ?? item.preco ?? 0;
    setValorPadrao(String(valor));

    setErro('');
    setModalAberto(true);
  }

  // Descobre a chave primária real do objeto (suporta id, procedimento_id, etc.)
  function obterIdProcedimento(item: any): number {
    return item.id || item.procedimento_id || item.id_procedimento || item._id;
  }

  async function handleExcluir(item: any) {
    const id = typeof item === 'object' ? obterIdProcedimento(item) : item;

    toast('Tem certeza que deseja excluir este procedimento?', {
  description: 'Esta ação não poderá ser desfeita.',
  action: {
    label: 'Sim, excluir',
    onClick: async () => {
      try {
        await excluirProcedimento(id);
        toast.success('Procedimento excluído com sucesso!');
        carregarProcedimentos();
      } catch (err: any) {
        toast.error(err.message || 'Erro ao excluir procedimento.');
      }
    },
  },
  cancel: {
    label: 'Cancelar',
    onClick: () => {},
  },
});
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');

    try {
      // Converte vírgula para ponto se houver e transforma em number
      const valorTratado = parseFloat(String(valorPadrao).replace(',', '.')) || 0;

      const payload = {
        nome,
        categoria,
        valor_padrao: valorTratado
      };

      if (procedimentoEditando) {
        const id = obterIdProcedimento(procedimentoEditando);
        if (!id) throw new Error('Identificador do procedimento não encontrado.');

        await atualizarProcedimento(id, payload);
      } else {
        await criarProcedimento(payload);
      }

      setModalAberto(false);
      setNome('');
      setCategoria('');
      setValorPadrao('');
      setProcedimentoEditando(null);
      carregarProcedimentos();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar procedimento.');
    }
  }

  function formatarMoeda(valor: number) {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor || 0);
  }

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Procedimentos & Serviços</h1>
            <p className="text-sm text-gray-500">Catálogo de serviços oferecidos pelo consultório</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              Voltar ao Painel
            </button>
            <button
              onClick={abrirNovoProcedimento}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              + Novo Procedimento
            </button>
          </div>
        </div>

        {/* Tabela de Procedimentos */}
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden flex flex-col">
          {carregando ? (
            <div className="p-8 text-center text-gray-500">Carregando procedimentos...</div>
          ) : procedimentos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum procedimento cadastrado.</div>
          ) : (
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-100 z-10">
                  <tr className="border-b text-sm font-semibold text-gray-600 uppercase">
                    <th className="p-4 bg-gray-100">ID</th>
                    <th className="p-4 bg-gray-100">Procedimento</th>
                    <th className="p-4 bg-gray-100">Categoria</th>
                    <th className="p-4 bg-gray-100">Valor Padrão</th>
                    <th className="p-4 bg-gray-100 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {procedimentos.map((p) => {
                    const idExibicao = obterIdProcedimento(p);
                    const valorExibicao = Number(p.valor_padrao ?? p.valor ?? 0);

                    return (
                      <tr key={idExibicao} className="hover:bg-gray-50 transition">
                        <td className="p-4 font-mono text-sm">{idExibicao}</td>
                        <td className="p-4 font-medium text-gray-900">{p.nome}</td>
                        <td className="p-4 text-gray-500">{p.categoria || '-'}</td>
                        <td className="p-4 font-bold text-emerald-600">{formatarMoeda(valorExibicao)}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => abrirEditarProcedimento(p)}
                              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-medium transition border border-gray-300 cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleExcluir(p)}
                              className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-xs font-medium transition border border-red-200 cursor-pointer"
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

        {/* Modal de Novo / Editar Procedimento */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full flex flex-col overflow-hidden">

              {/* Cabeçalho Fixo */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <h2 className="text-lg font-bold text-gray-800">
                  {procedimentoEditando ? 'Editar Procedimento' : 'Cadastro Procedimento'}
                </h2>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="text-gray-400 hover:text-gray-600 text-base font-bold p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Corpo do Formulário */}
              <form onSubmit={handleSalvar} className="flex flex-col">
                <div className="p-4 space-y-3">

                  {erro && (
                    <div className="p-2.5 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                      {erro}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Nome do Procedimento *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Toxina Botulínica (Botox)"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white shadow-sm cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Categoria</label>
                    <input
                      type="text"
                      placeholder="Ex: Injetáveis, Limpeza, Facial"
                      value={categoria}
                      onChange={(e) => setCategoria(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white shadow-sm cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Valor Padrão (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={valorPadrao}
                      onChange={(e) => setValorPadrao(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-xl text-gray-800 text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white shadow-sm font-mono cursor-pointer"
                    />
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-2">
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
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}