import { Module } from '@nestjs/common';
import { FidelidadeController } from './fidelidade.controller';
import { FidelidadeService } from './fidelidade.service';

@Module({ controllers: [FidelidadeController], providers: [FidelidadeService] })
export class FidelidadeModule {}
