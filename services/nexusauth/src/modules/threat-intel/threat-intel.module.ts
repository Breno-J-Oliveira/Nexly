import { Module, Global } from '@nestjs/common';
import { ThreatIntelService } from './threat-intel.service';

@Global()
@Module({
  providers: [ThreatIntelService],
  exports: [ThreatIntelService],
})
export class ThreatIntelModule {}
