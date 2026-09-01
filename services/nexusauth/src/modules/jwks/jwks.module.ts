import { Module } from '@nestjs/common';
import { JwksController } from './jwks.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [JwksController],
})
export class JwksModule {}
