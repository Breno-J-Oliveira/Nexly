import { Module } from '@nestjs/common';
import { AssinaturasController } from './assinaturas.controller';
import { AssinaturasService } from './assinaturas.service';
import { StripeGateway } from './stripe.gateway';

@Module({ controllers: [AssinaturasController], providers: [AssinaturasService, StripeGateway] })
export class AssinaturasModule {}
