import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AtualizarPedidoCompraDto } from './dto/atualizar-pedido-compra.dto';
import { CriarPedidoCompraDto } from './dto/criar-pedido-compra.dto';
import { PedidosCompraService } from './pedidos-compra.service';

@Controller('pedidos-compra')
export class PedidosCompraController {
  constructor(private readonly service: PedidosCompraService) {}

  @Get('sugestao')
  sugestao() {
    return this.service.sugestao();
  }

  @Get()
  listar(@Query('status') status?: string) {
    return this.service.listar(status);
  }

  @Get(':id')
  obter(@Param('id') id: string) {
    return this.service.obter(id);
  }

  @Post()
  criar(@Body() dto: CriarPedidoCompraDto) {
    return this.service.criar(dto);
  }

  @Patch(':id')
  atualizar(@Param('id') id: string, @Body() dto: AtualizarPedidoCompraDto) {
    return this.service.atualizar(id, dto);
  }

  @Patch(':id/enviar')
  enviar(@Param('id') id: string) {
    return this.service.enviar(id);
  }

  @Patch(':id/receber')
  receber(@Param('id') id: string) {
    return this.service.receber(id);
  }

  @Patch(':id/cancelar')
  cancelar(@Param('id') id: string) {
    return this.service.cancelar(id);
  }
}
