import { Module } from '@nestjs/common';
import { AssinaturasModule } from '../assinaturas/assinaturas.module';
import { PlatformAccessModule } from '../platform-access/platform-access.module';
import { PlatformController } from './platform.controller';
import { PlatformOverviewService } from './platform-overview.service';

@Module({
  imports: [AssinaturasModule, PlatformAccessModule],
  controllers: [PlatformController],
  providers: [PlatformOverviewService],
})
export class PlatformModule {}
