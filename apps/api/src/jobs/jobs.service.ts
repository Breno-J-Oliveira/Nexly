import { Global, Injectable, Logger, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type Handler = (payload: Prisma.JsonValue, job: { id: string; empresaId: string }) => Promise<void>;
@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly handlers = new Map<string, Handler>();
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(JobsService.name);
  constructor(private readonly prisma: PrismaService) {}
  register(tipo: string, handler: Handler) {
    this.handlers.set(tipo, handler);
  }
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.processar().catch(() =>
        this.logger.error('Processamento indisponível; nova tentativa no próximo ciclo'),
      );
    }, 10000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async adicionar(
    empresaId: string,
    tipo: string,
    chave: string,
    payload: Prisma.InputJsonValue,
    client: Prisma.TransactionClient = this.prisma.client as unknown as Prisma.TransactionClient,
  ) {
    return client.jobDuravel.upsert({
      where: { chave },
      create: { empresaId, tipo, chave, payload },
      update: {},
    });
  }
  private async falhar(
    job: { id: string; empresaId: string; tentativas: number },
    reserva: string,
    permanente: boolean,
  ) {
    await this.prisma.client.$transaction(async (tx) => {
      const changed = await tx.jobDuravel.updateMany({
        where: { id: job.id, reserva, status: 'PROCESSANDO' },
        data: {
          status: permanente ? 'FALHOU' : 'PENDENTE',
          reserva: null,
          erro: 'Não foi possível concluir a rotina',
          executarEm: new Date(Date.now() + Math.min(2 ** job.tentativas * 30000, 900000)),
        },
      });
      if (permanente && changed.count) {
        const admins = await tx.usuario.findMany({
          where: { empresaId: job.empresaId, ativo: true, role: 'ADMIN' },
          select: { id: true },
          take: 100,
        });
        await tx.notificacao.createMany({
          data: admins.map((u) => ({
            empresaId: job.empresaId,
            usuarioId: u.id,
            titulo: 'Uma rotina precisa de atenção',
            mensagem:
              'O processamento não foi concluído. Consulte Saúde e rotinas para verificar a falha.',
            link: '/operacao',
          })),
        });
      }
    });
  }
  async processar() {
    if (this.running || !this.handlers.size) return;
    this.running = true;
    try {
      await this.prisma.client.jobDuravel.updateMany({
        where: { status: 'PROCESSANDO', reservadoEm: { lt: new Date(Date.now() - 300000) } },
        data: { status: 'PENDENTE', reserva: null, reservadoEm: null },
      });
      for (let i = 0; i < 10; i++) {
        const reserva = randomUUID();
        const job = await this.prisma.client.$transaction(async (tx) => {
          const next = await tx.$queryRaw<
            { id: string }[]
          >`SELECT id FROM jobs_duraveis WHERE status='PENDENTE' AND executar_em<=NOW() ORDER BY executar_em,id FOR UPDATE SKIP LOCKED LIMIT 1`;
          if (!next[0]) return null;
          return tx.jobDuravel.update({
            where: { id: next[0].id },
            data: {
              status: 'PROCESSANDO',
              reserva,
              reservadoEm: new Date(),
              tentativas: { increment: 1 },
            },
          });
        });
        if (!job) break;
        const handler = this.handlers.get(job.tipo);
        if (!handler) {
          await this.falhar(job, reserva, true);
          continue;
        }
        const heartbeat = setInterval(() => {
          void this.prisma.client.jobDuravel
            .updateMany({
              where: { id: job.id, reserva, status: 'PROCESSANDO' },
              data: { reservadoEm: new Date() },
            })
            .catch(() => undefined);
        }, 30000);
        heartbeat.unref();
        try {
          await handler(job.payload, job);
          await this.prisma.client.jobDuravel.updateMany({
            where: { id: job.id, reserva, status: 'PROCESSANDO' },
            data: { status: 'CONCLUIDO', reserva: null, erro: null, payload: Prisma.JsonNull },
          });
        } catch {
          await this.falhar(job, reserva, job.tentativas >= 5);
        } finally {
          clearInterval(heartbeat);
        }
      }
      await this.prisma.client.jobDuravel.deleteMany({
        where: { status: 'CONCLUIDO', createdAt: { lt: new Date(Date.now() - 30 * 86400000) } },
      });
    } finally {
      this.running = false;
    }
  }
}
@Global()
@Module({ providers: [JobsService], exports: [JobsService] })
export class JobsModule {}
