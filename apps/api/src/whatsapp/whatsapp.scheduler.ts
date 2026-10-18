import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { JobsService } from '../jobs/jobs.service';
import { WhatsAppService } from './whatsapp.service';

/**
 * Agenda o envio de lembretes diários de agendamento.
 * Cron: '0 8 * * *' — todo dia às 08:00 (horário do servidor).
 */
@Injectable()
export class WhatsAppScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppScheduler.name);
  private task?: cron.ScheduledTask;

  constructor(
    private readonly whatsapp: WhatsAppService,
    private readonly jobs: JobsService,
  ) {}

  onModuleInit(): void {
    this.jobs.register('WHATSAPP_LEMBRETE', async (payload, job) => {
      const dados = payload as { id: string; dataHora: string };
      await this.whatsapp.executarLembrete(job.empresaId, dados.id, dados.dataHora);
    });
    if (process.env.NODE_ENV === 'test') return;
    const agendar = () =>
      this.whatsapp.sendDailyReminders(new Date(), async (empresaId, id, dataHora) => {
        await this.jobs.adicionar(
          empresaId,
          'WHATSAPP_LEMBRETE',
          `lembrete:${empresaId}:${id}:${dataHora.toISOString()}`,
          { id, dataHora: dataHora.toISOString() },
        );
      });
    this.task = cron.schedule('*/10 * * * *', () => {
      void agendar().catch(() => this.logger.error('Não foi possível agendar os lembretes'));
    });
    void agendar().catch(() =>
      this.logger.error('Não foi possível recuperar os lembretes pendentes'),
    );
  }

  onModuleDestroy(): void {
    if (this.task) {
      void this.task.stop();
    }
  }
}
