import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CriarVendaDto } from './dto/criar-venda.dto';
import { VendasService } from './vendas.service';
import { ListarVendasDto } from './dto/listar-vendas.dto';

@Controller('vendas')
export class VendasController {
  constructor(private readonly vendasService: VendasService) {}

  @Post()
  criar(@Body() dto: CriarVendaDto) {
    return this.vendasService.criar(dto.clienteId, dto.itens, {
      formaPagamento: dto.formaPagamento,
      desconto: dto.desconto,
      cupomCodigo: dto.cupomCodigo,
    });
  }

  @Get()
  listar(@Query() query: ListarVendasDto) {
    return this.vendasService.listar(query.page ?? 1, query.limit ?? 20, query);
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.vendasService.obter(id);
  }
}
