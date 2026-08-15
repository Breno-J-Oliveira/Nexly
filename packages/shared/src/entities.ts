import { Plano, Role, StatusAgendamento, TipoMovimentacao } from './enums';

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  plano: Plano;
  createdAt: Date;
}

export interface Usuario {
  id: string;
  empresaId: string;
  nome: string;
  email: string;
  senhaHash: string;
  role: Role;
  ativo: boolean;
  createdAt: Date;
}

export interface Cliente {
  id: string;
  empresaId: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  createdAt: Date;
}

export interface Profissional {
  id: string;
  empresaId: string;
  nome: string;
  especialidade: string | null;
  ativo: boolean;
  createdAt: Date;
}

export interface Servico {
  id: string;
  empresaId: string;
  nome: string;
  duracaoMin: number;
  preco: number;
  ativo: boolean;
  createdAt: Date;
}

export interface InsumoServico {
  id: string;
  servicoId: string;
  produtoId: string;
  quantidade: number;
}

export interface Agendamento {
  id: string;
  empresaId: string;
  clienteId: string;
  profissionalId: string;
  servicoId: string;
  dataHora: Date;
  dataHoraFim: Date;
  status: StatusAgendamento;
  createdAt: Date;
}

export interface Produto {
  id: string;
  empresaId: string;
  nome: string;
  sku: string;
  preco: number;
  estoqueAtual: number;
  estoqueMinimo: number;
  categoria: string | null;
  ativo: boolean;
  createdAt: Date;
}

export interface MovimentacaoEstoque {
  id: string;
  empresaId: string;
  produtoId: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo: string;
  agendamentoId: string | null;
  createdAt: Date;
}

export interface Venda {
  id: string;
  empresaId: string;
  clienteId: string | null;
  agendamentoId: string | null;
  total: number;
  createdAt: Date;
}

export interface ItemVenda {
  id: string;
  vendaId: string;
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
}
