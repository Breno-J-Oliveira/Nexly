import { Module } from '@nestjs/common';
import { EstoqueController } from './estoque.controller';
import { EstoqueIntegracaoService } from './estoque-integracao.service';
import { EstoqueService } from './estoque.service';

@Module({
  controllers: [EstoqueController],
  providers: [EstoqueService, EstoqueIntegracaoService],
  exports: [EstoqueService],
})
export class EstoqueModule {}
