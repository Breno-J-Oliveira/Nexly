import { Module } from '@nestjs/common';
import { AvaliacoesController } from './avaliacoes.controller';
import { AvaliacoesService } from './avaliacoes.service';

@Module({ controllers: [AvaliacoesController], providers: [AvaliacoesService] })
export class AvaliacoesModule {}
