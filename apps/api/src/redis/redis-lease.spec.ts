import { RedisService } from './redis.service';

describe('Redis lease release', () => {
  it('uses one atomic token comparison and deletion, with token passed separately', async () => {
    const evalCommand = jest.fn().mockResolvedValue(1);
    const service = Object.create(RedisService.prototype) as RedisService;
    Object.assign(service, { client: { eval: evalCommand } });
    await expect(service.releaseLease('tenant-key', 'owner')).resolves.toBe(true);
    expect(evalCommand).toHaveBeenCalledWith(
      expect.stringContaining("redis.call('GET', KEYS[1]) == ARGV[1]"),
      1,
      'tenant-key',
      'owner',
    );
    evalCommand.mockResolvedValueOnce(0);
    await expect(service.releaseLease('tenant-key', 'old-owner')).resolves.toBe(false);
    evalCommand.mockRejectedValueOnce(new Error('offline'));
    await expect(service.releaseLease('tenant-key', 'owner')).resolves.toBeNull();
  });
});
