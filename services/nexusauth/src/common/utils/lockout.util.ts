import { RedisService } from '../../redis/redis.service';
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Progressive account lockout.
 *
 * 1st failure:  1 min lock
 * 3rd failure:  5 min lock
 * 5th failure:  15 min lock
 * 10th failure: 24h lock + email notification
 * 20th failure: account disabled, requires admin review
 */
const LOCKOUT_THRESHOLDS = [
  { count: 20, lockMinutes: 0, action: 'disable' as const },
  { count: 10, lockMinutes: 24 * 60, action: 'lock_24h' as const },
  { count: 5, lockMinutes: 15, action: 'lock_15m' as const },
  { count: 3, lockMinutes: 5, action: 'lock_5m' as const },
  { count: 1, lockMinutes: 1, action: 'lock_1m' as const },
];

export interface LockoutState {
  count: number;
  lockedUntil: number | null;
  disabled: boolean;
}

export async function getLockoutState(
  redis: RedisService,
  key: string,
): Promise<LockoutState> {
  const countStr = await redis.get(`lockout:${key}`);
  const count = countStr ? parseInt(countStr, 10) : 0;
  const ttl = await redis.ttl(`lockout:${key}`);
  const disabledStr = await redis.get(`lockout:disabled:${key}`);
  return {
    count,
    lockedUntil: ttl > 0 ? Date.now() + ttl * 1000 : null,
    disabled: disabledStr === '1',
  };
}

export async function recordFailedAttempt(
  redis: RedisService,
  key: string,
): Promise<LockoutState> {
  const lockKey = `lockout:${key}`;
  const count = await redis.incr(lockKey);

  let lockMinutes = 0;
  let action: 'lock_1m' | 'lock_5m' | 'lock_15m' | 'lock_24h' | 'disable' | null = null;

  for (const threshold of LOCKOUT_THRESHOLDS) {
    if (count >= threshold.count) {
      lockMinutes = threshold.lockMinutes;
      action = threshold.action;
      break;
    }
  }

  if (action === 'disable') {
    await redis.set(`lockout:disabled:${key}`, '1', 0); // never expires
    return { count, lockedUntil: null, disabled: true };
  }

  if (lockMinutes > 0) {
    await redis.expire(lockKey, lockMinutes * 60);
  }

  return {
    count,
    lockedUntil: lockMinutes > 0 ? Date.now() + lockMinutes * 60 * 1000 : null,
    disabled: false,
  };
}

export async function checkLockout(
  redis: RedisService,
  key: string,
): Promise<void> {
  const state = await getLockoutState(redis, key);

  if (state.disabled) {
    throw new HttpException(
      {
        code: 'ACCOUNT_DISABLED',
        message:
          'Account disabled due to too many failed attempts. Contact support.',
      },
      HttpStatus.FORBIDDEN,
    );
  }

  if (state.lockedUntil && Date.now() < state.lockedUntil) {
    const retryAfter = Math.ceil((state.lockedUntil - Date.now()) / 1000);
    throw new HttpException(
      {
        code: 'ACCOUNT_LOCKED',
        message: 'Account temporarily locked. Try again later.',
        retryAfter,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export async function clearLockout(
  redis: RedisService,
  key: string,
): Promise<void> {
  await redis.del(`lockout:${key}`);
  await redis.del(`lockout:disabled:${key}`);
}
