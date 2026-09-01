import {
  Controller,
  Get,
  Req,
  Res,
  UseGuards,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { OAuthService } from './oauth.service';
import { Public } from '../../common/decorators/public.decorator';
import { RedisService } from '../../redis/redis.service';

@Controller('auth')
export class OAuthController {
  constructor(
    private oauthService: OAuthService,
    private redisService: RedisService,
  ) {}

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const ipAddress = req.ip || 'unknown';
    const key = `ratelimit:oauth:google:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 60);
    if (count > 10) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // A5 FIX: Validate CSRF state parameter to prevent OAuth account hijacking.
    // The state is set by the frontend before redirecting to Google and stored in Redis.
    const state = req.query.state as string;
    if (!state) {
      throw new BadRequestException({
        code: 'OAUTH_MISSING_STATE',
        message: 'Missing OAuth state parameter. CSRF protection required.',
      });
    }
    const stateValid = await this.redisService.exists(`oauth:state:${state}`);
    if (!stateValid) {
      throw new BadRequestException({
        code: 'OAUTH_INVALID_STATE',
        message: 'Invalid or expired OAuth state parameter.',
      });
    }
    // Clear state from Redis to prevent replay
    await this.redisService.del(`oauth:state:${state}`);

    // V45 FIX: validate that passport populated req.user
    if (!req.user || !(req.user as any).providerId) {
      throw new BadRequestException({
        code: 'OAUTH_PROFILE_MISSING',
        message: 'OAuth profile was not provided by the strategy',
      });
    }
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const result = await this.oauthService.handleOAuthLogin(req.user as any, ipAddress, userAgent);
    res.json(result);
  }

  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {}

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  async githubCallback(@Req() req: Request, @Res() res: Response) {
    const ipAddress = req.ip || 'unknown';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const key = `ratelimit:oauth:github:${ipAddress}`;
    const count = await this.redisService.incr(key);
    if (count === 1) await this.redisService.expire(key, 60);
    if (count > 10) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // A5 FIX: Validate CSRF state parameter to prevent OAuth account hijacking.
    const state = req.query.state as string;
    if (!state) {
      throw new BadRequestException({
        code: 'OAUTH_MISSING_STATE',
        message: 'Missing OAuth state parameter. CSRF protection required.',
      });
    }
    const stateValid = await this.redisService.exists(`oauth:state:${state}`);
    if (!stateValid) {
      throw new BadRequestException({
        code: 'OAUTH_INVALID_STATE',
        message: 'Invalid or expired OAuth state parameter.',
      });
    }
    await this.redisService.del(`oauth:state:${state}`);

    // V45 FIX: validate that passport populated req.user
    if (!req.user || !(req.user as any).providerId) {
      throw new BadRequestException({
        code: 'OAUTH_PROFILE_MISSING',
        message: 'OAuth profile was not provided by the strategy',
      });
    }
    const result = await this.oauthService.handleOAuthLogin(req.user as any, ipAddress, userAgent);
    res.json(result);
  }
}
