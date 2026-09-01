import * as crypto from 'crypto';
import { Logger } from '@nestjs/common';

const logger = new Logger('BreachedPassword');

/**
 * Check if a password appears in known breach databases using the
 * Have I Been Pwned (HIBP) Pwned Passwords API.
 *
 * This uses the k-anonymity model: only the first 5 characters of the
 * SHA-1 hash of the password are sent to the API. The full password
 * never leaves the server.
 *
 * The API returns a list of suffixes with breach counts. If any
 * matches, the password is known to be compromised.
 *
 * https://haveibeenpwned.com/API/v3#PwnedPasswords
 */
export async function isBreachedPassword(
  password: string,
): Promise<{ breached: boolean; count: number }> {
  if (!password) {
    return { breached: false, count: 0 };
  }

  // Compute SHA-1 hash
  const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
  const prefix = sha1.substring(0, 5);
  const suffix = sha1.substring(5);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        method: 'GET',
        headers: { 'User-Agent': 'NexusAuth-Security-Check' },
        signal: controller.signal,
      },
    );

    clearTimeout(timeout);

    if (!response.ok) {
      // If API is unavailable, fail open (don't block registration)
      logger.warn(
        `HIBP API returned ${response.status} — failing open. Password not checked.`,
      );
      return { breached: false, count: 0 };
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [lineSuffix, countStr] = line.trim().split(':');
      if (lineSuffix === suffix) {
        const count = parseInt(countStr, 10);
        logger.warn(
          `Password hash suffix ${lineSuffix} found in breach database (${count} occurrences)`,
        );
        return { breached: true, count };
      }
    }

    return { breached: false, count: 0 };
  } catch (err) {
    // Fail open on network/timeout errors
    logger.error(
      `Failed to check breached password: ${err instanceof Error ? err.message : 'unknown'}`,
    );
    return { breached: false, count: 0 };
  }
}
