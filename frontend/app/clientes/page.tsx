'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listarClientes, criarCliente, atualizarCliente, excluirCliente } from '@/services/api';
import { toast } from 'sonner';


// Máscaras e Formatação
function aplicarMascaraDocumento(valor: string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 14);
  if (digitos.length <= 11) {
    return digitos
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  return digitos
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

function aplicarMascaraCEP(valor: string) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
}

function aplicarMascaraTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11);
  if (digitos.length <= 10) {
    return digitos
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digitos
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export default function ClientesPage() {
  const router = useRouter();
  const [clientes, setClientes] = useState<any[]>([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [erro, setErro] = useState('');
  const [clienteEditando, setClienteEditando] = useState<any>(null);

  // Campos do Formulário Fiscal
  const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PF');
  const [documento, setDocumento] = useState(''); // CPF ou CNPJ
  const [nome, setNome] = useState(''); // Nome / Razão Social
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [rg, setRg] = useState('');
  const [ie, setIe] = useState('');
  const [im, setIm] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');

  // Endereço Fiscal
  const [cep, setCep] = useState('');
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  useEffect(() => {
    carregarClientes();
  }, []);

  async function carregarClientes(termo: string = '') {
    setCarregando(true);
    try {
      const data = await listarClientes(termo);
      setClientes(data);
    } catch (err: any) {
      if (err.message?.includes('Token')) {
        router.push('/login');
      }
    } finally {
      setCarregando(false);
    }
  }

  function handleBusca(e: React.FormEvent) {
    e.preventDefault();
    carregarClientes(busca);
  }

  // Monitora alterações de Documento para Alternar PF/PJ
  function handleDocumentoChange(v: string) {
    const docFormatado = aplicarMascaraDocumento(v);
    const numLimpo = v.replace(/\D/g, '');

    setDocumento(docFormatado);
    if (numLimpo.length > 11) {
      setTipoPessoa('PJ');
    } else {
      setTipoPessoa('PF');
    }
  }

  // Autocompletar Endereço via ViaCEP
  async function handleCepChange(v: string) {
    const cepFormatado = aplicarMascaraCEP(v);
    setCep(cepFormatado);

    const cepLimpo = v.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setLogradouro(data.logradouro || '');
          setBairro(data.bairro || '');
          setCidade(data.localidade || '');
          setEstado(data.uf || '');
        }
      } catch {
        // Silencioso em caso de falha de conexão na API do CEP
      } finally {
        setBuscandoCep(false);
      }
    }
  }

  function limparFormulario() {
    setClienteEditando(null);
    setTipoPessoa('PF');
    setDocumento('');
    setNome('');
    setNomeFantasia('');
    setRg('');
    setIe('');
    setIm('');
    setEmail('');
    setTelefone('');
    setCep('');
    setLogradouro('');
    setNumero('');
    setComplemento('');
    setBairro('');
    setCidade('');
    setEstado('');
    setErro('');
  }

  function abrirNovoCliente() {
    limparFormulario();
    setModalAberto(true);
  }

  function abrirEditarCliente(c: any) {
    limparFormulario();
    setClienteEditando(c);

    const doc = c.cnpj || c.cpf || c.documento || '';
    const numLimpo = doc.replace(/\D/g, '');

    setTipoPessoa(numLimpo.length > 11 ? 'PJ' : 'PF');
    setDocumento(aplicarMascaraDocumento(doc));
    setNome(c.nome || c.razao_social || '');
    setNomeFantasia(c.nome_fantasia || '');
    setRg(c.rg || '');
    setIe(c.ie || c.inscricao_estadual || '');
    setIm(c.im || c.inscricao_municipal || '');
    setEmail(c.email || '');
    setTelefone(c.telefone ? aplicarMascaraTelefone(c.telefone) : '');
    setCep(c.cep ? aplicarMascaraCEP(c.cep) : '');
    setLogradouro(c.logradouro || c.endereco || '');
    setNumero(c.numero || '');
    setComplemento(c.complemento || '');
    setBairro(c.bairro || '');
    setCidade(c.cidade || '');
    setEstado(c.estado || c.uf || '');

    setModalAberto(true);
  }

  async function handleExcluir(id: number) {
  toast('Tem certeza que deseja excluir este cliente?', {
    description: 'Esta ação não poderá ser desfeita.',
    action: {
      label: 'Sim, excluir',
      onClick: async () => {
        try {
          await excluirCliente(id);
          toast.success('Cliente excluído com sucesso!');
          carregarClientes(busca);
        } catch (err: any) {
          const mensagemErro = err.response?.data?.error || err.message || 'Erro ao excluir cliente.';
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

  async function handleSalvarCliente(e: React.FormEvent) {
    e.preventDefault();
    setErro('');

    const payload = {
      tipo_pessoa: tipoPessoa,
      cpf: tipoPessoa === 'PF' ? documento : null,
      cnpj: tipoPessoa === 'PJ' ? documento : null,
      documento,
      nome,
      razao_social: nome,
      nome_fantasia: tipoPessoa === 'PJ' ? nomeFantasia : null,
      rg: tipoPessoa === 'PF' ? rg : null,
      ie: tipoPessoa === 'PJ' ? ie : null,
      im: tipoPessoa === 'PJ' ? im : null,
      email,
      telefone,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      estado
    };

    try {
      if (clienteEditando) {
        await atualizarCliente(clienteEditando.id, payload);
      } else {
        await criarCliente(payload);
      }

      setModalAberto(false);
      limparFormulario();
      carregarClientes(busca);
    } catch (err: any) {
      setErro(err.message || 'Falha ao salvar dados do cliente.');
    }
  }

  return (
    <div className="min-h-screen bg-transparent p-6">
      <div className="max-w-6xl mx-auto">

        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Gestão de Clientes</h1>
            <p className="text-sm text-gray-500">Cadastre dados completos para atendimento e emissão de notas fiscais</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              Voltar ao Painel
            </button>
            <button
              onClick={abrirNovoCliente}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
            >
              + Novo Cliente
            </button>
          </div>
        </div>

        {/* Pesquisa */}
        <form onSubmit={handleBusca} className="mb-6 flex gap-2">
          <input
            type="text"
            placeholder="Buscar por Nome, Razão Social, CPF ou CNPJ..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-500 bg-white cursor-pointer"
          />
          <button
            type="submit"
            className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-lg text-sm transition font-medium cursor-pointer"
          >
            Buscar
          </button>
        </form>

        {/* Tabela de Clientes ok */}
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden flex flex-col">
          {carregando ? (
            <div className="p-8 text-center text-gray-500">Carregando clientes...</div>
          ) : clientes.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Nenhum cliente encontrado.</div>
          ) : (
            /* ADICIONADO: max-h e overflow-y-auto para o scroll ficar restrito à tabela */
            <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-260px)]">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-gray-100 z-10">
                  <tr className="border-b text-sm font-semibold text-gray-600 uppercase">
                    <th className="p-4 bg-gray-100">Tipo</th>
                    <th className="p-4 bg-gray-100">Nome / Razão Social</th>
                    <th className="p-4 bg-gray-100">CPF / CNPJ</th>
                    <th className="p-4 bg-gray-100">Telefone</th>
                    <th className="p-4 bg-gray-100">Cidade/UF</th>
                    <th className="p-4 bg-gray-100 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {clientes.map((c) => {
                    const docDisplay = c.cnpj || c.cpf || c.documento || '-';
                    return (
                      <tr key={c.id} className="hover:bg-gray-50 transition">
                        <td className="p-4 font-mono text-sm">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(c.tipo_pessoa || (docDisplay.length > 14 ? 'PJ' : 'PF')) === 'PJ'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                            }`}>
                            {c.tipo_pessoa || (docDisplay.length > 14 ? 'PJ' : 'PF')}
                          </span>
                        </td>
                        <td className="p-4 font-medium text-gray-900">
                          {c.nome || c.razao_social}
                          {c.nome_fantasia && <span className="block text-sm text-gray-400">{c.nome_fantasia}</span>}
                        </td>
                        <td className="p-4 font-mono text-sm">{docDisplay}</td>
                        <td className="p-4">{c.telefone || '-'}</td>
                        <td className="p-4">{c.cidade ? `${c.cidade}${c.estado ? `/${c.estado}` : ''}` : '-'}</td>
                        <td className="p-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => abrirEditarCliente(c)}
                              className="bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 px-3 py-1 rounded font-medium transition border border-gray-300 cursor-pointer"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleExcluir(c.id)}
                              className="bg-red-50 hover:bg-red-100 text-xs text-red-600 px-3 py-1 rounded font-medium transition border border-red-300 cursor-pointer"
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

        {/* Modal de Cadastro/Edição Fiscal */}
        {modalAberto && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden">

              {/* Cabeçalho Fixo */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {clienteEditando ? 'Editar Cliente' : 'Novo Cliente'}
                  </h2>
                  <p className="text-[11px] text-gray-500">Dados cadastrais e fiscais para emissão de nota</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalAberto(false)}
                  className="text-gray-400 hover:text-gray-600 text-base font-bold p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Form Compacto Sem Scroll */}
              <form onSubmit={handleSalvarCliente} className="flex flex-col">
                <div className="p-4 space-y-3">

                  {erro && (
                    <div className="p-2.5 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                      {erro}
                    </div>
                  )}

                  {/* Linha 1: Documento e Tipo (Compacto em linha) */}
                  <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-semibold text-gray-800">CPF ou CNPJ *</label>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-bold ${tipoPessoa === 'PJ' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'
                          }`}>
                          {tipoPessoa === 'PJ' ? 'Pessoa Jurídica (PJ)' : 'Pessoa Física (PF)'}
                        </span>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Digite o CPF ou CNPJ..."
                        value={documento}
                        onChange={(e) => handleDocumentoChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 border rounded-lg text-gray-800 font-mono text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white shadow-sm cursor-pointer"
                      />
                    </div>
                    <div className="w-1/2 pt-4">
                      <p className="text-[10px] text-gray-500 leading-tight">
                        * Alterna automaticamente entre PF/PJ ao digitar os números.
                      </p>
                    </div>
                  </div>

                  {/* Grid de 3 Colunas para Organizar os Campos sem Rolar */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                    {/* Coluna 1: Identificação Principal */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5">
                      <span className="text-sm font-bold text-gray-700 block border-b pb-1">👤 Identificação</span>

                      <div>
                        <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                          {tipoPessoa === 'PJ' ? 'Razão Social *' : 'Nome Completo *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                        />
                      </div>

                      {tipoPessoa === 'PJ' ? (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Nome Fantasia</label>
                            <input
                              type="text"
                              value={nomeFantasia}
                              onChange={(e) => setNomeFantasia(e.target.value)}
                              className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Inscr. Estadual</label>
                              <input
                                type="text"
                                placeholder="Isento ou nº"
                                value={ie}
                                onChange={(e) => setIe(e.target.value)}
                                className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Inscr. Municipal</label>
                              <input
                                type="text"
                                placeholder="Apenas nº"
                                value={im}
                                onChange={(e) => setIm(e.target.value)}
                                className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                              />
                            </div>
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">RG (Registro Geral)</label>
                          <input
                            type="text"
                            value={rg}
                            onChange={(e) => setRg(e.target.value)}
                            className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">E-mail (NF)</label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@..."
                            className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Telefone / WhatsApp</label>
                          <input
                            type="text"
                            value={telefone}
                            onChange={(e) => setTelefone(aplicarMascaraTelefone(e.target.value))}
                            placeholder="(00) 0000..."
                            className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Coluna 2: Endereço - Parte 1 (CEP, Rua, Número) */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <span className="text-sm font-bold text-gray-700 block border-b pb-1">📍 Endereço (Parte 1)</span>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">
                            CEP {buscandoCep && <span className="text-rose-500 animate-pulse text-[10px]">(Buscando...)</span>}
                          </label>
                          <input
                            type="text"
                            placeholder="00000-000"
                            value={cep}
                            onChange={(e) => handleCepChange(e.target.value)}
                            className="w-full px-2 py-1 border rounded-lg text-gray-800 font-mono focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Logradouro / Rua</label>
                          <input
                            type="text"
                            value={logradouro}
                            onChange={(e) => setLogradouro(e.target.value)}
                            className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Número</label>
                            <input
                              type="text"
                              placeholder="123 / S/N"
                              value={numero}
                              onChange={(e) => setNumero(e.target.value)}
                              className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">Complemento</label>
                            <input
                              type="text"
                              placeholder="Apto/Sala"
                              value={complemento}
                              onChange={(e) => setComplemento(e.target.value)}
                              className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coluna 3: Endereço - Parte 2 (Bairro, Cidade, UF) + Botões */}
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5 flex flex-col justify-between">
                      <div className="space-y-2.5">
                        <span className="text-sm font-bold text-gray-700 block border-b pb-1">📍 Endereço (Parte 2)</span>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Bairro</label>
                          <input
                            type="text"
                            value={bairro}
                            onChange={(e) => setBairro(e.target.value)}
                            className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Cidade</label>
                          <input
                            type="text"
                            value={cidade}
                            onChange={(e) => setCidade(e.target.value)}
                            className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Estado (UF)</label>
                          <input
                            type="text"
                            maxLength={2}
                            placeholder="PR"
                            value={estado}
                            onChange={(e) => setEstado(e.target.value.toUpperCase())}
                            className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm font-mono uppercase bg-white cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Botões de Ação integrados na terceira coluna para economizar espaço vertical */}
                      <div className="flex justify-end gap-1.5 pt-2 border-t border-gray-200">
                        <button
                          type="button"
                          onClick={() => setModalAberto(false)}
                          className="px-3 py-1.5 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-100 transition text-sm font-semibold shadow-sm cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition font-semibold text-sm shadow-md cursor-pointer"
                        >
                          Salvar Cliente
                        </button>
                      </div>
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