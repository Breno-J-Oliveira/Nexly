import { Module } from '@nestjs/common';
import { AssinaturasController } from './assinaturas.controller';
import { AssinaturasService } from './assinaturas.service';
import { StripeGateway } from './stripe.gateway';
import { AssinaturasScheduler } from './assinaturas.scheduler';
import { PlatformCouponsService } from './platform-coupons.service';

@Module({
  controllers: [AssinaturasController],
  providers: [AssinaturasService, StripeGateway, AssinaturasScheduler, PlatformCouponsService],
  exports: [AssinaturasService, StripeGateway, PlatformCouponsService],
})
export class AssinaturasModule {}
