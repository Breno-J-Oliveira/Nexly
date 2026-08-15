import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { EstoqueService } from './estoque.service';
import { RegistrarEntradaDto } from './dto/registrar-entrada.dto';

@Controller('estoque')
export class EstoqueController {
  constructor(private readonly estoqueService: EstoqueService) {}

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
