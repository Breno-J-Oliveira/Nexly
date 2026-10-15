import { Controller, Get, Query } from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';
import { getTenantIdOrFail } from '../database/tenant-context';

@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly service: FinanceiroService) {}

  @Get('dre')
  async dre(@Query('dataInicio') di: string, @Query('dataFim') df: string) {
    const empresaId = getTenantIdOrFail();
    return this.service.dre(empresaId, di, df);
  }

  @Get('fluxo-caixa')
  async fluxoCaixa(@Query('dataInicio') di: string, @Query('dataFim') df: string) {
    const empresaId = getTenantIdOrFail();
    return this.service.fluxoCaixa(empresaId, di, df);
  }

  @Get('top-produtos')
  async topProdutos(
    @Query('dataInicio') di: string,
    @Query('dataFim') df: string,
    @Query('limit') limit?: string,
  ) {
    const empresaId = getTenantIdOrFail();
    return this.service.topProdutos(empresaId, di, df, Number(limit || 10));
  }
}
