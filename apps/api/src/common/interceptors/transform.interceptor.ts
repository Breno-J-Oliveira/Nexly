import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { map, Observable } from 'rxjs';
import { hasPermission, Role } from '@nexly/shared';

// Campos que NUNCA devem ser serializados para o cliente, mesmo que um
// service retorne o objeto Prisma completo por engano. É uma defesa em
// profundidade: o hash da senha, o secret do TOTP e os códigos de backup
// (que ficam armazenados apenas como hash) nunca saem da API.
const SENSITIVE_KEYS = new Set([
  'senhaHash',
  'googleSubject',
  'twoFactorSecret',
  'twoFactorBackupCodes',
  'twoFactorChallengeHash',
  'twoFactorChallengeExpiresAt',
  'twoFactorLastUsedStep',
  'lastRotationResponse',
]);

const COMMISSION_KEYS = new Set(['comissaoPercentual', 'comissaoPercentualAplicada']);

function toPlain(value: unknown, hideCommission: boolean): unknown {
  if (value === null || value === undefined) return value;
  if (value instanceof Prisma.Decimal) return value.toNumber();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => toPlain(item, hideCommission));
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key) || (hideCommission && COMMISSION_KEYS.has(key))) continue;
      result[key] = toPlain(val, hideCommission);
    }
    return result;
  }
  return value;
}

@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const user = context.switchToHttp().getRequest<{ user?: { role?: Role } }>().user;
    const hideCommission = !hasPermission(user?.role, 'comissao:read');
    return next.handle().pipe(map((data) => toPlain(data, hideCommission)));
  }
}
