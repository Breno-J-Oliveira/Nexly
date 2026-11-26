import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role, type AuthUser } from '@nexly/shared';
import { ROLES_KEY } from '../common/decorators/roles.decorator';
import type { PrismaService } from '../database/prisma.service';
import { PlatformAccessGuard } from '../platform-access/platform-access.guard';
import { PLATFORM_ROLES_KEY } from '../platform-access/platform-roles.key';
import { PlatformWorkspaceController } from './platform-workspace.controller';
import { PlatformWorkspaceService } from './platform-workspace.service';

describe('Gestão interna da plataforma', () => {
  it('requer o papel de proprietário da plataforma e de administrador do tenant', () => {
    const descriptor = Object.getOwnPropertyDescriptor(
      PlatformWorkspaceController.prototype,
      'resumo',
    );
    const handler: unknown = descriptor?.value;
    expect(typeof handler).toBe('function');
    expect(Reflect.getMetadata(ROLES_KEY, handler as object)).toEqual([Role.ADMIN]);
    expect(Reflect.getMetadata(PLATFORM_ROLES_KEY, handler as object)).toEqual(['OWNER']);
    expect(Reflect.getMetadata(GUARDS_METADATA, handler as object)).toContain(PlatformAccessGuard);
  });

  it('limita dados à empresa autenticada e calcula o fim da agenda no fuso da empresa', async () => {
    const now = new Date('2026-03-06T02:30:00.000Z');
    jest.useFakeTimers({ now });
    try {
      const updatedAt = new Date('2026-03-02T00:00:00.000Z');
      const empresa = jest.fn().mockResolvedValue({
        nome: 'Nexly Interno',
        fusoHorario: 'America/New_York',
        modulos: ['clientes', 'tarefas'],
      });
      const countTasks = jest.fn().mockResolvedValueOnce(3).mockResolvedValueOnce(1);
      const countContacts = jest.fn().mockResolvedValue(2);
      const countAppointments = jest.fn().mockResolvedValue(4);
      const listTasks = jest.fn().mockResolvedValue([
        {
          id: 't1',
          titulo: 'Revisar documentação',
          status: 'PENDENTE',
          prioridade: 'ALTA',
          prazo: null,
          updatedAt,
        },
      ]);
      const service = new PlatformWorkspaceService({
        client: {
          empresa: { findUniqueOrThrow: empresa },
          tarefa: { count: countTasks, findMany: listTasks },
          cliente: { count: countContacts },
          agendamento: { count: countAppointments },
        },
      } as unknown as PrismaService);

      const response = await service.resumo({ empresaId: 'interna', role: Role.ADMIN } as AuthUser);

      expect(empresa).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'interna' } }));
      const abertas = { empresaId: 'interna', status: { in: ['PENDENTE', 'EM_ANDAMENTO'] } };
      expect(countTasks).toHaveBeenNthCalledWith(1, { where: abertas });
      expect(countTasks).toHaveBeenNthCalledWith(2, { where: { ...abertas, prazo: { lt: now } } });
      expect(listTasks).toHaveBeenCalledWith(expect.objectContaining({ where: abertas, take: 6 }));
      expect(countContacts).toHaveBeenCalledWith({ where: { empresaId: 'interna', ativo: true } });
      expect(countAppointments).toHaveBeenCalledWith({
        where: {
          empresaId: 'interna',
          status: { in: ['AGENDADO', 'CONFIRMADO'] },
          dataHora: { gte: now, lt: new Date('2026-03-12T04:00:00.000Z') },
        },
      });
      expect(response).toMatchObject({
        workspace: { name: 'Nexly Interno', timeZone: 'America/New_York' },
        totals: { openTasks: 3, overdueTasks: 1, contacts: 2, appointmentsNext7Days: 4 },
        tasks: [
          { id: 't1', title: 'Revisar documentação', priority: 'ALTA', dueAt: null, updatedAt },
        ],
        generatedAt: now,
      });
      expect(response.links.map(({ href }) => href)).toEqual([
        '/tarefas',
        '/clientes',
        '/usuarios',
        '/meu-nexly',
      ]);
    } finally {
      jest.useRealTimers();
    }
  });
});
