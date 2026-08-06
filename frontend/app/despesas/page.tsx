'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listarDespesas, criarDespesa, excluirDespesa } from '@/services/api';
import { toast } from 'sonner';

export default function DespesasPage() {
  const router = useRouter();

  const hoje = new Date();
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1);
  const [ano, setAno] = useState<number>(hoje.getFullYear());

  const [despesas, setDespesas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Estados do formulário de cadastro atualizados
  const [descricao, setDescricao] = useState('');
  const [tipoBase, setTipoBase] = useState('FIXO'); // 'FIXO', 'TOTAL', 'PIX', 'DEBITO', 'CREDITO'
  const [valor, setValor] = useState('');
  const [percentual, setPercentual] = useState('');
  const [data, setData] = useState(hoje.toISOString().split('T')[0]);
  const [salvando, setSalvando] = useState(false);

  const meses = [
    { valor: 1, nome: 'Janeiro' },
    { valor: 2, nome: 'Fevereiro' },
    { valor: 3, nome: 'Março' },
    { valor: 4, nome: 'Abril' },
    { valor: 5, nome: 'Maio' },
    { valor: 6, nome: 'Junho' },
    { valor: 7, nome: 'Julho' },
    { valor: 8, nome: 'Agosto' },
    { valor: 9, nome: 'Setembro' },
    { valor: 10, nome: 'Outubro' },
    { valor: 11, nome: 'Novembro' },
    { valor: 12, nome: 'Dezembro' },
  ];

  const anos = Array.from({ length: 5 }, (_, i) => hoje.getFullYear() - i);

  useEffect(() => {
    carregarDados();
  }, [mes, ano]);

  async function carregarDados() {
    setCarregando(true);
    try {
      const dados = await listarDespesas(mes, ano);
      setDespesas(Array.isArray(dados) ? dados : []);
    } catch (err: any) {
      if (err.message?.includes('Token') || err.message?.includes('Autenticação')) {
        router.push('/login');
        return;
      }
      console.error('Erro ao carregar despesas:', err);
      setDespesas([]);
    } finally {
      setCarregando(false);
    }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao || !data) return;

    setSalvando(true);
    try {
      await criarDespesa({
        descricao,
        valor: tipoBase === 'FIXO' ? Number(valor || 0) : 0,
        percentual: tipoBase !== 'FIXO' ? Number(percentual || 0) : 0,
        tipo_base: tipoBase,
        data,
        mes,
        ano
      });

      setDescricao('');
      setValor('');
      setPercentual('');
      setTipoBase('FIXO');
      toast.success('Despesa cadastrada com sucesso!');
      await carregarDados();
    } catch (err) {
      toast.error('Não foi possível cadastrar a despesa.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir(id: number) {
    if (!confirm('Deseja realmente excluir esta despesa?')) return;

    try {
      await excluirDespesa(id);
      toast.success('Despesa excluída com sucesso!');
      await carregarDados();
    } catch (err) {
      toast.error('Erro ao remover despesa.');
    }
  }

  function formatarMoeda(val: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  }

  const totalDespesas = despesas.reduce((acc, item) => acc + Number(item.valor || 0), 0);

  return (
    <div className="min-h-screen bg-transparent p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Despesas do Consultório</h1>
            <p className="text-sm text-gray-500 mt-0.5">Lançamento de custos fixos e taxas variáveis dinâmicas</p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition"
          >
            Voltar ao Painel
          </button>
        </div>

        {/* Formulário de Cadastro Atualizado */}
        <form onSubmit={handleSalvar} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Nova Despesa / Taxa</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Descrição</label>
              <input
                type="text"
                placeholder="Ex: Aluguel, Taxa de Crédito, Insumos"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-gray-50/50"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo de Cálculo</label>
              <select
                value={tipoBase}
                onChange={(e) => setTipoBase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-gray-50/50"
              >
                <option value="FIXO">Valor Fixo (R$)</option>
                <option value="CREDITO">% em cima do Crédito</option>
                <option value="DEBITO">% em cima do Débito</option>
                <option value="PIX">% em cima do PIX</option>
                <option value="TOTAL">% em cima do Bruto Total</option>
              </select>
            </div>

            {tipoBase === 'FIXO' ? (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-gray-50/50"
                />
              </div>
            ) : (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Porcentagem (%)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 5.00"
                  value={percentual}
                  onChange={(e) => setPercentual(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-gray-50/50"
                />
              </div>
            )}

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-gray-50/50"
              />
            </div>

            <div className="md:col-span-1 flex justify-end">
              <button
                type="submit"
                disabled={salvando}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm disabled:opacity-50"
              >
                {salvando ? '...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </form>

        {/* Filtros e Card de Total */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <span className="text-sm font-semibold text-gray-700">Período:</span>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none bg-white"
            >
              {meses.map((m) => (
                <option key={m.valor} value={m.valor}>{m.nome}</option>
              ))}
            </select>
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 outline-none bg-white"
            >
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div className="text-right w-full md:w-auto bg-rose-50/50 px-4 py-2 rounded-lg border border-rose-100 flex items-center justify-between md:justify-end gap-4">
            <span className="text-xs text-rose-700 font-bold uppercase tracking-wider">Total de Despesas:</span>
            <span className="text-xl font-extrabold text-rose-600">{formatarMoeda(totalDespesas)}</span>
          </div>
        </div>

        {/* Tabela de Listagem */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {carregando ? (
            <div className="p-12 text-center text-gray-500 text-sm">Carregando despesas...</div>
          ) : despesas.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">Nenhuma despesa cadastrada para este período.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/75 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="p-4">Descrição / Regra</th>
                    <th className="p-4">Data</th>
                    <th className="p-4 text-right">Valor Calculado</th>
                    <th className="p-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {despesas.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition">
                      <td className="p-4 font-medium text-gray-800">
                        {item.descricao}
                        {item.tipo_base && item.tipo_base !== 'FIXO' && (
                          <span className="ml-2 text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100">
                            {item.percentual}% sobre {item.tipo_base}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-500 text-xs">
                        {item.data ? new Date(item.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
                      </td>
                      <td className="p-4 text-right font-mono text-rose-600 font-semibold">
                        {formatarMoeda(Number(item.valor))}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => handleExcluir(item.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium transition bg-red-50 hover:bg-red-100 px-3 py-1 rounded-md"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}