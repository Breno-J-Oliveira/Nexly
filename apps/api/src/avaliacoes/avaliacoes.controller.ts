import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AvaliacoesService } from './avaliacoes.service';

@Controller('avaliacoes')
export class AvaliacoesController {
  constructor(private readonly service: AvaliacoesService) {}

  @Post() async criar(@Body() body: { agendamentoId: string; nota: number; comentario?: string }) { return this.service.criar(body.agendamentoId, body.nota, body.comentario); }

  @Get('nps/:empresaId') async nps(@Param('empresaId') id: string) { return this.service.nps(id); }
}
