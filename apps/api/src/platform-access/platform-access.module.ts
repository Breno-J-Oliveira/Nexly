import { Module } from '@nestjs/common';
import { PlatformAccessController } from './platform-access.controller';
import { PlatformAccessGuard } from './platform-access.guard';
import { PlatformTeamService } from './platform-team.service';

@Module({
  controllers: [PlatformAccessController],
  providers: [PlatformAccessGuard, PlatformTeamService],
  exports: [PlatformAccessGuard],
})
export class PlatformAccessModule {}
