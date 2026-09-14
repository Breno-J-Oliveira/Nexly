import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { FidelidadeService } from './fidelidade.service';

@Controller('fidelidade')
export class FidelidadeController {
  constructor(private readonly service: FidelidadeService) {}

  @Get('ranking')
  ranking(@CurrentUser() user: { empresaId: string }, @Query('limit') limit?: string) {
    return this.service.ranking(user.empresaId, limit ? Number(limit) : 10);
  }

  @Get('segmentar')
  segmentar(@CurrentUser() user: { empresaId: string }) {
    return this.service.segmentar(user.empresaId);
  }

  @Post('pontos')
  pontos(@CurrentUser() user: { empresaId: string }, @Body() body: { clienteId: string; pontos: number }) {
    return this.service.adicionarPontos(user.empresaId, body.clienteId, body.pontos);
  }
}
