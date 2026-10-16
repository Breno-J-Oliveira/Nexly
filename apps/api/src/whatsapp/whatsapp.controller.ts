import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EnviarLembreteDto } from './dto/enviar-lembrete.dto';
import { EnviarMensagemDto } from './dto/enviar-mensagem.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthUser } from '@nexly/shared';

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
    const status = this.whatsapp.getStatus();
    if (status.mode === 'simulation') return { sent: false, simulated: true, ...status };
    const sent = await this.whatsapp.send(dto);
    return { sent, simulated: false, ...status };
  }

  @Post('reminder/test')
  @Roles('ADMIN')
  async testReminder(@Body() dto: EnviarLembreteDto, @CurrentUser() user: AuthUser) {
    const ok = await this.whatsapp.sendAppointmentReminderForCompany(dto, user.empresaId);
    return { sent: ok };
  }
}
