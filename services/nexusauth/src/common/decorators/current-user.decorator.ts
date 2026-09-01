import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * B60 FIX: Typed current-user decorator.
 * Replaces `any` return type with a proper JWT payload interface.
 */
export interface JwtUserPayload {
  sub: string;
  email: string;
  role: string;
  jti: string;
  type: string;
  tenantId?: string;
  permissions?: string[];
  impersonatedBy?: string;
  sessionId?: string;
  exp: number;
  iat: number;
  iss: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtUserPayload;
  },
);
