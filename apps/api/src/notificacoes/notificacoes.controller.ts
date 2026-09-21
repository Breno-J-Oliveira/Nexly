import { Controller, Get, Patch, Param } from '@nestjs/common';
import { AuthUser } from '@nexly/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificacoesService } from './notificacoes.service';

@Controller('notificacoes')
export class NotificacoesController {
  constructor(private readonly service: NotificacoesService) {}

  @Get() listar(@CurrentUser() user: AuthUser) {
    return this.service.listar(user.id);
  }

  @Get('count') naoLidas(@CurrentUser() user: AuthUser) {
    return this.service.naoLidas(user.id);
  }

  @Patch(':id/ler') marcarLida(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.marcarLida(id, user.id);
  }
}
