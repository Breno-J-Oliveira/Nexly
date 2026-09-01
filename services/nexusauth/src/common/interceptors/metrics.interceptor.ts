import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { MetricsService } from '../../modules/metrics/metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const route = request.route?.path || request.url || 'unknown';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const status = response.statusCode.toString();
          const duration = (Date.now() - start) / 1000;

          this.metricsService.httpRequestsTotal.inc({
            method,
            route,
            status,
          });
          this.metricsService.httpRequestDurationSeconds.observe(
            { method, route, status },
            duration,
          );
        },
        error: (err) => {
          const status = err.status?.toString() || '500';
          const duration = (Date.now() - start) / 1000;

          this.metricsService.httpRequestsTotal.inc({
            method,
            route,
            status,
          });
          this.metricsService.httpRequestDurationSeconds.observe(
            { method, route, status },
            duration,
          );
        },
      }),
    );
  }
}
