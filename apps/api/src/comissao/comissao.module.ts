import { Module } from '@nestjs/common';
import { ComissaoController } from './comissao.controller';
import { ComissaoService } from './comissao.service';

@Module({ controllers: [ComissaoController], providers: [ComissaoService] })
export class ComissaoModule {}
