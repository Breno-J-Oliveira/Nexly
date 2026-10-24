import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { JobsService } from '../jobs/jobs.service';
import { AssinaturasService } from './assinaturas.service';
import { StripeGateway } from './stripe.gateway';

/** A fila persiste tentativas e deduplica o mesmo ciclo entre reinícios e réplicas. */
@Injectable()
export class AssinaturasScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AssinaturasScheduler.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private stopped = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly assinaturas: AssinaturasService,
    private readonly gateway: StripeGateway,
  ) {}

  onModuleInit(): void {
    this.jobs.register('ASSINATURA_RECONCILIAR', async (payload, job) => {
      if (
        !payload ||
        typeof payload !== 'object' ||
        Array.isArray(payload) ||
        typeof payload.ambiente !== 'string' ||
        !['test', 'live'].includes(payload.ambiente)
      ) {
        throw new Error('Ambiente de reconciliação inválido');
      }
      await this.assinaturas.reconciliarAgendada(job.empresaId, payload.ambiente);
    });
    if (process.env.NODE_ENV === 'test' || !this.gateway.enabled) return;
    const enqueue = () => {
      void this.enfileirar().catch(() =>
        this.logger.error(
          'Não foi possível agendar a reconciliação; nova tentativa no próximo ciclo',
        ),
      );
    };
    this.timer = setInterval(enqueue, 15 * 60_000);
    this.timer.unref();
    enqueue();
  }

  onModuleDestroy(): void {
    this.stopped = true;
    if (this.timer) clearInterval(this.timer);
  }

  async enfileirar(agora = new Date()): Promise<void> {
    if (this.running || this.stopped || !this.gateway.enabled) return;
    this.running = true;
    try {
      const ambiente = this.gateway.mode;
      const janela = Math.floor(agora.getTime() / 3_600_000);
      let cursor: string | undefined;
      while (!this.stopped) {
        const rows = await this.prisma.client.assinatura.findMany({
          where: {
            ambiente,
            customerId: { not: null },
            ...(cursor ? { empresaId: { gt: cursor } } : {}),
          },
          select: { empresaId: true },
          orderBy: { empresaId: 'asc' },
          take: 100,
        });
        for (const row of rows) {
          if (this.stopped) return;
          await this.jobs.adicionar(
            row.empresaId,
            'ASSINATURA_RECONCILIAR',
            `assinatura:${ambiente}:${row.empresaId}:${janela}`,
            { ambiente },
          );
        }
        if (rows.length < 100) break;
        cursor = rows[rows.length - 1]!.empresaId;
      }
    } finally {
      this.running = false;
    }
  }
}
