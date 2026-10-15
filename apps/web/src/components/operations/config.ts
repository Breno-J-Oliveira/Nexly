export type Option = { id: string; nome: string };
export type Options = Record<
  'usuarios' | 'filiais' | 'clientes' | 'profissionais' | 'servicos',
  Option[]
>;
export type Field = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'datetime-local' | 'number' | 'checkbox' | 'select';
  required?: boolean;
  max?: number;
  min?: number;
  maxLength?: number;
  choices?: string[];
  source?: keyof Options;
};
export type Kind =
  'tarefas' | 'filiais' | 'documentos' | 'marketing' | 'automacao' | 'recorrencias';
export type RecordData = {
  id: string;
  titulo?: string;
  nome?: string;
  descricao?: string;
  status?: string;
  prioridade?: string;
  prazo?: string | null;
  responsavelId?: string | null;
  filialId?: string | null;
  endereco?: string;
  telefone?: string | null;
  ativa?: boolean;
  conteudo?: string;
  categoria?: string;
  versao?: number;
  updatedAt?: string;
  mensagem?: string;
  intervaloDias?: number;
  proximaExecucao?: string;
  ultimaExecucao?: string | null;
  quantidade?: number;
  inicio?: string;
  cancelada?: boolean;
  agendamentos?: { id: string; dataHora: string; status: string }[];
  [key: string]: unknown;
};
export const statusLabels: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  BAIXA: 'Baixa',
  NORMAL: 'Normal',
  ALTA: 'Alta',
  RASCUNHO: 'Rascunho',
  ATIVA: 'Ativa',
  ENCERRADA: 'Encerrada',
  GERAL: 'Geral',
  MODELO: 'Modelo',
  PROCEDIMENTO: 'Procedimento',
  TERMO: 'Termo',
};
const titulo: Field = { name: 'titulo', label: 'Título', required: true, maxLength: 120 };
const descricao: Field = {
  name: 'descricao',
  label: 'Descrição',
  type: 'textarea',
  maxLength: 4000,
};
const responsavel: Field = {
  name: 'responsavelId',
  label: 'Responsável',
  type: 'select',
  source: 'usuarios',
};
export const configs: Record<
  Kind,
  {
    title: string;
    description: string;
    path: string;
    defaults: Record<string, string | boolean | number>;
    fields: Field[];
  }
> = {
  tarefas: {
    title: 'Tarefas',
    description: 'Organize atividades, distribua responsabilidades e acompanhe os prazos.',
    path: 'tarefas',
    defaults: {
      titulo: '',
      descricao: '',
      status: 'PENDENTE',
      prioridade: 'NORMAL',
      prazo: '',
      responsavelId: '',
      filialId: '',
    },
    fields: [
      titulo,
      descricao,
      {
        name: 'status',
        label: 'Situação',
        type: 'select',
        choices: ['PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'],
        required: true,
      },
      {
        name: 'prioridade',
        label: 'Prioridade',
        type: 'select',
        choices: ['BAIXA', 'NORMAL', 'ALTA'],
        required: true,
      },
      { name: 'prazo', label: 'Prazo', type: 'datetime-local' },
      responsavel,
      { name: 'filialId', label: 'Filial', type: 'select', source: 'filiais' },
    ],
  },
  filiais: {
    title: 'Filiais',
    description:
      'Cadastre locais de operação e vincule tarefas a cada unidade. Agenda, estoque e financeiro continuam compartilhados pela empresa.',
    path: 'filiais',
    defaults: { nome: '', endereco: '', telefone: '', ativa: true },
    fields: [
      { name: 'nome', label: 'Nome da filial', required: true, maxLength: 120 },
      { name: 'endereco', label: 'Endereço', required: true, min: 5, maxLength: 400 },
      { name: 'telefone', label: 'Telefone', maxLength: 30 },
      { name: 'ativa', label: 'Filial ativa', type: 'checkbox' },
    ],
  },
  documentos: {
    title: 'Documentos',
    description:
      'Guarde modelos, termos e procedimentos em texto. Edite com controle de versão e imprima ou salve como PDF pelo navegador.',
    path: 'documentos',
    defaults: { titulo: '', conteudo: '', categoria: 'GERAL' },
    fields: [
      titulo,
      {
        name: 'categoria',
        label: 'Categoria',
        type: 'select',
        required: true,
        choices: ['GERAL', 'MODELO', 'PROCEDIMENTO', 'TERMO'],
      },
      { name: 'conteudo', label: 'Conteúdo', type: 'textarea', required: true, maxLength: 50000 },
    ],
  },
  marketing: {
    title: 'Marketing',
    description:
      'Prepare campanhas para contatos com autorização registrada. O WhatsApp abre para revisão e envio manual; nenhuma mensagem é enviada automaticamente.',
    path: 'campanhas',
    defaults: { titulo: '', mensagem: '', status: 'RASCUNHO' },
    fields: [
      titulo,
      {
        name: 'mensagem',
        label: 'Mensagem (use {nome} para personalizar)',
        type: 'textarea',
        required: true,
        maxLength: 2000,
      },
      {
        name: 'status',
        label: 'Situação',
        type: 'select',
        choices: ['RASCUNHO', 'ATIVA', 'ENCERRADA'],
        required: true,
      },
    ],
  },
  automacao: {
    title: 'Automação',
    description:
      'Crie uma tarefa automaticamente a cada intervalo de dias. Execução verificada a cada minuto enquanto a API está ativa; após uma pausa, gera uma tarefa e avança para o próximo ciclo, sem acumular atrasadas.',
    path: 'automacoes',
    defaults: {
      titulo: '',
      descricao: '',
      intervaloDias: 7,
      proximaExecucao: '',
      responsavelId: '',
      ativa: true,
    },
    fields: [
      titulo,
      descricao,
      {
        name: 'intervaloDias',
        label: 'Intervalo em dias',
        type: 'number',
        required: true,
        min: 1,
        max: 365,
      },
      {
        name: 'proximaExecucao',
        label: 'Próxima execução',
        type: 'datetime-local',
        required: true,
      },
      responsavel,
      { name: 'ativa', label: 'Automação ativa', type: 'checkbox' },
    ],
  },
  recorrencias: {
    title: 'Recorrências',
    description:
      'Gere de 2 a 24 atendimentos de uma vez. Se existir conflito em qualquer data, nenhum é criado. As datas usam intervalos de 24 horas; a prévia mostra o horário local.',
    path: 'recorrencias',
    defaults: {
      titulo: '',
      clienteId: '',
      profissionalId: '',
      servicoId: '',
      inicio: '',
      intervaloDias: 7,
      quantidade: 4,
    },
    fields: [
      titulo,
      { name: 'clienteId', label: 'Cliente', type: 'select', source: 'clientes', required: true },
      {
        name: 'profissionalId',
        label: 'Profissional',
        type: 'select',
        source: 'profissionais',
        required: true,
      },
      { name: 'servicoId', label: 'Serviço', type: 'select', source: 'servicos', required: true },
      { name: 'inicio', label: 'Primeiro atendimento', type: 'datetime-local', required: true },
      {
        name: 'intervaloDias',
        label: 'Intervalo em dias',
        type: 'number',
        required: true,
        min: 1,
        max: 90,
      },
      {
        name: 'quantidade',
        label: 'Quantidade de atendimentos',
        type: 'number',
        required: true,
        min: 2,
        max: 24,
      },
    ],
  },
};
