import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/** Falhas consecutivas que disparam um bloqueio. */
const MAX_ATTEMPTS = 5;

/** Janela (segundos) em que as falhas consecutivas são contadas. */
const WINDOW_SECONDS = 15 * 60;

/** Após esse tempo sem novas falhas, o nível de penalidade é esquecido. */
const LEVEL_TTL_SECONDS = 24 * 60 * 60;

/** Bloqueio progressivo: 1min → 5min → 15min → 1h (o último se repete). */
const LOCK_STEPS_SECONDS = [60, 300, 900, 3600];

const failKey = (key: string): string => `login:fail:${key}`;
const blockKey = (key: string): string => `login:block:${key}`;
const levelKey = (key: string): string => `login:level:${key}`;

const lockSecondsFor = (level: number): number =>
  LOCK_STEPS_SECONDS[Math.min(Math.max(level, 1) - 1, LOCK_STEPS_SECONDS.length - 1)] ??
  LOCK_STEPS_SECONDS[0]!;

interface MemoryBucket {
  count: number;
  windowStart: number;
  blockedUntil: number;
  level: number;
}

/**
 * Rate limit de tentativas de login.
 *
 * O contador fica no **Redis** (compartilhado entre todas as réplicas do
 * deploy) e o bloqueio é **progressivo**: 1min, 5min, 15min e 1h a cada vez
 * que o limite volta a ser atingido. Um login bem-sucedido limpa o histórico.
 *
 * Quando o Redis está indisponível (Redis fora do ar ou ambiente de teste) o
 * serviço cai para um contador **em memória** — funciona, mas é por instância.
 */
@Injectable()
export class LoginThrottleService {
  private readonly memory = new Map<string, MemoryBucket>();

  constructor(private readonly redis: RedisService) {}

  /** Chame **antes** de autenticar. `true` se a chave está bloqueada. */
  async isBlocked(key: string): Promise<boolean> {
    return (await this.blockedUntilMs(key)) > Date.now();
  }

  /**
   * Chame **depois** de uma tentativa falha. Aplica bloqueio progressivo
   * quando o limite de falhas é atingido.
   */
  async registerFailure(key: string): Promise<void> {
    const count = await this.redis.incr(failKey(key), WINDOW_SECONDS);
    if (count === null) {
      this.memoryFailure(key);
      return;
    }
    if (count < MAX_ATTEMPTS) return;

    const level = (await this.redis.incr(levelKey(key), LEVEL_TTL_SECONDS)) ?? 1;
    await this.redis.set(blockKey(key), String(level), lockSecondsFor(level));
    // Zera o contador para a próxima janela (o bloqueio já está ativo).
    await this.redis.del(failKey(key));
  }

  /** Chame depois de um login bem-sucedido — limpa o histórico da chave. */
  async registerSuccess(key: string): Promise<void> {
    this.memory.delete(key);
    await this.redis.del(failKey(key));
    await this.redis.del(blockKey(key));
    await this.redis.del(levelKey(key));
  }

  /** Quantos segundos restam do bloqueio (0 se não está bloqueado). */
  async retryAfterSeconds(key: string): Promise<number> {
    const blockedUntil = await this.blockedUntilMs(key);
    return Math.max(0, Math.ceil((blockedUntil - Date.now()) / 1000));
  }

  // ── Interno ──────────────────────────────────────────────

  private async blockedUntilMs(key: string): Promise<number> {
    const ttl = await this.redis.ttl(blockKey(key));
    if (ttl !== null && ttl > 0) return Date.now() + ttl * 1000;
    return this.memory.get(key)?.blockedUntil ?? 0;
  }

  /** Fallback em memória (mesma regra de bloqueio progressivo). */
  private memoryFailure(key: string): void {
    const now = Date.now();
    const bucket = this.memory.get(key);
    if (!bucket || now - bucket.windowStart > WINDOW_SECONDS * 1000) {
      this.memory.set(key, {
        count: 1,
        windowStart: now,
        blockedUntil: 0,
        level: bucket?.level ?? 0,
      });
      return;
    }
    bucket.count += 1;
    if (bucket.count < MAX_ATTEMPTS) return;

    bucket.level += 1;
    bucket.blockedUntil = now + lockSecondsFor(bucket.level) * 1000;
    bucket.count = 0;
    bucket.windowStart = now;
  }
}
