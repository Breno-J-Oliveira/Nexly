import { HttpException, ServiceUnavailableException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { ExportLeaseService } from './export-lease.service';

describe('ExportLeaseService', () => {
  const leases = new Map<string, string>();
  const redis = {
    setOnce: jest.fn((key: string, token: string) => {
      if (leases.has(key)) return Promise.resolve(false);
      leases.set(key, token);
      return Promise.resolve(true);
    }),
    releaseLease: jest.fn((key: string, token: string) => {
      if (leases.get(key) !== token) return Promise.resolve(false);
      return Promise.resolve(leases.delete(key));
    }),
  };
  const service = new ExportLeaseService(redis as unknown as RedisService);
  beforeEach(() => {
    leases.clear();
    jest.clearAllMocks();
  });

  it('blocks another user of the same tenant and allows a different tenant', async () => {
    let complete!: () => void;
    const pending = service.run(
      'a',
      () =>
        new Promise<void>((resolve) => {
          complete = resolve;
        }),
    );
    await Promise.resolve();
    const forbidden = jest.fn();
    await expect(service.run('a', forbidden)).rejects.toBeInstanceOf(HttpException);
    expect(forbidden).not.toHaveBeenCalled();
    await expect(service.run('b', () => Promise.resolve(['complete', 'data']))).resolves.toEqual([
      'complete',
      'data',
    ]);
    complete();
    await pending;
    await expect(service.run('a', () => Promise.resolve('retry'))).resolves.toBe('retry');
    expect(redis.setOnce).toHaveBeenCalledWith('lgpd:export:lease:a', expect.any(String), 900);
  });

  it('fails closed when Redis is unavailable and never starts export', async () => {
    redis.setOnce.mockResolvedValueOnce(null as unknown as boolean);
    const operation = jest.fn();
    await expect(service.run('a', operation)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(operation).not.toHaveBeenCalled();
    expect(redis.releaseLease).not.toHaveBeenCalled();
  });

  it('releases on an export error and preserves the original failure', async () => {
    const error = new Error('database unavailable');
    await expect(service.run('a', () => Promise.reject(error))).rejects.toBe(error);
    expect(leases.size).toBe(0);
  });

  it('does not remove a successor after the bounded lease expires', async () => {
    await service.run('a', () => {
      leases.set('lgpd:export:lease:a', 'successor-token');
      return Promise.resolve();
    });
    expect(leases.get('lgpd:export:lease:a')).toBe('successor-token');
  });

  it('preserves the export result when releasing Redis is unavailable', async () => {
    redis.releaseLease.mockResolvedValueOnce(null as unknown as boolean);
    await expect(service.run('a', () => Promise.resolve('complete'))).resolves.toBe('complete');
    const error = new Error('export failed');
    redis.releaseLease.mockResolvedValueOnce(null as unknown as boolean);
    await expect(service.run('b', () => Promise.reject(error))).rejects.toBe(error);
  });
});
