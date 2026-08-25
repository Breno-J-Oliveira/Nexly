import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { env } from '../../config/env';

/**
 * Extrai o `code` semântico (ex: `SCHEDULE_CONFLICT`, `PRODUCT_OUT_OF_STOCK`)
 * do corpo de uma `HttpException`. Convencionamos que qualquer handler pode
 * passar `throw new HttpException({ code, message }, status)` para que o
 * front-end identifique o erro programaticamente.
 */
function extractCode(res: unknown): string | undefined {
  if (res && typeof res === 'object' && 'code' in res) {
    const c = (res as { code?: unknown }).code;
    if (typeof c === 'string' && c.length > 0) return c;
  }
  return undefined;
}

/**
 * Filtro global de exceções.
 *
 * - **HttpException** (incluindo `BadRequestException` do `ValidationPipe`):
 *   preserva o status e devolve `{ statusCode, message, errors, timestamp }`.
 *   Quando a mensagem é um array (caso típico do `ValidationPipe`), devolvemos
 *   **todas** as mensagens em `errors` (uma por campo) e a **primeira** em
 *   `message` (para mostrar no toast/alert). O front-end pode usar `errors`
 *   para destacar campos específicos do formulário.
 *
 * - **Outras exceções** (500 Internal Server Error): NÃO vaza o stack
 *   para o cliente. O stack é logado no servidor com a request id para
 *   correlação, mas a resposta é genérica.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isDev = env.NODE_ENV !== 'production';

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<{ id?: string }>();
    const requestId = request?.id;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';
    let errors: string[] | undefined;
    let code: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      code = extractCode(res);
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as { message?: string | string[]; error?: string };
        const msg = body.message ?? body.error;
        if (Array.isArray(msg)) {
          errors = msg;
          message = msg[0] ?? 'Dados inválidos';
        } else if (typeof msg === 'string') {
          message = msg;
        }
      }
    } else {
      // Erro inesperado: loga no servidor e retorna mensagem genérica.
      this.logger.error(
        `[${requestId ?? 'sem-id'}] ${exception instanceof Error ? exception.stack : String(exception)}`,
      );
    }

    const body: Record<string, unknown> = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
    };
    if (requestId) body.requestId = requestId;
    if (code) body.code = code;
    if (errors) body.errors = errors;
    if (status >= 500 && this.isDev && exception instanceof Error) {
      // Em dev, inclui o stack para facilitar o debug.
      body.stack = exception.stack;
    }

    response.status(status).json(body);
  }
}
