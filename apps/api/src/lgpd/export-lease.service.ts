import { HttpException, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RedisService } from '../redis/redis.service';

/** Bounded reservation shared by all users and replicas of an authenticated tenant. */
@Injectable()
export class ExportLeaseService {
  constructor(private readonly redis: RedisService) {}

  async run<T>(empresaId: string, operation: () => Promise<T>): Promise<T> {
    if (!empresaId) throw new ServiceUnavailableException('Empresa não identificada.');
    const key = `lgpd:export:lease:${empresaId}`;
    const token = randomUUID();
    // Crash recovery is bounded; very large exports still need a streamed/job-based design.
    const acquired = await this.redis.setOnce(key, token, 900);
    if (acquired === null)
      throw new ServiceUnavailableException(
        'Não foi possível reservar a exportação. Tente novamente.',
      );
    if (!acquired)
      throw new HttpException(
        {
          code: 'EXPORT_IN_PROGRESS',
          message: 'Já existe uma exportação em andamento nesta empresa.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    try {
      return await operation();
    } finally {
      await this.redis.releaseLease(key, token);
    }
  }
}
