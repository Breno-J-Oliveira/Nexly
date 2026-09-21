import { Module } from '@nestjs/common';
import { CuponsController } from './cupons.controller';
import { CuponsService } from './cupons.service';

@Module({
  controllers: [CuponsController],
  providers: [CuponsService],
  exports: [CuponsService],
})
export class CuponsModule {}
