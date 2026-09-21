import { Module } from '@nestjs/common';
import { EstoqueModule } from '../estoque/estoque.module';
import { PedidosCompraController } from './pedidos-compra.controller';
import { PedidosCompraService } from './pedidos-compra.service';

@Module({
  imports: [EstoqueModule],
  controllers: [PedidosCompraController],
  providers: [PedidosCompraService],
})
export class PedidosCompraModule {}
