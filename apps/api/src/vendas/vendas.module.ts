import { Module } from '@nestjs/common';
import { EstoqueModule } from '../estoque/estoque.module';
import { VendasController } from './vendas.controller';
import { VendasService } from './vendas.service';

@Module({
  imports: [EstoqueModule],
  controllers: [VendasController],
  providers: [VendasService],
})
export class VendasModule {}
