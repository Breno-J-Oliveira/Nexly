import { Controller, Get, Query } from '@nestjs/common';
import { RelatoriosService } from './relatorios.service';

@Controller('relatorios')
export class RelatoriosController {
  constructor(private readonly relatoriosService: RelatoriosService) {}

  @Get('insumos-por-servico')
  insumosPorServico(
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
  ) {
    return this.relatoriosService.insumosPorServico(dataInicio, dataFim);
  }

  @Get('horarios-pico')
  horariosPico() {
    return this.relatoriosService.horariosPico();
  }
}
