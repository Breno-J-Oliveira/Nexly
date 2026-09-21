import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EnviarLembreteDto } from './dto/enviar-lembrete.dto';
import { EnviarMensagemDto } from './dto/enviar-mensagem.dto';

@Controller('whatsapp')
@UseGuards(RolesGuard)
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Get('status')
  @Roles('ADMIN')
  status() {
    return this.whatsapp.getStatus();
  }

  @Post('test')
  @Roles('ADMIN')
  async testSend(@Body() dto: EnviarMensagemDto) {
    const ok = await this.whatsapp.send(dto);
    return { sent: ok, provider: process.env.WHATSAPP_PROVIDER || 'disabled' };
  }

  @Post('reminder/test')
  @Roles('ADMIN')
  async testReminder(@Body() dto: EnviarLembreteDto) {
    const ok = await this.whatsapp.sendAppointmentReminder(dto);
    return { sent: ok };
  }
}
