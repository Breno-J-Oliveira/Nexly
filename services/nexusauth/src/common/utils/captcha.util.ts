import { BadRequestException, Logger } from '@nestjs/common';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * C35 FIX: CAPTCHA verification for registration and sensitive endpoints.
 *
 * Uses Cloudflare Turnstile (free, privacy-friendly, no user tracking).
 * To enable:
 *   1. Register at https://dash.cloudflare.com/?to=/:account/turnstile
 *   2. Get a Site Key and Secret Key
 *   3. Set TURNSTILE_SECRET_KEY in your .env
 *   4. Add the Turnstile widget to your frontend registration form
 *
 * Without TURNSTILE_SECRET_KEY set, CAPTCHA verification is SKIPPED.
 * This is intentional — the project should work out of the box in dev.
 * Production MUST set this to prevent bot registrations.
 */
export async function verifyCaptcha(
  token: string,
  ipAddress?: string,
): Promise<void> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  // If not configured, skip verification (development mode).
  // In production, this should ALWAYS be set.
  if (!secretKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException({
        code: 'CAPTCHA_NOT_CONFIGURED',
        message: 'CAPTCHA verification is not configured on the server',
      });
    }
    // SECURITY: Log warning in development so developers know CAPTCHA is off
    Logger.warn(
      '⚠️  TURNSTILE_SECRET_KEY not set — CAPTCHA verification is DISABLED.',
      'CaptchaGuard',
    );
    return;
  }

  // SECURITY: Validate token length to prevent abuse
  if (!token || typeof token !== 'string' || token.length < 10 || token.length > 2048) {
    throw new BadRequestException({
      code: 'INVALID_CAPTCHA_TOKEN',
      message: 'Invalid CAPTCHA token',
    });
  }

  const formData = new URLSearchParams();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (ipAddress) {
    formData.append('remoteip', ipAddress);
  }

  let result: { success: boolean; 'error-codes'?: string[] };
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Turnstile API returned HTTP ${response.status}`);
    }

    result = await response.json();
  } catch (err: any) {
    // SECURITY: Fail closed — if CAPTCHA service is unreachable, reject
    Logger.error(`Turnstile verification failed: ${err.message}`, 'CaptchaGuard');
    throw new BadRequestException({
      code: 'CAPTCHA_SERVICE_UNAVAILABLE',
      message: 'CAPTCHA verification service is temporarily unavailable. Please try again.',
    });
  }

  if (!result.success) {
    const errorCodes = result['error-codes']?.join(', ') || 'unknown';
    Logger.warn(`CAPTCHA verification failed: ${errorCodes} (IP: ${ipAddress || 'unknown'})`, 'CaptchaGuard');
    throw new BadRequestException({
      code: 'CAPTCHA_FAILED',
      message: 'CAPTCHA verification failed. Please try again.',
    });
  }
}