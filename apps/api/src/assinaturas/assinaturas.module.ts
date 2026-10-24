import { Module } from '@nestjs/common';
import { AssinaturasController } from './assinaturas.controller';
import { AssinaturasService } from './assinaturas.service';
import { StripeGateway } from './stripe.gateway';
import { AssinaturasScheduler } from './assinaturas.scheduler';

@Module({
  controllers: [AssinaturasController],
  providers: [AssinaturasService, StripeGateway, AssinaturasScheduler],
  exports: [AssinaturasService],
})
export class AssinaturasModule {}
