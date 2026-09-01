import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WhatsAppService } from './whatsapp.service';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('whatsapp')
@UseGuards(RolesGuard)
export class WhatsAppController {
  constructor(private readonly whatsapp: WhatsAppService) {}

  @Post('test')
  @Roles('ADMIN')
  async testSend(@Body() body: { phone: string; message: string }) {
    const ok = await this.whatsapp.send(body);
    return { sent: ok, provider: process.env.WHATSAPP_PROVIDER || 'disabled' };
  }

  @Post('reminder/test')
  @Roles('ADMIN')
  async testReminder(@Body() body: { phone: string; clientName: string; professionalName: string; serviceName: string; dateTime: string }) {
    const ok = await this.whatsapp.sendAppointmentReminder(body);
    return { sent: ok };
  }
}
