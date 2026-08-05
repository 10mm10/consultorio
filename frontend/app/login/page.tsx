'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginRequest, alterarSenhaObrigatoria } from '@/services/api';
import { toast } from 'sonner';


export default function LoginPage() {
  const router = useRouter();
  const [identificador, setIdentificador] = useState(''); // Aceita e-mail ou nome
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Estados para o Modal de Troca Obrigatória de Senha
  const [modalTrocaObrigatoria, setModalTrocaObrigatoria] = useState(false);
  const [userIdLogado, setUserIdLogado] = useState<number | null>(null);
  const [novaSenha, setNovaSenha] = useState('');
  const [erroSenhaModal, setErroSenhaModal] = useState('');
  const [carregandoSenha, setCarregandoSenha] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      // Envia o identificador (nome ou e-mail) para a API
      const data = await loginRequest(identificador, senha);

      // Verifica se o usuário precisa trocar a senha provisória no primeiro acesso
      if (data.usuario.must_change_password) {
        setUserIdLogado(data.usuario.id);
        // Salva o token temporariamente para autenticar a rota de troca de senha
        localStorage.setItem('@consultorio:token', data.token);
        setModalTrocaObrigatoria(true);
      } else {
        // Salva o token e dados normais do usuário no navegador
        localStorage.setItem('@consultorio:token', data.token);
        localStorage.setItem('@consultorio:user', JSON.stringify(data.usuario));

        // Redireciona para o painel principal
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErro(err.message || 'Falha ao autenticar.');
    } finally {
      setCarregando(false);
    }
  }

  // Função para validar e salvar a nova senha definitiva
  async function handleSalvarNovaSenha(e: React.FormEvent) {
  e.preventDefault();
  setErroSenhaModal('');

  const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
  if (!regex.test(novaSenha)) {
    setErroSenhaModal('A senha deve ter no mínimo 8 caracteres, contendo pelo menos uma letra maiúscula e um símbolo.');
    return;
  }

  try {
    setCarregandoSenha(true);
    await alterarSenhaObrigatoria(userIdLogado!, novaSenha);
    
    // 💡 SOLUÇÃO: Como alterou com sucesso, salvamos o usuário no storage antes de entrar
    // Se o backend já tinha te retornado no login anterior, podemos guardar o nome ou buscar/montar o objeto básico
    const usuarioAtual = {
      id: userIdLogado,
      nome: identificador, // ou o nome que veio na resposta do login
      must_change_password: false
    };
    
    // Garantimos que o storage tenha os dados para o dashboard ler o nome
    localStorage.setItem('@consultorio:user', JSON.stringify(usuarioAtual));

    toast.success('Senha alterada com sucesso! Bem-vindo ao sistema.');
    setModalTrocaObrigatoria(false);

    router.push('/dashboard');
  } catch (err: any) {
    setErroSenhaModal(err.message || 'Erro ao alterar senha.');
  } finally {
    setCarregandoSenha(false);
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent">
      
      {/* Container do formulário com efeito de vidro translúcido (backdrop-blur) */}
      <div className="max-w-md w-full bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 border border-white/50 relative z-10">
        
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Ms Serviços Médicos</h1>
          <p className="text-sm text-gray-500 mt-1">Acesse sua conta para continuar</p>
        </div>

        {erro && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-lg">
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">E-mail ou Nome de Usuário</label>
            <input
              type="text"
              required
              value={identificador}
              onChange={(e) => setIdentificador(e.target.value)}
              placeholder="Digite seu e-mail ou nome"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-gray-800 text-xs bg-white/90 shadow-sm transition"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-semibold text-gray-700">Senha</label>
              {/* Botão de Esqueci a Senha integrado com seus dados de contato */}
              <button
                type="button"
                onClick={() => toast.success('Entre em contato para redefinir sua senha: (41) 99761-8970 - Moisés Pimentel')}
                className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
              >
                Esqueceu a senha?
              </button>
            </div>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:border-rose-500 outline-none text-gray-800 text-xs bg-white/90 shadow-sm transition"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 rounded-xl transition duration-200 disabled:opacity-50 text-xs shadow-md cursor-pointer"
          >
            {carregando ? 'Entrando...' : 'Entrar no Sistema'}
          </button>
        </form>

      </div>

      {/* Modal de Troca Obrigatória de Senha Provisória */}
      {modalTrocaObrigatoria && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-gray-100">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Redefinição de Senha Obrigatória</h2>
              <p className="text-xs text-gray-500 mt-1">
                Você entrou com uma senha provisória. Por segurança, crie uma nova senha definitiva antes de prosseguir.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs space-y-1">
              <p className="font-semibold">Requisitos da nova senha:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                <li>Mínimo de 8 caracteres</li>
                <li>Pelo menos uma letra maiúscula</li>
                <li>Pelo menos um símbolo (ex: @, #, $, !, etc.)</li>
              </ul>
            </div>

            <form onSubmit={handleSalvarNovaSenha} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Nova Senha Definitiva</label>
                <input
                  type="password"
                  required
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  placeholder="Ex: Senha@123"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              {erroSenhaModal && (
                <div className="p-2.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-lg">
                  {erroSenhaModal}
                </div>
              )}

              <button
                type="submit"
                disabled={carregandoSenha}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl text-xs font-semibold transition cursor-pointer shadow-md disabled:opacity-50"
              >
                {carregandoSenha ? 'Salvando...' : 'Salvar Nova Senha e Entrar'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}