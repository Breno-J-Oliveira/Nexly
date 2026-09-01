import { Controller, Get, Patch, Param } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificacoesService } from './notificacoes.service';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  @Get() listar(@CurrentUser() user: any) { return this.service.listar(user.sub || user.id); }

  @Get('count') naoLidas(@CurrentUser() user: any) { return this.service.naoLidas(user.sub || user.id); }

  @Patch(':id/ler') marcarLida(@Param('id') id: string) { return this.service.marcarLida(id); }
}
