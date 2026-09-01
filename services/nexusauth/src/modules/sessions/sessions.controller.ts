import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SessionsService } from './sessions.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RedisService } from '../../redis/redis.service';

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(JwtAuthGuard)
export class SessionsController {
  constructor(
    private sessionsService: SessionsService,
    private redisService: RedisService,
  ) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar sessões ativas' })
  async list(@CurrentUser() user: any) {
    return this.sessionsService.listSessions(user.sub);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revogar sessão específica' })
  async revoke(
    @CurrentUser() user: any,
    @Param('id') sessionId: string,
  ) {
    return this.sessionsService.revokeSession(user.sub, sessionId);
  }

  @Post('logout-all')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Encerrar todas as sessões' })
  async logoutAll(
    @CurrentUser() user: any,
    @Query('keepCurrent') keepCurrent: string,
    @Req() req: Request,
  ) {
    // V4 fix: rate limit logout-all per user
    const key = `ratelimit:logout:${user.sub}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 300);
    if (count > 5) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many logout attempts. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    const keep = keepCurrent === 'true';
    return this.sessionsService.logoutAll(user.sub, keep ? user.sessionId : undefined);
  }
}
