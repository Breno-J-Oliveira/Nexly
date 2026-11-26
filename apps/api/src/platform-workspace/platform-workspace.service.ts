import { Injectable } from '@nestjs/common';
import { routeModule, type AuthUser } from '@nexly/shared';
import { diaNoFuso, periodoNoFuso } from '../booking/booking-time';
import { PrismaService } from '../database/prisma.service';

const WORKSPACE_LINKS = [
  { label: 'Tarefas', href: '/tarefas', description: 'Acompanhe prazos e pendências da equipe.' },
  {
    label: 'Clientes e contatos',
    href: '/clientes',
    description: 'Organize os contatos da operação interna.',
  },
  {
    label: 'Agenda',
    href: '/agenda',
    description: 'Consulte e organize os próximos atendimentos.',
  },
  {
    label: 'Financeiro',
    href: '/financeiro',
    description: 'Acompanhe receitas, despesas e vencimentos.',
  },
  {
    label: 'Estoque',
    href: '/estoque',
    description: 'Consulte o saldo e as movimentações de materiais.',
  },
  {
    label: 'Documentos',
    href: '/documentos',
    description: 'Organize procedimentos e materiais de trabalho.',
  },
  { label: 'Usuários', href: '/usuarios', description: 'Gerencie as contas da empresa interna.' },
  {
    label: 'Meu Nexly',
    href: '/meu-nexly',
    description: 'Confira os módulos e as preferências do espaço.',
  },
];

@Injectable()
export class PlatformWorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async resumo({ empresaId }: AuthUser) {
    const empresa = await this.prisma.client.empresa.findUniqueOrThrow({
      where: { id: empresaId },
      select: { nome: true, fusoHorario: true, modulos: true },
    });
    const agora = new Date();
    const hoje = diaNoFuso(agora, empresa.fusoHorario);
    const ultimoDia = new Date(`${hoje}T00:00:00.000Z`);
    ultimoDia.setUTCDate(ultimoDia.getUTCDate() + 6);
    const { fimExclusivo } = periodoNoFuso(
      ultimoDia.toISOString().slice(0, 10),
      empresa.fusoHorario,
    );
    const abertas = { empresaId, status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } };

    const [openTasks, overdueTasks, contacts, appointmentsNext7Days, tarefas] = await Promise.all([
      this.prisma.client.tarefa.count({ where: abertas }),
      this.prisma.client.tarefa.count({ where: { ...abertas, prazo: { lt: agora } } }),
      this.prisma.client.cliente.count({ where: { empresaId, ativo: true } }),
      this.prisma.client.agendamento.count({
        where: {
          empresaId,
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
          dataHora: { gte: agora, lt: fimExclusivo },
        },
      }),
      this.prisma.client.tarefa.findMany({
        where: abertas,
        orderBy: [{ prazo: { sort: 'asc', nulls: 'last' } }, { updatedAt: 'desc' }, { id: 'asc' }],
        take: 6,
        select: {
          id: true,
          titulo: true,
          status: true,
          prioridade: true,
          prazo: true,
          updatedAt: true,
        },
      }),
    ]);

    return {
      workspace: { name: empresa.nome, timeZone: empresa.fusoHorario },
      totals: { openTasks, overdueTasks, contacts, appointmentsNext7Days },
      tasks: tarefas.map(({ id, titulo, status, prioridade, prazo, updatedAt }) => ({
        id,
        title: titulo,
        status,
        priority: prioridade,
        dueAt: prazo,
        updatedAt,
      })),
      links: WORKSPACE_LINKS.filter(({ href }) => {
        const module = routeModule(href);
        return !module || empresa.modulos.includes(module);
      }),
      generatedAt: agora,
    };
  }
}
