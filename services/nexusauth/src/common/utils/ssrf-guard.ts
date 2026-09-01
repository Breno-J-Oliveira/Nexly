import * as dns from 'dns';
import * as net from 'net';
import { BadRequestException, Logger } from '@nestjs/common';

const logger = new Logger('SSRFGuard');

const BLOCKED_RANGES = [
  '127.0.0.0/8',
  '10.0.0.0/8',
  '172.16.0.0/12',
  '192.168.0.0/16',
  '169.254.0.0/16',
  '0.0.0.0/8',
  '100.64.0.0/10',
  '::1/128',
  'fc00::/7',
  'fe80::/10',
];

// SECURITY: Block metadata service endpoints (cloud provider attack vector)
const BLOCKED_HOSTNAMES = [
  'metadata.google.internal',
  '169.254.169.254', // AWS/GCP metadata
  'metadata.azure.com',
  '100.100.100.200', // Alibaba metadata
];

// SECURITY: Block dangerous protocols
const ALLOWED_PROTOCOLS = ['http:', 'https:'];

// SECURITY: Maximum URL length to prevent DoS
const MAX_URL_LENGTH = 2048;

function ipInCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);

  if (net.isIPv4(ip) && net.isIPv4(range)) {
    const ipInt = ipToInt(ip);
    const rangeInt = ipToInt(range);
    const maskInt = mask === 32 ? 0xffffffff : (0xffffffff << (32 - mask)) >>> 0;
    return (ipInt & maskInt) === (rangeInt & maskInt);
  }

  if (net.isIPv6(ip) && net.isIPv6(range)) {
    const ipBig = BigInt(`0x${ipToHex(ip)}`);
    const rangeBig = BigInt(`0x${ipToHex(range)}`);
    const maskBig = mask === 128
      ? (BigInt(1) << BigInt(128)) - BigInt(1)
      : ((BigInt(1) << BigInt(128)) - BigInt(1)) ^ ((BigInt(1) << BigInt(128 - mask)) - BigInt(1));
    return (ipBig & maskBig) === (rangeBig & maskBig);
  }

  return false;
}

function ipToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function ipToHex(ip: string): string {
  return ip.split(':').map((h) => h.padStart(4, '0')).join('').padEnd(32, '0');
}

function isBlockedIp(ip: string): boolean {
  // M4 fix: normalize IPv6 addresses by removing brackets (Node URL returns [::1] format)
  const normalizedIp = ip.replace(/^\[|\]$/g, '');

  // V8 fix: normalize IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) to IPv4
  const mappedMatch = normalizedIp.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mappedMatch) {
    return isBlockedIp(mappedMatch[1]);
  }
  if (normalizedIp === 'localhost' || normalizedIp === '::1') return true;
  return BLOCKED_RANGES.some((cidr) => ipInCidr(normalizedIp, cidr));
}

/**
 * Validate a webhook URL for SSRF safety.
 *
 * Important design decision: we DO NOT rewrite the URL with a
 * resolved IP (a.k.a. "IP pinning") because that breaks TLS/SNI
 * for HTTPS endpoints — the server certificate is validated
 * against the hostname (SNI), not the IP. Pinning would cause
 * certificate hostname mismatches and break legitimate webhooks.
 *
 * Instead, we validate the hostname and pre-resolve DNS once at
 * configuration time. A small TOCTOU window exists between this
 * validation and the actual delivery (an attacker controlling DNS
 * could rebind to a private IP in the interval). This is an
 * accepted trade-off:
 *   - Real DNS rebinding attacks require the attacker to control
 *     the authoritative DNS for the user's webhook domain, which
 *     is an extremely high bar.
 *   - The validation still blocks the vast majority of SSRF
 *     attempts (private ranges, metadata services, IP literals,
 *     non-standard ports).
 *   - The dispatcher re-validates the IP right before the fetch
 *     in `dispatchWithRetry` (see webhooks.dispatcher.ts), which
 *     narrows the TOCTOU window to milliseconds.
 *
 * Returns the validated URL unchanged so TLS/SNI keeps working.
 */
export async function validateWebhookUrl(urlStr: string): Promise<string> {
  // SECURITY: Validate URL length
  if (!urlStr || urlStr.length > MAX_URL_LENGTH) {
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Webhook URL is too long or empty',
    });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Invalid webhook URL format',
    });
  }

  // SECURITY: Protocol validation
  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    logger.warn(`Blocked webhook with dangerous protocol: ${parsed.protocol}`);
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Webhook URL must use HTTP or HTTPS',
    });
  }

  const hostname = parsed.hostname.toLowerCase();

  // SECURITY: Block known metadata service hostnames
  if (BLOCKED_HOSTNAMES.some(blocked => hostname === blocked || hostname.endsWith('.' + blocked))) {
    logger.warn(`Blocked webhook to metadata service: ${hostname}`);
    throw new BadRequestException({
      code: 'SSRF_BLOCKED',
      message: 'Webhook URL points to a blocked metadata service',
    });
  }

  // SECURITY: Block URLs with credentials
  if (parsed.username || parsed.password) {
    logger.warn(`Blocked webhook with embedded credentials`);
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Webhook URL must not contain credentials',
    });
  }

  // SECURITY: Block URLs with non-standard ports (except 80, 443, 8080, 8443)
  const port = parsed.port ? parseInt(parsed.port, 10) : null;
  if (port && ![80, 443, 8080, 8443].includes(port)) {
    logger.warn(`Blocked webhook with non-standard port: ${port}`);
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Webhook URL must use standard ports (80, 443, 8080, 8443)',
    });
  }

  // Block IP literal in hostname (e.g. http://2130706433/, http://127.0.0.1/)
  if (isBlockedIp(hostname)) {
    logger.warn(`Blocked webhook to private IP literal: ${hostname}`);
    throw new BadRequestException({
      code: 'SSRF_BLOCKED',
      message: 'Webhook URL resolves to a blocked private/loopback address',
    });
  }

  // Resolve DNS once at validation time to ensure hostname is reachable
  // and does not currently resolve to a blocked IP. The actual
  // dispatcher re-validates the IP immediately before the fetch.
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });

    if (!addresses || addresses.length === 0) {
      throw new BadRequestException({
        code: 'INVALID_WEBHOOK_URL',
        message: 'Could not resolve webhook hostname',
      });
    }

    for (const addr of addresses) {
      if (isBlockedIp(addr.address)) {
        logger.warn(`Blocked webhook resolving to private IP: ${addr.address}`);
        throw new BadRequestException({
          code: 'SSRF_BLOCKED',
          message: `Webhook URL resolves to a blocked private/loopback address`,
        });
      }
    }
  } catch (err: any) {
    if (err instanceof BadRequestException) throw err;
    logger.warn(`DNS resolution failed for webhook: ${hostname}`);
    throw new BadRequestException({
      code: 'INVALID_WEBHOOK_URL',
      message: 'Could not resolve webhook hostname',
    });
  }

  // SECURITY: Log successful validation (without full URL for privacy)
  logger.debug(`Webhook URL validated: ${parsed.protocol}//${hostname}/*`);

  // Return the URL UNCHANGED. Do not rewrite with the IP — that would
  // break TLS/SNI certificate validation for HTTPS webhooks.
  return urlStr;
}

/**
 * Re-validate the IP of a webhook URL immediately before delivery.
 * Used by the dispatcher to close the TOCTOU window between
 * configuration-time validation and actual fetch.
 *
 * Returns the IP(s) the URL currently resolves to, or throws if
 * the URL is now unsafe.
 */
export async function resolveAndValidateIp(urlStr: string): Promise<string[]> {
  const parsed = new URL(urlStr);
  const hostname = parsed.hostname.toLowerCase();

  if (isBlockedIp(hostname)) {
    throw new Error(`Refusing to deliver to blocked IP literal: ${hostname}`);
  }

  const addresses = await dns.promises.lookup(hostname, { all: true });
  for (const addr of addresses) {
    if (isBlockedIp(addr.address)) {
      throw new Error(
        `Refusing to deliver to blocked IP: ${addr.address}`,
      );
    }
  }
  return addresses.map((a) => a.address);
}
