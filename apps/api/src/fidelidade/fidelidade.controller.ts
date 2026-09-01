import { Controller, Get, Param, Post, Body, Query } from '@nestjs/common';
import { FidelidadeService } from './fidelidade.service';

@Controller('fidelidade')
export class FidelidadeController {
  constructor(private readonly service: FidelidadeService) {}

  @Get('ranking/:empresaId') ranking(@Param('empresaId') id: string) { return this.service.ranking(id); }

  @Get('segmentar/:empresaId') segmentar(@Param('empresaId') id: string) { return this.service.segmentar(id); }

  @Post('pontos') pontos(@Body() body: { clienteId: string; pontos: number }) { return this.service.adicionarPontos(body.clienteId, body.pontos); }
}
