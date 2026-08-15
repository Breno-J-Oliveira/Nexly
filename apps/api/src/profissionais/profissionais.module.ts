import { Module } from '@nestjs/common';
import { ProfissionaisController } from './profissionais.controller';
import { ProfissionaisService } from './profissionais.service';

@Module({
  controllers: [ProfissionaisController],
  providers: [ProfissionaisService],
})
export class ProfissionaisModule {}
