'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listarUsuarios, criarUsuario, atualizarUsuario, excluirUsuario } from '@/services/api';
import { toast } from 'sonner';

export default function GerenciarUsuariosPage() {
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  // Estados dos modais e formulários
  const [modalAberto, setModalAberto] = useState(false);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [usuarioIdSelecionado, setUsuarioIdSelecionado] = useState<number | null>(null);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [perfil, setPerfil] = useState('RECEPCAO');

  useEffect(() => {
    carregarUsuarios();
  }, []);

  async function carregarUsuarios() {
    try {
      setCarregando(true);
      const data = await listarUsuarios();
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar usuários', err);
    } finally {
      setCarregando(false);
    }
  }

  function abrirModalCadastro() {
    setModoEdicao(false);
    setUsuarioIdSelecionado(null);
    setNome('');
    setEmail('');
    setSenha('');
    setPerfil('RECEPCAO');
    setModalAberto(true);
  }

  function abrirModalEdicao(usuario: any) {
    setModoEdicao(true);
    setUsuarioIdSelecionado(usuario.id);
    setNome(usuario.nome);
    setEmail(usuario.email);
    setPerfil(usuario.perfil);
    setSenha(''); // Deixa vazio para alterar apenas se necessário (senha provisória)
    setModalAberto(true);
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (modoEdicao && usuarioIdSelecionado) {
        await atualizarUsuario(usuarioIdSelecionado, { nome, email, perfil, novaSenha: senha || undefined });
        toast.success('Usuário atualizado com sucesso!');
      } else {
        await criarUsuario({ nome, email, senha, perfil });
        toast.success('Usuário cadastrado com sucesso!');
      }
      setModalAberto(false);
      carregarUsuarios();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar usuário.');
    }
  }

  async function handleExcluir(id: number) {
  toast('Tem certeza que deseja excluir este usuário?', {
    description: 'Esta ação não poderá ser desfeita.',
    action: {
      label: 'Sim, excluir',
      onClick: async () => {
        try {
          await excluirUsuario(id);
          toast.success('Usuário excluído com sucesso!');
          carregarUsuarios();
        } catch (err: any) {
          const mensagemErro = err.response?.data?.error || err.message || 'Erro ao excluir usuário.';
          toast.error(mensagemErro);
        }
      },
    },
    cancel: {
      label: 'Cancelar',
      onClick: () => {},
    },
  });
}

  return (
    <div className="min-h-screen bg-transparent p-6 md:p-10">
      <div className="max-w-4xl mx-auto bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">

        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Gerenciamento de Usuários</h1>
            <p className="text-sm text-gray-600">Cadastre, redefina senhas provisórias ou remova acessos.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              Voltar
            </button>
            <button
              onClick={abrirModalCadastro}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer shadow-md"
            >
              + Novo Usuário
            </button>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase">
                <th className="py-3 px-4">Nome</th>
                <th className="py-3 px-4">E-mail</th>
                <th className="py-3 px-4">Perfil</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {carregando ? (
                <tr><td colSpan={4} className="py-4 text-center text-gray-400">Carregando...</td></tr>
              ) : usuarios.length === 0 ? (
                <tr><td colSpan={4} className="py-4 text-center text-gray-400">Nenhum usuário cadastrado.</td></tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-4 font-medium text-gray-800">{u.nome}</td>
                    <td className="py-3 px-4 text-gray-600">{u.email}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${u.perfil === 'ADMIN' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                        {u.perfil}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => abrirModalEdicao(u)}
                        className="bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 px-3 py-1 rounded font-medium transition border border-gray-300 cursor-pointer"
                      >
                        Editar / Senha Prov.
                      </button>
                      <button
                        onClick={() => handleExcluir(u.id)}
                        className="bg-red-50 hover:bg-red-100 text-xs text-red-600 px-3 py-1 rounded font-medium transition border border-red-300 cursor-pointer"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Modal de Cadastro / Edição */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-xl space-y-5 border border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {modoEdicao ? 'Editar Usuário / Senha Provisória' : 'Cadastrar Novo Usuário'}
              </h2>

              <form onSubmit={handleSalvar} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    {modoEdicao ? 'Nova Senha / Senha Provisória (Deixe em branco para não alterar)' : 'Senha Provisória'}
                  </label>
                  <input
                    type="password"
                    {...(!modoEdicao ? { required: true } : {})}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Perfil</label>
                  <select
                    value={perfil}
                    onChange={(e) => setPerfil(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500 bg-white"
                  >
                    <option value="RECEPCAO">Recepção / Usuário Padrão</option>
                    <option value="MEDICO">Médico</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalAberto(false)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer shadow-md"
                  >
                    Salvar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}