import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_ERROR';
    let message = 'Internal server error';
    let details: unknown;

    const correlationId = request.headers['x-request-id'] as string;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r.message as string) || exception.message;

        if (r.code) {
          code = r.code as string;
        } else if (Array.isArray(r.message)) {
          code = 'VALIDATION_ERROR';
          message = 'Validation failed';
          details = r;
        } else if (r.errors) {
          code = 'VALIDATION_ERROR';
          details = r.errors;
        }

        if (r.details) {
          details = r.details;
        }
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // V56 FIX: convert Prisma known errors to safe HTTP responses
      switch (exception.code) {
        case 'P2002':
          statusCode = HttpStatus.CONFLICT;
          code = 'RESOURCE_CONFLICT';
          message = 'Resource already exists';
          break;
        case 'P2025':
          statusCode = HttpStatus.NOT_FOUND;
          code = 'RESOURCE_NOT_FOUND';
          message = 'Resource not found';
          break;
        case 'P2003':
          statusCode = HttpStatus.BAD_REQUEST;
          code = 'FK_CONSTRAINT';
          message = 'Foreign key constraint failed';
          break;
        default:
          statusCode = HttpStatus.BAD_REQUEST;
          code = 'DATABASE_ERROR';
          message = 'Database operation failed';
      }
      this.logger.error(
        JSON.stringify({
          correlationId,
          code: exception.code,
          path: request.url,
          method: request.method,
        }),
      );
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      // V56 FIX: never expose Prisma validation messages
      statusCode = HttpStatus.BAD_REQUEST;
      code = 'INVALID_DATA';
      message = 'Invalid data provided';
      this.logger.error(
        JSON.stringify({
          correlationId,
          code: 'PRISMA_VALIDATION',
          path: request.url,
          method: request.method,
        }),
      );
    } else if (exception instanceof Error) {
      this.logger.error(
        JSON.stringify({
          correlationId,
          statusCode,
          code,
          message: exception.message,
          path: request.url,
          method: request.method,
          stack: process.env.NODE_ENV === 'development' ? exception.stack : undefined,
        }),
      );
    }

    if (statusCode >= 500) {
      this.logger.error(
        JSON.stringify({
          correlationId,
          statusCode,
          code,
          message,
          path: request.url,
          method: request.method,
        }),
      );
    }

    const body: Record<string, unknown> = { code, message, statusCode };

    if (details && statusCode < 500) {
      if (code === 'VALIDATION_ERROR') {
        body['details'] = details;
      }
    }

    if (correlationId) body['correlationId'] = correlationId;

    response.status(statusCode).json(body);
  }
}
