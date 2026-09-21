import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { WhatsAppService } from './whatsapp.service';

/**
 * Agenda o envio de lembretes diários de agendamento.
 * Cron: '0 8 * * *' — todo dia às 08:00 (horário do servidor).
 */
@Injectable()
export class WhatsAppScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsAppScheduler.name);
  private task?: cron.ScheduledTask;

  constructor(private readonly whatsapp: WhatsAppService) {}

  onModuleInit(): void {
    this.task = cron.schedule('0 8 * * *', () => {
      void this.whatsapp.sendDailyReminders().catch((err: unknown) => {
        this.logger.error(`Falha no job de lembretes: ${(err as Error).message}`);
      });
    });
    this.logger.log('Job de lembretes agendado (0 8 * * *)');
  }

  onModuleDestroy(): void {
    if (this.task) {
      void this.task.stop();
    }
  }
}
