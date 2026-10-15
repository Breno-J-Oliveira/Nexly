import { expect, test } from '@playwright/test';
import { expiryDays, formatExpiry } from '../../apps/web/src/lib/expiry';

test('stored UTC midnight is the same calendar expiry date in Brazil', () => {
  expect(expiryDays('2026-10-15T00:00:00.000Z', new Date(2026, 9, 15, 23, 59))).toBe(0);
  expect(formatExpiry('2026-10-15T00:00:00.000Z')).toBe('15/10/2026');
  expect(expiryDays('2026-10-15T00:00:00.000Z', new Date(2026, 9, 16, 0, 1))).toBe(-1);
});
