import { Injectable } from '@nestjs/common';

/**
 * Rate limit simples **em memória** para tentativas de login falhas.
 *
 * Bloqueia o par (email + IP) após `MAX_ATTEMPTS` falhas dentro de
 * `WINDOW_MS` milissegundos. Mantém um Map com timestamp de expiração.
 *
 * **Limitação**: em deploy multi-instância (mais de 1 processo), cada
 * instância tem seu próprio contador — um atacante poderia distribuir
 * tentativas. Para produção, troque por Redis com `INCR` + `EXPIRE`
 * (mesma interface, mas compartilhado entre réplicas).
 */
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 min
const BLOCK_MS = 15 * 60 * 1000; // 15 min de bloqueio

interface Bucket {
  count: number;
  windowStart: number;
  blockedUntil?: number;
}

@Injectable()
export class LoginThrottleService {
  private readonly buckets = new Map<string, Bucket>();

  /**
   * Chame **antes** de tentar autenticar. Retorna `true` se está bloqueado.
   * Lança `UnauthorizedException` com `code: LOGIN_TOO_MANY_ATTEMPTS` se bloqueado.
   */
  isBlocked(key: string): boolean {
    this.cleanup();
    const bucket = this.buckets.get(key);
    if (!bucket) return false;
    return Boolean(bucket.blockedUntil && bucket.blockedUntil > Date.now());
  }

  /**
   * Chame **depois** de uma tentativa falha. Pode disparar bloqueio.
   */
  registerFailure(key: string): void {
    this.cleanup();
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || now - bucket.windowStart > WINDOW_MS) {
      this.buckets.set(key, { count: 1, windowStart: now });
      return;
    }
    bucket.count += 1;
    if (bucket.count >= MAX_ATTEMPTS) {
      bucket.blockedUntil = now + BLOCK_MS;
    }
  }

  /**
   * Chame depois de um login bem-sucedido — limpa o contador do par.
   */
  registerSuccess(key: string): void {
    this.buckets.delete(key);
  }

  /** Quantos segundos restam no bloqueio (0 se não está bloqueado). */
  retryAfterSeconds(key: string): number {
    const bucket = this.buckets.get(key);
    if (!bucket?.blockedUntil) return 0;
    return Math.max(0, Math.ceil((bucket.blockedUntil - Date.now()) / 1000));
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      const expired = bucket.blockedUntil && bucket.blockedUntil < now;
      const windowExpired = now - bucket.windowStart > WINDOW_MS * 2;
      if (expired && windowExpired) this.buckets.delete(key);
    }
  }
}
