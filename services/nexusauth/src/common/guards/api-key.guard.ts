import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException({
        code: 'MISSING_API_KEY',
        message: 'Missing x-api-key header',
      });
    }

    const keyData = await this.apiKeysService.validate(apiKey);

    if (!keyData) {
      throw new UnauthorizedException({
        code: 'INVALID_API_KEY',
        message: 'Invalid or revoked API key',
      });
    }

    request.user = {
      sub: keyData.userId,
      tenantId: keyData.tenantId,
      permissions: keyData.permissions,
      type: 'api-key',
    };

    return true;
  }
}
