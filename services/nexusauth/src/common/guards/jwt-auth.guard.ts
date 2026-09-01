import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtService } from '../../modules/auth/jwt.service';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private redisService: RedisService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        code: 'MISSING_AUTH_HEADER',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);

    // SECURITY: Validate token length to prevent DoS via huge tokens
    if (token.length > 4096) {
      this.logger.warn(`Token too long: ${token.length} chars from IP: ${request.ip}`);
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Invalid token format',
      });
    }

    try {
      const payload = await this.jwtService.verify(token);

      if (payload.type !== 'access' && payload.type !== 'impersonation') {
        throw new UnauthorizedException({
          code: 'TOKEN_INVALID',
          message: 'Invalid token type for this endpoint',
        });
      }

      const isBlacklisted = await this.redisService.exists(
        `blacklist:${payload.jti}`,
      );
      if (isBlacklisted) {
        throw new UnauthorizedException({
          code: 'TOKEN_REVOKED',
          message: 'Token has been revoked',
        });
      }

      // SECURITY: Validate session is still active (prevents use of tokens from revoked sessions)
      if (payload.sessionId) {
        const session = await this.prisma.session.findUnique({
          where: { id: payload.sessionId },
          select: { active: true },
        });
        
        if (!session || !session.active) {
          // Blacklist this token to prevent further attempts
          const now = Math.floor(Date.now() / 1000);
          const ttl = payload.exp - now;
          if (ttl > 0) {
            await this.redisService.set(`blacklist:${payload.jti}`, '1', ttl);
          }
          throw new UnauthorizedException({
            code: 'SESSION_REVOKED',
            message: 'Session has been revoked',
          });
        }
      }

      // C9 FIX: Update lastActiveAt on every authenticated request (non-blocking).
      // Prevents session inactivity timeout while user is actively using the API.
      if (payload.sessionId) {
        setImmediate(() => {
          this.prisma.session.update({
            where: { id: payload.sessionId },
            data: { lastActiveAt: new Date() },
          }).catch(() => {});
        });
      }

      request.user = payload;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      
      // SECURITY: Log authentication failures for security monitoring
      this.logger.warn({
        message: 'Authentication failed',
        ip: request.ip,
        path: request.path,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      throw new UnauthorizedException({
        code: 'TOKEN_INVALID',
        message: 'Invalid or expired token',
      });
    }
  }
}
