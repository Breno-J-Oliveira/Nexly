import { Module } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppScheduler } from './whatsapp.scheduler';
import { EvolutionProvider } from './providers/evolution.provider';

@Module({
  controllers: [WhatsAppController],
  providers: [WhatsAppService, EvolutionProvider, WhatsAppScheduler],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
