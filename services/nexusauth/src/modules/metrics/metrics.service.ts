import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  collectDefaultMetrics,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly registry: Registry;

  readonly httpRequestsTotal: Counter<string>;
  readonly httpRequestDurationSeconds: Histogram<string>;
  readonly authLoginsTotal: Counter<string>;
  readonly authRegistrationsTotal: Counter<string>;
  readonly auth2faEnabledTotal: Counter<string>;
  readonly authRefreshTokensIssuedTotal: Counter<string>;
  readonly webhooksDispatchedTotal: Counter<string>;

  constructor() {
    this.registry = new Registry();

    collectDefaultMetrics({ register: this.registry });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests by route and status',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDurationSeconds = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    this.authLoginsTotal = new Counter({
      name: 'auth_logins_total',
      help: 'Total login attempts by status',
      labelNames: ['status'],
      registers: [this.registry],
    });

    this.authRegistrationsTotal = new Counter({
      name: 'auth_registrations_total',
      help: 'Total user registrations',
      registers: [this.registry],
    });

    this.auth2faEnabledTotal = new Counter({
      name: 'auth_2fa_enabled_total',
      help: 'Total 2FA activations',
      registers: [this.registry],
    });

    this.authRefreshTokensIssuedTotal = new Counter({
      name: 'auth_refresh_tokens_issued_total',
      help: 'Total refresh tokens issued',
      registers: [this.registry],
    });

    this.webhooksDispatchedTotal = new Counter({
      name: 'webhooks_dispatched_total',
      help: 'Total webhook dispatches by status',
      labelNames: ['status'],
      registers: [this.registry],
    });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
