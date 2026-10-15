import { Response } from 'express';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('Health profundo', () => {
  it('não declara Redis saudável quando o PING falha', async () => {
    const redis = { ping: jest.fn().mockResolvedValue(false) };
    const prisma = { client: { $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]) } };
    const controller = new HealthController(
      prisma as unknown as PrismaService,
      redis as unknown as RedisService,
    );
    const result = await controller.checkDeep();
    expect(redis.ping).toHaveBeenCalled();
    expect(result.redis).toBe('error');
    expect(result.status).toBe('degraded');
    expect(result.db).toBe('ok');
  });
});

describe('Health sem vazamento', () => {
  it('nao publica migrations sem autenticacao', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        Object.getOwnPropertyDescriptor(HealthController.prototype, 'migrations')?.value as object,
      ) as unknown,
    ).not.toBe(true);
  });
  it('readiness falha com 503 sem expor detalhes de conexao', async () => {
    const prisma = {
      client: {
        $queryRaw: jest.fn().mockRejectedValue(new Error('postgres://usuario:segredo@host/banco')),
      },
    };
    const controller = new HealthController(
      prisma as unknown as PrismaService,
      { ping: jest.fn().mockResolvedValue(true) } as unknown as RedisService,
    );
    const response = { status: jest.fn() };
    const data = await controller.checkDeep(response as unknown as Response);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(JSON.stringify(data)).not.toMatch(/segredo|postgres|host/);
  });
});
