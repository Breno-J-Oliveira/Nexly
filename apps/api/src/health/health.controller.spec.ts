import { Prisma } from '@prisma/client';
import { Response } from 'express';
import { IS_PUBLIC_KEY } from '../common/decorators/public.decorator';
import { HealthController } from './health.controller';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

const columns = () =>
  Prisma.dmmf.datamodel.models.flatMap((model) =>
    model.fields
      .filter((field) => field.kind !== 'object')
      .map((field) => ({
        table_name: model.dbName ?? model.name,
        column_name: field.dbName ?? field.name,
      })),
  );

describe('Health profundo', () => {
  it('não declara Redis saudável quando o PING falha', async () => {
    const redis = { ping: jest.fn().mockResolvedValue(false) };
    const prisma = { client: { $queryRaw: jest.fn().mockResolvedValue(columns()) } };
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
  it('identifica o commit publicado e rejeita metadados inesperados', () => {
    const previous = process.env.RAILWAY_GIT_COMMIT_SHA;
    const controller = new HealthController({} as PrismaService, {} as RedisService);
    try {
      process.env.RAILWAY_GIT_COMMIT_SHA = 'a'.repeat(40);
      expect(controller.version_().commit).toBe('a'.repeat(40));
      process.env.RAILWAY_GIT_COMMIT_SHA = 'valor-invalido-nao-publicar';
      expect(controller.version_().commit).toBeNull();
      delete process.env.RAILWAY_GIT_COMMIT_SHA;
      expect(controller.version_().commit).toBeNull();
    } finally {
      if (previous === undefined) delete process.env.RAILWAY_GIT_COMMIT_SHA;
      else process.env.RAILWAY_GIT_COMMIT_SHA = previous;
    }
  });
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
  it('recusa readiness quando o banco responde mas falta uma coluna da sessao', async () => {
    const prisma = {
      client: {
        $queryRaw: jest
          .fn()
          .mockResolvedValue(
            columns().filter(
              (column) =>
                !(column.table_name === 'sessoes' && column.column_name === 'last_rotation_at'),
            ),
          ),
      },
    };
    const controller = new HealthController(
      prisma as unknown as PrismaService,
      { ping: jest.fn().mockResolvedValue(true) } as unknown as RedisService,
    );
    const response = { status: jest.fn() };
    const result = await controller.checkDeep(response as unknown as Response);
    expect(response.status).toHaveBeenCalledWith(503);
    expect(result.db).toBe('error');
    expect(JSON.stringify(result)).not.toContain('last_rotation_at');
  });
  it('informa migrations pendentes quando o historico esta atrasado', async () => {
    const controller = new HealthController(
      { client: { $queryRaw: jest.fn().mockResolvedValue([]) } } as unknown as PrismaService,
      {} as RedisService,
    );
    const result = await controller.migrations();
    expect(result.ok).toBe(false);
    expect(result.pending).toContain('20261015063719_restrict_public_data_access');
  });
});
