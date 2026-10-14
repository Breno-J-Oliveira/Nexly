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
