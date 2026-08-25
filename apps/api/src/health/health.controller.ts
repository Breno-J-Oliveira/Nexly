import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
import { version } from '../../package.json';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('REDIS_SERVICE') private readonly redis?: RedisService,
  ) {}

  /**
   * Health check "liveness" — sempre 200 enquanto o processo Node estiver vivo.
   * Usado por load balancers / Railway para saber se devem reiniciar a instância.
   * Para checagem profunda de DB/Redis, use `GET /health/deep`.
   */
  @Public()
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Health check profundo — testa dependências (PostgreSQL e Redis) e retorna
   * `status: 'degraded'` se alguma falhar. Retorna HTTP 200 mesmo em estado
   * degradado (operador decide o que fazer) ou 503 se for crítico.
   */
  @Public()
  @Get('deep')
  async checkDeep() {
    const checks = await Promise.all([this.checkDb(), this.checkRedis()]);
    const allOk = checks.every((c) => c.ok);
    return {
      status: allOk ? 'ok' : 'degraded',
      version,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        database: checks[0],
        redis: checks[1],
      },
    };
  }

  /**
   * Versão do backend (do `package.json`). Útil para versionamento
   * de API e para debugging de ambiente.
   */
  @Public()
  @Get('version')
  version_() {
    return { version, node: process.version, env: process.env.NODE_ENV ?? 'development' };
  }

  private async checkDb(): Promise<{ ok: boolean; latencyMs?: number; error?: string }> {
    const start = Date.now();
    try {
      await this.prisma.client.$queryRaw`SELECT 1`;
      return { ok: true, latencyMs: Date.now() - start };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }

  private async checkRedis(): Promise<{ ok: boolean; error?: string }> {
    if (!this.redis) {
      return { ok: true }; // Em testes ou sem Redis, não reporta falha.
    }
    try {
      const pong = await (this.redis as unknown as { client?: { ping: () => Promise<string> } })
        .client?.ping?.();
      return { ok: pong === 'PONG' };
    } catch (error) {
      return { ok: false, error: String(error) };
    }
  }
}
