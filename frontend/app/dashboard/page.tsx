'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { obterResumoDashboard, listarClientes, listarAtendimentos } from '@/services/api';
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const [dados, setDados] = useState<any>(null);
  const [totalClientesReal, setTotalClientesReal] = useState<number>(0);
  const [totalProcedimentosReal, setTotalProcedimentosReal] = useState<number>(0);
  const [listaProcedimentosContagem, setListaProcedimentosContagem] = useState<{ nome: string; total: number }[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [nomeUsuario, setNomeUsuario] = useState('');

  useEffect(() => {
    const userStorage = localStorage.getItem('@consultorio:user');
    if (userStorage) {
      try {
        const usuario = JSON.parse(userStorage);
        if (usuario.perfil === 'ADMIN') {
          setIsAdmin(true);
        }
        if (usuario.nome) {
          setNomeUsuario(usuario.nome);
        }
      } catch (e) {
        console.error("Erro ao ler usuário do localStorage", e);
      }
    }

    carregarDadosDashboard();
  }, []);

  async function carregarDadosDashboard() {
    try {
      const [resumo, clientesRes, atendimentosRes]: any = await Promise.all([
        obterResumoDashboard(),
        listarClientes().catch(() => []),
        listarAtendimentos().catch(() => [])
      ]);

      setDados(resumo);

      const listaAtendimentosBruta = Array.isArray(atendimentosRes)
        ? atendimentosRes
        : (Array.isArray(atendimentosRes?.data) ? atendimentosRes.data : []);

      // Descobre o mês e ano atuais
      const dataAtual = new Date();
      const mesAtual = dataAtual.getMonth() + 1; // 1 a 12
      const anoAtual = dataAtual.getFullYear();

      // Filtra estritamente pelo mês/ano correntes e apenas com situação 'FINALIZADO'
      const listaAtendimentos = listaAtendimentosBruta.filter((atend: any) => {
        if (!atend.data_atendimento) return false;
        
        const dataStr = String(atend.data_atendimento);
        const anoAtend = Number(dataStr.substring(0, 4));
        const mesAtend = Number(dataStr.substring(5, 7));

        const eMesAtual = anoAtend === anoAtual && mesAtend === mesAtual;
        const eFinalizado = String(atend.situacao).toUpperCase() === 'FINALIZADO';

        return eMesAtual && eFinalizado;
      });

      // Conjunto para contar clientes únicos que tiveram atendimento finalizado no mês
      const clientesUnicosMes = new Set();
      let totalProcsGeral = 0;
      const contagemMap: { [key: string]: number } = {};

      listaAtendimentos.forEach((item: any) => {
        if (item.cliente_id) {
          clientesUnicosMes.add(item.cliente_id);
        }

        const procs = item.procedimentos || item.itens || (item.nome_procedimento ? [item.nome_procedimento] : []);

        if (Array.isArray(procs) && procs.length > 0) {
          procs.forEach((p: any) => {
            const nomeProc = typeof p === 'string' ? p : (p.nome || p.procedimento_nome || 'Procedimento');
            contagemMap[nomeProc] = (contagemMap[nomeProc] || 0) + 1;
            totalProcsGeral++;
          });
        } else {
          const nomeUnico = item.procedimento || item.nome_procedimento || 'Procedimento Geral';
          contagemMap[nomeUnico] = (contagemMap[nomeUnico] || 0) + 1;
          totalProcsGeral++;
        }
      });

      // Atualiza os estados com os valores calculados exclusivamente para os finalizados do mês atual
      setTotalClientesReal(clientesUnicosMes.size);
      setTotalProcedimentosReal(totalProcsGeral > 0 ? totalProcsGeral : 0);

      const arrayContagem = Object.keys(contagemMap).map(nome => ({
        nome,
        total: contagemMap[nome]
      })).sort((a, b) => b.total - a.total);

      setListaProcedimentosContagem(arrayContagem);

    } catch (err: any) {
      if (err.message?.includes('Token') || err.message?.includes('Autenticação')) {
        router.push('/login');
      }
    } finally {
      setCarregando(false);
    }
  }

  // Função para limpar dados de acesso e sair
  function handleLogout() {
    localStorage.removeItem('@consultorio:token');
    localStorage.removeItem('@consultorio:user');
    router.push('/login');
  }

  const modulos = [
    { titulo: 'Atendimentos', desc: 'Registros e caixa diário', rota: '/atendimentos', icone: '💳', corHover: 'hover:border-rose-200', bgIcon: 'bg-rose-100 text-rose-600', bgCircle: 'bg-rose-50' },
    { titulo: 'Clientes', desc: 'Pacientes', rota: '/clientes', icone: '👤', corHover: 'hover:border-blue-200', bgIcon: 'bg-blue-100 text-blue-600', bgCircle: 'bg-blue-50' },
    { titulo: 'Procedimentos', desc: 'Catálogo de serviços', rota: '/procedimentos', icone: '✨', corHover: 'hover:border-purple-200', bgIcon: 'bg-purple-100 text-purple-600', bgCircle: 'bg-purple-50' },
    { titulo: 'Profissionais', desc: 'Equipe', rota: '/profissionais', icone: '🩺', corHover: 'hover:border-emerald-200', bgIcon: 'bg-emerald-100 text-emerald-600', bgCircle: 'bg-emerald-50' },
    { titulo: 'Financeiro', desc: 'Caixa e despesas', rota: '/financeiro', icone: '📊', corHover: 'hover:border-amber-200', bgIcon: 'bg-amber-100 text-amber-600', bgCircle: 'bg-amber-50' },
  ];

  const metricas = dados?.metricas || dados || {};
  const totalAtendimentos = metricas.total_atendimentos ?? 0;

  return (
    <div className="min-h-screen bg-transparent p-6 md:p-10">
      <div className="max-w-6xl mx-auto">

        {/* Topo / Header Minimalista com Nome do Usuário e Botão de Sair */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">MS Serviços Médicos</h1>
            <p className="text-sm text-gray-500">Dashboard Operacional</p>
            
            {isAdmin && (
              <Link
                href="/configuracoes/usuarios"
                className="mt-2 inline-flex bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-xs font-semibold transition border border-gray-200 items-center gap-2 cursor-pointer"
              >
                ⚙️ Configurações de Usuários
              </Link>
            )}
          </div>

          {/* Nome do usuário e Botão de Sair integrados */}
          <div className="flex items-center gap-3">
            {nomeUsuario && (
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                Olá, <strong className="text-rose-600">{nomeUsuario}</strong>
              </span>
            )}

            <button
              onClick={handleLogout}
              className="mt-2 sm:mt-0 inline-flex bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-semibold transition border border-gray-200 items-center gap-2 cursor-pointer shadow-xs"
              title="Sair do sistema"
            >
              🚪 Sair
            </button>
          </div>
        </div>

        {/* Grid Principal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Coluna Esquerda: Resumo */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-6">
              <div>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Resumo do Mês</h2>
                <p className="text-xs text-gray-400 mt-1">fluxo de atendimento do mês.</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">📅</div>
                    <span className="text-sm font-medium text-gray-700">Total de Atendimentos</span>
                  </div>
                  <span className="text-xl font-black text-gray-900">
                    {carregando ? '...' : totalAtendimentos}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/70 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">👥</div>
                    <span className="text-sm font-medium text-gray-700">Clientes Atendidos</span>
                  </div>
                  <span className="text-xl font-black text-gray-900">
                    {carregando ? '...' : totalClientesReal}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">✨</div>
                      <span className="text-sm font-medium text-gray-700">Procedimentos Aplicados</span>
                    </div>
                    <span className="text-xl font-black text-gray-900">
                      {carregando ? '...' : totalProcedimentosReal}
                    </span>
                  </div>

                  {!carregando && listaProcedimentosContagem.length > 0 && (
                    <div className="pt-2 border-t border-gray-200/60 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                      {listaProcedimentosContagem.map((proc, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 truncate max-w-[180px]" title={proc.nome}>
                            • {proc.nome}
                          </span>
                          <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                            {proc.total}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>

          {/* Coluna Direita: Módulos */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-6">
              <div>
                <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Módulos do Sistema</h2>
                <p className="text-xs text-gray-400 mt-1">Selecione o serviço que deseja gerenciar.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {modulos.map((m, idx) => (
                  <div
                    key={idx}
                    onClick={() => router.push(m.rota)}
                    className={`bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group ${m.corHover} transition-all cursor-pointer`}
                  >
                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${m.bgCircle} rounded-full group-hover:scale-125 transition-transform`}></div>
                    <div className="relative z-10 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl ${m.bgIcon} flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform shadow-xs`}>
                        {m.icone}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-bold text-slate-900 text-sm group-hover:translate-x-0.5 transition-transform">{m.titulo}</h3>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{m.desc}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}