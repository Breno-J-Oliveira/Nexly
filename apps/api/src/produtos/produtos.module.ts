import { Module } from '@nestjs/common';
import { ProdutosController } from './produtos.controller';
import { ProdutosService } from './produtos.service';

@Module({
  controllers: [ProdutosController],
  providers: [ProdutosService],
})
export class ProdutosModule {}
