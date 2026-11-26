import { Module } from '@nestjs/common';
import { PlatformAccessModule } from '../platform-access/platform-access.module';
import { PlatformWorkspaceController } from './platform-workspace.controller';
import { PlatformWorkspaceService } from './platform-workspace.service';

@Module({
  imports: [PlatformAccessModule],
  controllers: [PlatformWorkspaceController],
  providers: [PlatformWorkspaceService],
})
export class PlatformWorkspaceModule {}
