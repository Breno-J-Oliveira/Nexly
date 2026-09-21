import { Controller, Get, Query } from '@nestjs/common';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly service: RelatoriosService) {}

  @Get('insumos-por-servico')
  insumos(@Query('dataInicio') di: string, @Query('dataFim') df: string) {
    return this.service.insumosPorServico(di, df);
  }

  @Get('horarios-pico')
  horariosPico() {
    return this.service.horariosPico();
  }

  @Get('faturamento')
  faturamento(@Query('dataInicio') di: string, @Query('dataFim') df: string) {
    return this.service.faturamento(di, df);
  }

  @Get('resumo')
  resumo(@Query('dataInicio') di: string, @Query('dataFim') df: string) {
    return this.service.resumoGeral(di, df);
  }

  @Get('agenda')
  agenda(@Query('dataInicio') di: string, @Query('dataFim') df: string) {
    return this.service.relatorioAgenda(di, df);
  }

  @Get('profissionais')
  profissionais(@Query('dataInicio') di: string, @Query('dataFim') df: string) {
    return this.service.relatorioProfissionais(di, df);
  }

  @Get('estoque')
  estoque(@Query('dataInicio') di: string, @Query('dataFim') df: string) {
    return this.service.relatorioEstoque(di, df);
  }
}
