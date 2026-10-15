import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { EstoqueService } from './estoque.service';
import { RegistrarEntradaDto } from './dto/registrar-entrada.dto';
import { EstoqueIntegracaoService } from './estoque-integracao.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PaginacaoDto } from '../common/dto/paginacao.dto';
import { CancelarPendenciaDto } from './dto/cancelar-pendencia.dto';

@Controller('estoque')
export class EstoqueController {
  constructor(
    private readonly estoqueService: EstoqueService,
    private readonly integracao: EstoqueIntegracaoService,
  ) {}

  @Get('pendencias')
  pendencias(@Query() query: PaginacaoDto) {
    return this.integracao.listar(query.page ?? 1, query.limit ?? 20);
  }

  @Post('pendencias/:id/reprocessar')
  reprocessar(@Param('id', ParseUUIDPipe) id: string) {
    return this.integracao.reprocessar(id);
  }

  @Post('pendencias/:id/cancelar')
  cancelar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: CancelarPendenciaDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.integracao.cancelar(id, body.motivo, user.id);
  }

  @Post('entrada')
  async entrada(@Body() dto: RegistrarEntradaDto) {
    await this.estoqueService.registrarEntrada(dto.produtoId, dto.quantidade, dto.motivo);
    return { success: true };
  }

  @Get('historico/:produtoId')
  historico(@Param('produtoId') produtoId: string) {
    return this.estoqueService.historico(produtoId);
  }

  @Get('resumo')
  resumo() {
    return this.estoqueService.resumo();
  }
}
