import { Logger } from '@nestjs/common';

/**
 * Circuit Breaker — enterprise-grade resilience pattern.
 *
 * Prevents cascading failures when Redis/DB dependencies fail.
 * States: CLOSED (normal) → OPEN (failing) → HALF_OPEN (testing)
 *
 * Implementation based on Netflix Hystrix / Resilience4j patterns.
 * No external dependencies — pure TypeScript.
 */
export class CircuitBreaker {
  private readonly logger: Logger;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;
  private openCircuitTime = 0;

  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  private readonly halfOpenMaxRequests: number;
  private halfOpenRequests = 0;

  constructor(
    serviceName: string,
    options: {
      failureThreshold?: number;
      resetTimeoutMs?: number;
      halfOpenMaxRequests?: number;
    } = {},
  ) {
    this.logger = new Logger(`CircuitBreaker:${serviceName}`);
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeoutMs = options.resetTimeoutMs ?? 30_000; // 30s
    this.halfOpenMaxRequests = options.halfOpenMaxRequests ?? 3;
  }

  /**
   * Execute a function with circuit breaker protection.
   * If the circuit is OPEN, throws immediately without calling the function.
   * If CLOSED or HALF_OPEN, executes the function and tracks failures.
   */
  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => T | Promise<T>,
  ): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openCircuitTime >= this.resetTimeoutMs) {
        this.logger.log('Circuit transitioning to HALF_OPEN');
        this.state = 'HALF_OPEN';
        this.halfOpenRequests = 0;
      } else {
        const remainingMs = this.resetTimeoutMs - (Date.now() - this.openCircuitTime);
        this.logger.warn(
          `Circuit OPEN — request rejected (${Math.round(remainingMs / 1000)}s until half-open)`,
        );
        if (fallback) {
          return fallback();
        }
        throw new CircuitBreakerOpenError(
          `Circuit breaker is OPEN. Retry in ${Math.round(remainingMs / 1000)}s.`,
        );
      }
    }

    if (this.state === 'HALF_OPEN') {
      this.halfOpenRequests++;
      if (this.halfOpenRequests > this.halfOpenMaxRequests) {
        this.logger.warn(
          `HALF_OPEN max requests (${this.halfOpenMaxRequests}) exceeded — rejecting`,
        );
        if (fallback) {
          return fallback();
        }
        throw new CircuitBreakerOpenError(
          'Circuit breaker is HALF_OPEN and max concurrent requests reached.',
        );
      }
    }

    try {
      const result = await fn();

      // Success — reset on first success in HALF_OPEN
      if (this.state === 'HALF_OPEN') {
        this.logger.log('HALF_OPEN request succeeded — circuit CLOSED');
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.halfOpenRequests = 0;
      }

      // Success in CLOSED state — reset failure count
      if (this.state === 'CLOSED') {
        this.failureCount = 0;
      }

      return result;
    } catch (err) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      this.logger.warn(
        `Failure #${this.failureCount}/${this.failureThreshold} — ${err instanceof Error ? err.message : 'unknown error'}`,
      );

      if (
        this.state === 'CLOSED' &&
        this.failureCount >= this.failureThreshold
      ) {
        this.logger.error(
          `Circuit OPEN — ${this.failureCount} consecutive failures`,
        );
        this.state = 'OPEN';
        this.openCircuitTime = Date.now();
      }

      if (this.state === 'HALF_OPEN') {
        this.logger.error('HALF_OPEN request failed — circuit re-OPENED');
        this.state = 'OPEN';
        this.openCircuitTime = Date.now();
        this.halfOpenRequests = 0;
      }

      if (fallback) {
        return fallback();
      }
      throw err;
    }
  }

  /**
   * Check if the circuit is currently open (for health checks / metrics).
   */
  get isOpen(): boolean {
    if (this.state === 'OPEN') {
      if (Date.now() - this.openCircuitTime >= this.resetTimeoutMs) {
        return false; // Would transition to HALF_OPEN on next request
      }
      return true;
    }
    return false;
  }

  /**
   * Get current state for monitoring/metrics.
   */
  get currentState(): string {
    return this.state;
  }

  /**
   * Force the circuit to CLOSED state (for manual reset / admin).
   */
  forceClose(): void {
    this.logger.warn('Circuit breaker manually reset to CLOSED');
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenRequests = 0;
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CircuitBreakerOpenError';
  }
}