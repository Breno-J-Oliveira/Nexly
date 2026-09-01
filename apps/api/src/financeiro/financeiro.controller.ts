import { Controller, Get, Query } from '@nestjs/common';
import { FinanceiroService } from './financeiro.service';
import { getTenantContext } from '../database/tenant-context';

@Controller('financeiro')
export class FinanceiroController {
  constructor(private readonly service: FinanceiroService) {}

  @Get('dre')
  async dre(@Query('dataInicio') di: string, @Query('dataFim') df: string) {
    const ctx = getTenantContext();
    return this.service.dre(ctx?.tenantId ?? '', di, df);
  }

  @Get('fluxo-caixa')
  async fluxoCaixa(@Query('dataInicio') di: string, @Query('dataFim') df: string) {
    const ctx = getTenantContext();
    return this.service.fluxoCaixa(ctx?.tenantId ?? '', di, df);
  }

  @Get('top-produtos')
  async topProdutos(@Query('dataInicio') di: string, @Query('dataFim') df: string, @Query('limit') limit?: string) {
    const ctx = getTenantContext();
    return this.service.topProdutos(ctx?.tenantId ?? '', di, df, Number(limit || 10));
  }
}
