'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { obterResumoFinanceiro } from '@/services/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function FinanceiroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [dados, setDados] = useState<any>(null);

  const [ano, setAno] = useState<number>(new Date().getFullYear());
  const [mes, setMes] = useState<number>(new Date().getMonth() + 1);
  const [tipoFiltro, setTipoFiltro] = useState<'mes' | 'ano'>('mes');

  const meses = [
    { valor: 1, nome: 'Janeiro' }, { valor: 2, nome: 'Fevereiro' },
    { valor: 3, nome: 'Março' }, { valor: 4, nome: 'Abril' },
    { valor: 5, nome: 'Maio' }, { valor: 6, nome: 'Junho' },
    { valor: 7, nome: 'Julho' }, { valor: 8, nome: 'Agosto' },
    { valor: 9, nome: 'Setembro' }, { valor: 10, nome: 'Outubro' },
    { valor: 11, nome: 'Novembro' }, { valor: 12, nome: 'Dezembro' }
  ];

  useEffect(() => {
    carregarDados();
  }, [mes, ano, tipoFiltro]);

  async function carregarDados() {
    try {
      setLoading(true);
      const res = await obterResumoFinanceiro(mes, ano, tipoFiltro);
      setDados(res);
      setErro('');
    } catch (err: any) {
      if (err.message?.includes('Token')) {
        router.push('/login');
      } else {
        setErro(err.message || 'Erro ao carregar dados financeiros.');
      }
    } finally {
      setLoading(false);
    }
  }

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 bg-transparent">

      {/* HEADER EXECUTIVO & BOTÃO DE RELATÓRIO EM DESTAQUE */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div>
           <h1 className="text-2xl font-bold text-gray-800">Dashboard Financeiro</h1>
          <p className="text-sm text-slate-500">Dashboard de faturamento e fechamento mensal</p>
        </div>

        {/* FILTROS + BOTÃO DE RELATÓRIO OBRIGATÓRIO */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
          >
            Voltar ao Painel
          </button>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl">

            <button
              onClick={() => setTipoFiltro('mes')}
              className={`cursor-pointer px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${tipoFiltro === 'mes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Mensal
            </button>
            <button
              onClick={() => setTipoFiltro('ano')}
              className={`cursor-pointer px-3 py-1.5 text-sm font-semibold rounded-lg transition-all ${tipoFiltro === 'ano' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Anual
            </button>
          </div>

          {tipoFiltro === 'mes' && (
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="cursor-pointer bg-slate-100 border-none text-slate-700 text-sm font-semibold rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {meses.map((m) => (
                <option key={m.valor} value={m.valor}>{m.nome}</option>
              ))}
            </select>
          )}

          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="cursor-pointer bg-slate-100 border-none text-slate-700 text-sm font-semibold rounded-xl px-3 py-2.5 focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value={2025}>2025</option>
            <option value={2026}>2026</option>
            <option value={2027}>2027</option>
          </select>

          {/* O BOTÃO DE RELATÓRIO COM NAVEGAÇÃO /RELATORIOS */}
          <button
            onClick={() => router.push('/relatorios')}
            className=" cursor-pointer flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 cursor-pointer"
          >
            <svg className=" cursor-pointer w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span> Relatórios/Fechamentos</span>
          </button>
        </div>
      </div>

      {erro && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-sm">
          {erro}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-3xl"></div>
          ))}
        </div>
      ) : (
        <>
          {/* KPI CARDS MODERNOS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-125 transition-transform"></div>
              <div className="relative z-10">
                <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Total Faturado</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{formatarMoeda(dados?.metricas?.total_faturado || 0)}</h3>
                <div className="flex items-center gap-1 text-emerald-600 text-sm font-bold mt-1">
                  <span>Liquidado no período</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-all">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-50 rounded-full group-hover:scale-125 transition-transform"></div>
              <div className="relative z-10">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Valores Pendentes</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{formatarMoeda(dados?.metricas?.total_pendente || 0)}</h3>
                <span className="inline-block text-amber-600 text-sm font-bold mt-1">Cliente Pendente</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-indigo-50 rounded-full group-hover:scale-125 transition-transform"></div>
              <div className="relative z-10">
                <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Atendimentos Realizados</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{dados?.metricas?.total_atendimentos || 0}</h3>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-purple-200 transition-all">
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-purple-50 rounded-full group-hover:scale-125 transition-transform"></div>
              <div className="relative z-10">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-3">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                </div>
                <span className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Comissão de Venda</span>
                <h3 className="text-xl font-black text-slate-900 mt-1">{formatarMoeda(dados?.metricas?.total_comissoes_venda || 0)}</h3>
                <span className="inline-block text-purple-600 text-sm font-bold mt-1">Repasses de vendas calculados</span>
              </div>
            </div>

          </div>

          {/* SEÇÃO PRINCIPAL DE GRÁFICOS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* GRÁFICO DE ÁREA - CURVA DE FATURAMENTO (Altura reduzida para 200px) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Curva de Faturamento</h2>
                  <p className="text-sm text-slate-400">Comportamento temporal da receita no período</p>
                </div>
                <span className="text-sm font-semibold bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full">Tempo Real</span>
              </div>

              <div style={{ width: '100%', height: '200px' }} className="mt-1">
                {(!dados?.evolucao || dados.evolucao.length === 0) ? (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    Nenhum registro temporal encontrado para este intervalo.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={dados.evolucao.map((item: any) => ({
                        periodo: tipoFiltro === 'ano'
                          ? (meses.find(m => m.valor === Number(item.periodo))?.nome.substring(0, 3) || `Mês ${item.periodo}`)
                          : `Dia ${item.periodo}`,
                        faturamento: Number(item.total || 0)
                      }))}
                      margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorFaturamentoAlt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                      <XAxis dataKey="periodo" stroke="#94A3B8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(val) => `R$ ${val}`} />
                      <Tooltip formatter={(val: any) => [formatarMoeda(Number(val)), 'Faturamento']} />
                      <Area type="monotone" dataKey="faturamento" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorFaturamentoAlt)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* DISTRIBUIÇÃO POR FORMA DE PAGAMENTO (Espaçamento interno menor) */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Formas de Pagamento</h2>
                <p className="text-sm text-slate-400 mb-2">Composição de recebimento por canal</p>
              </div>

              <div className="space-y-2 my-auto">
                {(!dados?.faturamentoPorForma || dados.faturamentoPorForma.length === 0) ? (
                  <div className="text-center text-slate-400 text-sm py-6">Sem dados de pagamento.</div>
                ) : (
                  dados.faturamentoPorForma.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                        <span className="text-sm font-bold text-slate-700">{item.forma_pagamento || 'Outros'}</span>
                      </div>
                      <span className="text-sm font-extrabold text-slate-900">{formatarMoeda(Number(item.total || 0))}</span>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 text-center">
                <span className="text-[11px] text-slate-400">Dados consolidados do caixa operacional</span>
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}