import { Module } from '@nestjs/common';
import { ConfiguracoesController } from './configuracoes.controller';

@Module({ controllers: [ConfiguracoesController] })
export class ConfiguracoesModule {}