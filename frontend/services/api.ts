const API_URL = process.env.NEXT_PUBLIC_API_URL;

function getAuthHeader() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('@consultorio:token') : '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

// Autenticação
export async function loginRequest(identificador: string, senha: string) {
  const response = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ identificador, senha }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Erro ao realizar login.');
  }

  return data;
}

// Serviços de Clientes
export async function listarClientes(busca: string = '') {
  const response = await fetch(`${API_URL}/clientes?busca=${encodeURIComponent(busca)}`, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar clientes');
  return data;
}

export async function criarCliente(dados: any) {
  const response = await fetch(`${API_URL}/clientes`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(dados),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao cadastrar cliente');
  return data;
}

export async function atualizarCliente(id: number, dados: any) {
  const response = await fetch(`${API_URL}/clientes/${id}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(dados),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao atualizar cliente');
  return data;
}

export async function excluirCliente(id: number) {
  const response = await fetch(`${API_URL}/clientes/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir cliente');
  return data;
}

// Serviços de Profissionais
export async function listarProfissionais() {
  const response = await fetch(`${API_URL}/profissionais`, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar profissionais');
  return data;
}

export async function criarProfissional(dados: any) {
  const response = await fetch(`${API_URL}/profissionais`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(dados),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao cadastrar profissional');
  return data;
}

export async function atualizarProfissional(id: number, dados: any) {
  const response = await fetch(`${API_URL}/profissionais/${id}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(dados),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao atualizar profissional');
  return data;
}

export async function excluirProfissional(id: number) {
  const response = await fetch(`${API_URL}/profissionais/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir profissional');
  return data;
}

// Serviços de Procedimentos
export async function listarProcedimentos() {
  const response = await fetch(`${API_URL}/procedimentos`, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar procedimentos');
  return data;
}

export async function criarProcedimento(dados: any) {
  const response = await fetch(`${API_URL}/procedimentos`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(dados),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao cadastrar procedimento');
  return data;
}

export async function atualizarProcedimento(id: number, dados: any) {
  const response = await fetch(`${API_URL}/procedimentos/${id}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(dados),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao atualizar procedimento');
  return data;
}

export async function excluirProcedimento(id: number) {
  const response = await fetch(`${API_URL}/procedimentos/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir procedimento');
  return data;
}

// Serviços de Atendimentos
export async function listarAtendimentos(filtros?: { situacao?: string; data?: string }) {
  const params = new URLSearchParams();
  if (filtros?.situacao) params.append('situacao', filtros.situacao);
  if (filtros?.data) params.append('data', filtros.data);

  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await fetch(`${API_URL}/atendimentos${query}`, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar atendimentos');
  return data;
}

export async function criarAtendimento(dados: any) {
  const response = await fetch(`${API_URL}/atendimentos`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(dados),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao criar atendimento');
  return data;
}

export async function atualizarAtendimento(id: number, dados: any) {
  const response = await fetch(`${API_URL}/atendimentos/${id}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(dados),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao atualizar atendimento');
  return data;
}

export async function excluirAtendimento(id: number) {
  const response = await fetch(`${API_URL}/atendimentos/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir atendimento');
  return data;
}

export async function obterResumoFinanceiro(mes?: number, ano?: number, tipo?: 'mes' | 'ano') {
  let url = `${API_URL}/dashboard/financeiro`;
  
  const params = new URLSearchParams();
  if (mes) params.append('mes', mes.toString());
  if (ano) params.append('ano', ano.toString());
  if (tipo) params.append('tipo', tipo);

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar resumo financeiro');
  return data;
}

export const obterResumoDashboard = obterResumoFinanceiro;

// Serviços de Despesas
export async function listarDespesas(mes: number, ano: number) {
  const response = await fetch(`${API_URL}/despesas?mes=${mes}&ano=${ano}`, {
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao carregar despesas');
  return data;
}

export async function criarDespesa(dados: any) {
  // Padroniza o tipo_base antes de enviar para o backend
  const payload = {
    ...dados,
    tipo_base: dados.tipo_base ? dados.tipo_base.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : 'FIXO'
  };

  const response = await fetch(`${API_URL}/despesas`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao cadastrar despesa');
  return data;
}

export async function deletarDespesaProfissional(id: number) {
  const response = await fetch(`${API_URL}/despesas/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader()
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir despesa');
  return data;
}

export async function excluirDespesa(id: number) {
  const response = await fetch(`${API_URL}/despesas/${id}`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao excluir despesa');
  return data;
}

export async function salvarDespesaProfissional(dados: { 
  profissional_id: number; 
  mes: number; 
  ano: number; 
  descricao: string; 
  valor: number; 
  percentual?: number; 
  tipo_base?: string; 
  data?: string 
}) {
  const payload = {
    ...dados,
    tipo_base: dados.tipo_base ? dados.tipo_base.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : 'FIXO',
    data: dados.data || `${dados.ano}-${String(dados.mes).padStart(2, '0')}-01`
  };

  const response = await fetch(`${API_URL}/despesas`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify(payload)
  });
  
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao salvar despesa');
  return data;
}

export async function atualizarDespesaProfissional(id: number, dados: { 
  descricao: string; 
  valor: number; 
  percentual?: number; 
  tipo_base?: string; 
  data?: string;
  mes?: number;
  ano?: number;
  profissional_id?: number;
}) {
  const payload = {
    ...dados,
    tipo_base: dados.tipo_base ? dados.tipo_base.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : 'FIXO'
  };

  const response = await fetch(`${API_URL}/despesas/${id}`, {
    method: 'PUT',
    headers: getAuthHeader(),
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Erro ao atualizar despesa');
  return data;
}

export async function simularNotaFiscal(profissionalId: number, mes: number, ano: number) {
  const response = await fetch(`${API_URL}/notas-fiscais/simular?profissional_id=${profissionalId}&mes=${mes}&ano=${ano}`, {
    headers: getAuthHeader()
  });
  if (!response.ok) throw new Error('Erro ao gerar nota fiscal.');
  return response.text();
}

export async function obterRelatorioCliente(clienteId: number, mes: number, ano: number) {
  const response = await fetch(`${API_URL}/relatorios/cliente?cliente_id=${clienteId}&mes=${mes}&ano=${ano}`, {
    headers: getAuthHeader()
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.error || 'Erro ao buscar relatório do cliente');
  }

  return response.json();
}

export async function obterRelatorioProfissional(profissionalId: number, mes: number | null, ano: number | null, historicoGeral: boolean) {
  let url = `${API_URL}/relatorios/profissional?profissional_id=${profissionalId}`;
  
  if (historicoGeral) {
    url += `&historico_geral=true`;
  } else {
    if (ano !== null) url += `&ano=${ano}`;
    if (mes !== null) url += `&mes=${mes}`;
  }

  const response = await fetch(url, {
    headers: getAuthHeader()
  });

  if (!response.ok) throw new Error('Erro ao buscar relatório');
  return response.json();
}



export async function listarUsuarios() {
  const token = localStorage.getItem('@consultorio:token');
  const response = await fetch(`${API_URL}/usuarios`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao listar usuários.');
  }

  return response.json();
}

export async function criarUsuario(dados: { nome: string; email: string; senha: string; perfil: string }) {
  const token = localStorage.getItem('@consultorio:token');
  const response = await fetch(`${API_URL}/usuarios`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dados)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao cadastrar usuário.');
  }

  return response.json();
}

export async function atualizarUsuario(id: number, dados: { nome: string; email: string; perfil: string; novaSenha?: string }) {
  const token = localStorage.getItem('@consultorio:token');
  const response = await fetch(`${API_URL}/usuarios/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dados)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao atualizar usuário.');
  }

  return response.json();
}

export async function excluirUsuario(id: number) {
  const token = localStorage.getItem('@consultorio:token');
  const response = await fetch(`${API_URL}/usuarios/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao excluir usuário.');
  }

  return response.json();
}

export async function alterarSenhaObrigatoria(usuarioId: number, novaSenha: string) {
  const token = localStorage.getItem('@consultorio:token');
  const response = await fetch(`${API_URL}/usuarios/alterar-senha`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ usuarioId, novaSenha })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Erro ao alterar senha.');
  }

  return response.json();
}