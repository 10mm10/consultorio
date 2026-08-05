'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listarProfissionais, criarProfissional, atualizarProfissional, excluirProfissional } from '@/services/api';
import { toast } from 'sonner';

export default function ProfissionaisPage() {
    const router = useRouter();
    const [profissionais, setProfissionais] = useState<any[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [modalAberto, setModalAberto] = useState(false);
    const [erro, setErro] = useState('');
    const [profissionalEditando, setProfissionalEditando] = useState<any>(null);

    // Estados do Formulário
    const [tipoPessoa, setTipoPessoa] = useState<'PF' | 'PJ'>('PF');
    const [documento, setDocumento] = useState('');
    const [nome, setNome] = useState('');
    const [especialidade, setEspecialidade] = useState('');
    const [crmCrbm, setCrmCrbm] = useState('');
    const [email, setEmail] = useState('');
    const [telefone, setTelefone] = useState('');
    
    // Estados de Endereço
    const [cep, setCep] = useState('');
    const [logradouro, setLogradouro] = useState('');
    const [numero, setNumero] = useState('');
    const [complemento, setComplemento] = useState('');
    const [bairro, setBairro] = useState('');
    const [cidade, setCidade] = useState('');
    const [estado, setEstado] = useState('');
    const [buscandoCep, setBuscandoCep] = useState(false);

    useEffect(() => {
        carregarProfissionais();
    }, []);

    async function carregarProfissionais() {
        setCarregando(true);
        try {
            const data = await listarProfissionais();
            setProfissionais(data);
        } catch (err: any) {
            if (err.message?.includes('Token')) router.push('/login');
        } finally {
            setCarregando(false);
        }
    }

    // Máscaras e Formatações
    function aplicarMascaraCpfCnpj(valor: string) {
        const limpo = valor.replace(/\D/g, '');
        if (limpo.length <= 11) {
            setTipoPessoa('PF');
            return limpo
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d)/, '$1.$2')
                .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            setTipoPessoa('PJ');
            return limpo
                .substring(0, 14)
                .replace(/^(\d{2})(\d)/, '$1.$2')
                .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                .replace(/\.(\d{3})(\d)/, '.$1/$2')
                .replace(/(\d{4})(\d)/, '$1-$2');
        }
    }

    function aplicarMascaraTelefone(valor: string) {
        const limpo = valor.replace(/\D/g, '').substring(0, 11);
        if (limpo.length > 10) {
            return limpo.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (limpo.length > 6) {
            return limpo.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
        } else if (limpo.length > 2) {
            return limpo.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
        }
        return limpo;
    }

    function aplicarMascaraCep(valor: string) {
        const limpo = valor.replace(/\D/g, '').substring(0, 8);
        return limpo.replace(/^(\d{5})(\d{1,3})/, '$1-$2');
    }

    function handleDocumentoChange(valor: string) {
        const formatado = aplicarMascaraCpfCnpj(valor);
        setDocumento(formatado);
    }

    async function handleCepChange(valor: string) {
        const formatado = aplicarMascaraCep(valor);
        setCep(formatado);

        const limpo = formatado.replace(/\D/g, '');
        if (limpo.length === 8) {
            setBuscandoCep(true);
            try {
                const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
                const dados = await res.json();
                if (!dados.erro) {
                    setLogradouro(dados.logradouro || '');
                    setBairro(dados.bairro || '');
                    setCidade(dados.localidade || '');
                    setEstado(dados.uf || '');
                }
            } catch (err) {
                console.error('Erro ao buscar CEP:', err);
            } finally {
                setBuscandoCep(false);
            }
        }
    }

    function abrirNovoProfissional() {
        setProfissionalEditando(null);
        setTipoPessoa('PF');
        setDocumento('');
        setNome('');
        setEspecialidade('');
        setCrmCrbm('');
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
        setModalAberto(true);
    }

    function abrirEditarProfissional(p: any) {
        setProfissionalEditando(p);
        const docSalvo = p.cpf || p.documento || '';
        setDocumento(aplicarMascaraCpfCnpj(docSalvo));
        setNome(p.nome || '');
        setEspecialidade(p.especialidade || '');
        setCrmCrbm(p.registro_profissional || p.crm_crbm || '');
        setEmail(p.email || '');
        setTelefone(aplicarMascaraTelefone(p.telefone || ''));
        setCep(aplicarMascaraCep(p.cep || ''));
        setLogradouro(p.logradouro || '');
        setNumero(p.numero || '');
        setComplemento(p.complemento || '');
        setBairro(p.bairro || '');
        setCidade(p.cidade || '');
        setEstado(p.estado || '');
        setErro('');
        setModalAberto(true);
    }

    async function handleExcluir(id: number) {
        if (confirm('Tem certeza que deseja excluir este profissional?')) {
            try {
                await excluirProfissional(id);
                carregarProfissionais();
            } catch (err: any) {
                toast.error(err.message || 'Erro ao excluir profissional.');
            }
        }
    }

    async function handleSalvar(e: React.FormEvent) {
        e.preventDefault();
        setErro('');

        const payload = {
            nome,
            tipo_pessoa: tipoPessoa,
            cpf: tipoPessoa === 'PF' ? documento : null,
            cnpj: tipoPessoa === 'PJ' ? documento : null,
            especialidade,
            crm_crbm: crmCrbm,
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
            if (profissionalEditando) {
                await atualizarProfissional(profissionalEditando.id, payload);
            } else {
                await criarProfissional(payload);
            }

            setModalAberto(false);
            carregarProfissionais();
        } catch (err: any) {
            setErro(err.message || 'Erro ao salvar profissional.');
        }
    }

    return (
        <div className="min-h-screen bg-transparent p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">Profissionais</h1>
                        <p className="text-sm text-gray-500">Cadastro de profissionais do consultório</p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
                        >
                            Voltar ao Painel
                        </button>
                        <button
                            onClick={abrirNovoProfissional}
                            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition cursor-pointer"
                        >
                            + Novo Profissional
                        </button>
                    </div>
                </div>

                {/* Tabela de Profissionais */}
                <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden flex flex-col">
                    {carregando ? (
                        <div className="p-8 text-center text-gray-500">Carregando profissionais...</div>
                    ) : profissionais.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Nenhum profissional cadastrado.</div>
                    ) : (
                        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-gray-100 z-10">
                                    <tr className="border-b text-sm font-semibold text-gray-600 uppercase">
                                        <th className="p-4 bg-gray-100">ID</th>
                                        <th className="p-4 bg-gray-100">Nome</th>
                                        <th className="p-4 bg-gray-100">Especialidade</th>
                                        <th className="p-4 bg-gray-100">Registro (CRM/CRBM)</th>
                                        <th className="p-4 bg-gray-100">Documento</th>
                                        <th className="p-4 bg-gray-100 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                                    {profissionais.map((p) => (
                                        <tr key={p.id} className="hover:bg-gray-50 transition">
                                            <td className="p-4 font-mono text-sm">{p.id}</td>
                                            <td className="p-4 font-medium text-gray-900">{p.nome}</td>
                                            <td className="p-4">{p.especialidade || '-'}</td>
                                            <td className="p-4 font-mono text-sm">{p.registro_profissional || p.crm_crbm || '-'}</td>
                                            <td className="p-4">{p.cpf || p.cnpj || '-'}</td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => abrirEditarProfissional(p)}
                                                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs font-medium transition border border-gray-300 cursor-pointer"
                                                    >
                                                        Editar
                                                    </button>
                                                    <button
                                                        onClick={() => handleExcluir(p.id)}
                                                        className="bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1 rounded text-xs font-medium transition border border-red-200 cursor-pointer"
                                                    >
                                                        Excluir
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

                {/* Modal de Cadastro/Edição Profissional */}
                {modalAberto && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden">

                            {/* Cabeçalho Fixo */}
                            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800">
                                        {profissionalEditando ? 'Editar Profissional' : 'Novo Profissional'}
                                    </h2>
                                    <p className="text-[11px] text-gray-500">Dados cadastrais e profissionais</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setModalAberto(false)}
                                    className="text-gray-400 hover:text-gray-600 text-base font-bold p-1 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                                >
                                    ✕
                                </button>
                            </div>

                            {/* Form Compacto */}
                            <form onSubmit={handleSalvar} className="flex flex-col">
                                <div className="p-4 space-y-3">

                                    {erro && (
                                        <div className="p-2.5 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                            {erro}
                                        </div>
                                    )}

                                    {/* Linha 1: Documento e Tipo */}
                                    <div className="bg-rose-50/50 p-3 rounded-xl border border-rose-100 flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center mb-1">
                                                <label className="block text-sm font-semibold text-gray-800">CPF ou CNPJ *</label>
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${tipoPessoa === 'PJ' ? 'bg-purple-600 text-white' : 'bg-blue-600 text-white'}`}>
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

                                    {/* Grid de 3 Colunas */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

                                        {/* Coluna 1: Identificação Principal e Profissional */}
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2.5">
                                            <span className="text-sm font-bold text-gray-700 block border-b pb-1">👤 Identificação & Profissional</span>

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

                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">Especialidade</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Dermatologista, Biomédica"
                                                    value={especialidade}
                                                    onChange={(e) => setEspecialidade(e.target.value)}
                                                    className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[11px] font-semibold text-gray-600 mb-0.5">CRM / CRBM / Registro</label>
                                                <input
                                                    type="text"
                                                    placeholder="Ex: CRM/PR 12345"
                                                    value={crmCrbm}
                                                    onChange={(e) => setCrmCrbm(e.target.value)}
                                                    className="w-full px-2 py-1 border rounded-lg text-gray-800 focus:ring-2 focus:ring-rose-500 outline-none text-sm bg-white cursor-pointer"
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-1.5">
                                                <div>
                                                    <label className="block text-[10px] font-semibold text-gray-600 mb-0.5">E-mail</label>
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

                                            {/* Botões de Ação integrados na terceira coluna */}
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
                                                    Salvar Profissional
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