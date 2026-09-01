import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MetricsService } from '../metrics/metrics.service';
import { resolveAndValidateIp, validateWebhookUrl } from '../../common/utils/ssrf-guard';

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, any>;
}

@Injectable()
export class WebhooksDispatcher {
  private readonly logger = new Logger(WebhooksDispatcher.name);
  private readonly maxAttempts = 3;
  private readonly backoffMs = [1000, 5000, 15000];

  constructor(
    private prisma: PrismaService,
    private metricsService: MetricsService,
  ) {}

  async dispatch(event: string, data: Record<string, any>, tenantId?: string | null) {
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        active: true,
        events: { has: event },
        ...(tenantId ? { tenantId } : {}),
      },
    });

    if (webhooks.length === 0) return;

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const webhook of webhooks) {
      // Validate URL at dispatch time too (cheap protection-in-depth)
      try {
        await validateWebhookUrl(webhook.url);
      } catch (err: any) {
        const logMessage = err instanceof Error ? err.message : 'Unknown SSRF validation error';
        this.logger.error(`Webhook ${webhook.id} URL blocked by SSRF guard: ${logMessage}`);
        await this.prisma.webhookDelivery.create({
          data: {
            webhookId: webhook.id,
            event: payload.event,
            payload: JSON.stringify(payload) as any,
            statusCode: null,
            attempt: 1,
            success: false,
            errorMessage: 'URL validation failed',
          },
        });
        this.metricsService.webhooksDispatchedTotal.inc({ status: 'failed' });
        continue;
      }
      setImmediate(() => this.deliverWithRetry(webhook.id, webhook.url, webhook.secret, payload));
    }
  }

  private async deliverWithRetry(
    webhookId: string,
    url: string,
    secret: string,
    payload: WebhookPayload,
  ) {
    const body = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      // Re-validate IP immediately before the fetch to close the
      // TOCTOU window between webhook creation and delivery.
      // We do NOT pin the IP — instead we let the platform resolver
      // do its job so TLS/SNI continues to work.
      try {
        await resolveAndValidateIp(url);
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : 'unknown';
        this.logger.error(`Webhook ${webhookId} pre-flight IP check failed: ${msg}`);
        await this.prisma.webhookDelivery.create({
          data: {
            webhookId,
            event: payload.event,
            payload: body as any,
            statusCode: null,
            attempt,
            success: false,
            errorMessage: 'IP validation failed before delivery',
          },
        });
        this.metricsService.webhooksDispatchedTotal.inc({ status: 'failed' });
        return;
      }

      const result = await this.deliver(url, body, signature, payload.event, attempt);

      const sanitizedError = result.error
        ? (result.error.includes('fetch') ? 'Connection failed' : result.error.length > 500 ? result.error.substring(0, 500) : result.error)
        : undefined;

      await this.prisma.webhookDelivery.create({
        data: {
          webhookId,
          event: payload.event,
          payload: body as any,
          statusCode: result.statusCode,
          attempt,
          success: result.success,
          errorMessage: sanitizedError,
        },
      });

      if (result.success) {
        this.logger.log(`Webhook ${webhookId} delivered (attempt ${attempt})`);
        this.metricsService.webhooksDispatchedTotal.inc({ status: 'success' });
        return;
      }

      if (attempt < this.maxAttempts) {
        const delay = this.backoffMs[attempt - 1];
        this.logger.warn(
          `Webhook ${webhookId} attempt ${attempt} failed (${result.error}), retrying in ${delay}ms`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        this.logger.error(
          `Webhook ${webhookId} failed after ${this.maxAttempts} attempts`,
        );
        this.metricsService.webhooksDispatchedTotal.inc({ status: 'failed' });
      }
    }
  }

  private async deliver(
    url: string,
    body: string,
    signature: string,
    eventName: string,
    attempt: number,
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(url, {
        method: 'POST',
        redirect: 'manual',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': eventName,
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // SECURITY: Always consume the response body to prevent memory leaks
      // and to allow connection reuse in Node.js keep-alive.
      let responseText = '';
      try {
        responseText = await res.text();
      } catch {
        // Ignore body read errors — the status code is what matters
      }

      if (res.status >= 200 && res.status < 300) {
        return { success: true, statusCode: res.status };
      }

      // SECURITY: Truncate response body in error logs to prevent log injection
      const truncatedBody = responseText.length > 500
        ? responseText.substring(0, 500) + '...'
        : responseText;
      return { success: false, statusCode: res.status, error: `HTTP ${res.status}: ${truncatedBody}` };
    } catch (err: any) {
      const sanitizedError = err.name === 'AbortError'
        ? 'Request timeout'
        : err.name === 'TypeError'
        ? 'Network error'
        : err.message && err.message.length > 200
        ? err.message.substring(0, 200)
        : err.message || 'Unknown error';

      return { success: false, error: sanitizedError };
    }
  }
}
