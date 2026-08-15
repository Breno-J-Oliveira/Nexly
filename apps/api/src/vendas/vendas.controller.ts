import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { CriarVendaDto } from './dto/criar-venda.dto';
import { VendasService } from './vendas.service';

@Controller('vendas')
export class VendasController {
  constructor(private readonly vendasService: VendasService) {}

  @Post()
  criar(@Body() dto: CriarVendaDto) {
    return this.vendasService.criar(dto.clienteId, dto.itens);
  }

  @Get()
  listar(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
    @Query('clienteId') clienteId?: string,
  ) {
    return this.vendasService.listar(page, limit, { dataInicio, dataFim, clienteId });
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.vendasService.obter(id);
  }
}
