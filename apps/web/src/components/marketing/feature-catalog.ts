import { MODULES, type ModuleId } from '@nexly/shared';

type Explanation = { benefit: string; steps: string[]; screen?: string };
const explanations: Record<ModuleId, Explanation> = {
  agenda: {
    benefit: 'Saiba quem chega, quando e para qual atendimento.',
    screen: 'agenda',
    steps: [
      'Cadastre serviços, durações e profissionais.',
      'Escolha o cliente e encontre um horário disponível.',
      'Confirme ou conclua o atendimento e acompanhe o dia.',
    ],
  },
  clientes: {
    benefit: 'Atenda com contexto, mesmo em um dia cheio.',
    screen: 'clientes',
    steps: [
      'Cadastre os contatos e as observações relevantes.',
      'Encontre um cliente pela busca.',
      'Consulte seu histórico de compras e atendimentos.',
    ],
  },
  profissionais: {
    benefit: 'Uma equipe organizada começa por uma agenda clara.',
    steps: [
      'Cadastre os profissionais que atendem no negócio.',
      'Vincule os serviços de cada pessoa.',
      'Acompanhe os atendimentos e respeite o limite de profissionais do seu plano.',
    ],
  },
  servicos: {
    benefit: 'Preço, duração e consumo definidos antes do atendimento.',
    steps: [
      'Crie seu catálogo com preços e durações.',
      'Vincule os produtos consumidos em cada serviço.',
      'Conclua o atendimento para registrar o consumo no estoque.',
    ],
  },
  estoque: {
    benefit: 'Perceba o que falta antes do próximo atendimento.',
    screen: 'estoque',
    steps: [
      'Cadastre produtos, categorias e estoque mínimo.',
      'Registre entradas e acompanhe as saídas.',
      'Consulte alertas e o histórico antes de repor.',
    ],
  },
  pdv: {
    benefit: 'Da escolha dos produtos ao registro da venda, tudo conectado.',
    screen: 'pdv',
    steps: [
      'Busque os produtos e monte o carrinho.',
      'Associe um cliente, confira os itens e informe o pagamento.',
      'Finalize a venda para atualizar estoque e histórico.',
    ],
  },
  vendas: {
    benefit: 'Encontre cada venda sem depender de anotações soltas.',
    steps: [
      'Consulte o histórico e filtre o período desejado.',
      'Confira itens, valores e recebimentos da venda.',
      'Quando necessário, faça o estorno com a permissão adequada.',
    ],
  },
  relatorios: {
    benefit: 'Transforme os registros do dia em decisões mais claras.',
    screen: 'relatorios',
    steps: [
      'Escolha o período que deseja analisar.',
      'Consulte faturamento, serviços e indicadores.',
      'Compare os resultados para planejar o próximo passo.',
    ],
  },
  comissao: {
    benefit: 'Mais clareza na hora de conferir o trabalho da equipe.',
    steps: [
      'Defina as regras de comissão dos profissionais.',
      'Registre os atendimentos e vendas elegíveis.',
      'Consulte os valores e acompanhe os pagamentos.',
    ],
  },
  fidelidade: {
    benefit: 'Dê continuidade ao relacionamento depois do atendimento.',
    steps: [
      'Configure as regras do programa e as recompensas.',
      'Acompanhe os pontos vinculados a cada cliente.',
      'Registre os resgates e consulte o histórico.',
    ],
  },
  marketing: {
    benefit: 'Prepare campanhas para quem autorizou o contato.',
    steps: [
      'Selecione os clientes que consentiram em receber mensagens.',
      'Organize a campanha e prepare o texto.',
      'Abra os contatos para envio manual pelo WhatsApp. O envio automático depende de configuração.',
    ],
  },
  tarefas: {
    benefit: 'Cada pendência com um responsável e um prazo.',
    steps: [
      'Crie a atividade e defina sua prioridade.',
      'Escolha responsável, prazo e unidade.',
      'Atualize o andamento até concluir.',
    ],
  },
  recorrencias: {
    benefit: 'Organize atendimentos que fazem parte da rotina.',
    steps: [
      'Escolha o cliente, serviço e profissional.',
      'Defina a frequência e revise os horários.',
      'Gerencie os próximos atendimentos preservando o histórico.',
    ],
  },
  automacao: {
    benefit: 'Tarefas recorrentes sem precisar lembrar de criá-las.',
    steps: [
      'Defina a tarefa que precisa se repetir.',
      'Configure a periodicidade e os responsáveis.',
      'Acompanhe a geração das tarefas e revise a regra quando precisar.',
    ],
  },
  filiais: {
    benefit: 'Cada unidade com seu lugar na operação.',
    steps: [
      'Cadastre as unidades do seu negócio.',
      'Associe atividades e operações à unidade correta.',
      'Consulte os saldos e organize transferências entre filiais.',
    ],
  },
  documentos: {
    benefit: 'Procedimentos e modelos fáceis de encontrar.',
    steps: [
      'Crie um documento ou modelo para sua equipe.',
      'Revise o conteúdo e acompanhe as versões.',
      'Consulte, imprima ou salve o material em PDF.',
    ],
  },
};
export const featureCatalog: (Explanation & {
  id: string;
  nome: string;
  icon: string;
  descricao: string;
})[] = [
  ...MODULES.map((module) => ({ ...module, ...explanations[module.id] })),
  {
    id: 'financeiro',
    nome: 'Contas a pagar e receber',
    icon: 'wallet',
    descricao: 'Organize vencimentos, pagamentos parciais e o fluxo de caixa.',
    benefit: 'Saiba o que precisa pagar e o que ainda tem a receber.',
    steps: [
      'Registre receitas e despesas com vencimento.',
      'Dê baixa nos pagamentos, inclusive parciais.',
      'Acompanhe saldos e pendências no financeiro.',
    ],
  },
  {
    id: 'agendamento-online',
    nome: 'Agendamento online',
    icon: 'calendar-days',
    descricao: 'Uma página para seus clientes encontrarem horários disponíveis.',
    benefit: 'Deixe o cliente escolher um horário, mesmo fora do expediente.',
    steps: [
      'Configure os horários e serviços disponíveis.',
      'Compartilhe o link da página do seu negócio.',
      'Receba os agendamentos e acompanhe tudo pela agenda.',
    ],
  },
  {
    id: 'meu-nexly',
    nome: 'Meu Nexly',
    icon: 'gear',
    descricao: 'Escolha os módulos que fazem sentido para o seu negócio.',
    benefit: 'Uma gestão que se adapta à sua rotina.',
    steps: [
      'Escolha um modelo de negócio no cadastro.',
      'Ative os recursos de que você precisa.',
      'Ajuste sua seleção em Meu Nexly conforme sua operação evoluir.',
    ],
  },
];
