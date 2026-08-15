import { Role, StatusAgendamento } from './enums';

// ── Auth ───────────────────────────────────────────────────
export interface RegisterDto {
  empresaNome: string;
  cnpj: string;
  responsavelNome: string;
  email: string;
  senha: string;
}

export interface LoginDto {
  email: string;
  senha: string;
}

export interface AuthResponse {
  accessToken: string;
  usuario: UsuarioPublico;
}

export interface UsuarioPublico {
  id: string;
  empresaId: string;
  nome: string;
  email: string;
  role: Role;
}

// ── Usuários ──────────────────────────────────────────────
export interface CriarUsuarioDto {
  nome: string;
  email: string;
  senha: string;
  role: Role;
}

export interface AtualizarUsuarioDto {
  nome?: string;
  role?: Role;
}

export interface TrocarSenhaDto {
  senhaAtual: string;
  novaSenha: string;
}

// ── Clientes ───────────────────────────────────────────────
export interface CriarClienteDto {
  nome: string;
  telefone?: string;
  email?: string;
}

export interface AtualizarClienteDto {
  nome?: string;
  telefone?: string;
  email?: string;
}

// ── Profissionais ─────────────────────────────────────────
export interface CriarProfissionalDto {
  nome: string;
  especialidade?: string;
}

export interface AtualizarProfissionalDto {
  nome?: string;
  especialidade?: string;
}

// ── Serviços ───────────────────────────────────────────────
export interface CriarServicoDto {
  nome: string;
  duracaoMin: number;
  preco: number;
}

export interface AtualizarServicoDto {
  nome?: string;
  duracaoMin?: number;
  preco?: number;
}

// ── Agendamentos ───────────────────────────────────────────
export interface CriarAgendamentoDto {
  clienteId: string;
  profissionalId: string;
  servicoId: string;
  dataHora: string;
}

export interface AtualizarStatusAgendamentoDto {
  status: StatusAgendamento;
}

// ── Produtos ──────────────────────────────────────────────
export interface CriarProdutoDto {
  nome: string;
  sku: string;
  preco: number;
  estoqueAtual?: number;
  estoqueMinimo?: number;
  categoria?: string;
}

export interface AtualizarProdutoDto {
  nome?: string;
  preco?: number;
  estoqueMinimo?: number;
  categoria?: string;
}

// ── Estoque ────────────────────────────────────────────────
export interface RegistrarEntradaDto {
  produtoId: string;
  quantidade: number;
  motivo: string;
}

// ── Vendas ─────────────────────────────────────────────────
export interface ItemVendaDto {
  produtoId: string;
  quantidade: number;
}

export interface CriarVendaDto {
  clienteId?: string;
  itens: ItemVendaDto[];
}

// ── Paginação ──────────────────────────────────────────────
export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
