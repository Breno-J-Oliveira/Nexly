import { Controller, Get, Param, Query } from '@nestjs/common';
import { ComissaoService } from './comissao.service';

@Controller('comissao')
export class ComissaoController {
  constructor(private readonly service: ComissaoService) {}

  @Get('resumo')
  async resumo(@Query('dataInicio') dataInicio: string, @Query('dataFim') dataFim: string) {
    return this.service.resumoGeral(dataInicio, dataFim);
  }

  @Get(':profissionalId')
  async calcular(@Param('profissionalId') id: string, @Query('dataInicio') dataInicio: string, @Query('dataFim') dataFim: string) {
    return this.service.calcular(id, dataInicio, dataFim);
  }
}
