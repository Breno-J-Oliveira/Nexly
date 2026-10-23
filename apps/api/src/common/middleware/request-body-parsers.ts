import {
  BadRequestException,
  PayloadTooLargeException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { json, raw, urlencoded } from 'express';

interface RequestBodyParserTarget {
  use(handler: RequestHandler): unknown;
  use(handler: ErrorRequestHandler): unknown;
  use(path: string, handler: RequestHandler): unknown;
}

export function registerRequestBodyParsers(app: RequestBodyParserTarget, prefix = '/api'): void {
  // Clients send uncompressed bodies. Reject compressed input before invoking
  // native decompressors (including Brotli, CVE-2026-111497).
  app.use(`${prefix}/gestao/importacao`, json({ limit: '2mb', inflate: false }));
  // Stripe signatures require the exact original bytes, before JSON parsing.
  app.use(
    `${prefix}/assinaturas/webhook`,
    raw({ type: 'application/json', limit: '100kb', inflate: false }),
  );
  app.use(json({ limit: '100kb', inflate: false }));
  app.use(urlencoded({ extended: true, limit: '100kb', inflate: false }));

  // Convert known parser failures to Nest exceptions so the global exception
  // filter preserves client errors instead of treating them as internal errors.
  const parserErrorHandler: ErrorRequestHandler = (error: unknown, _req, _res, next) => {
    const type = error && typeof error === 'object' && 'type' in error ? error.type : undefined;
    if (type === 'encoding.unsupported' || type === 'charset.unsupported') {
      next(
        new UnsupportedMediaTypeException('Envie o corpo da requisição sem compressão em UTF-8.'),
      );
    } else if (type === 'entity.too.large') {
      next(new PayloadTooLargeException('O conteúdo enviado excede o tamanho permitido.'));
    } else if (type === 'entity.parse.failed') {
      next(new BadRequestException('O corpo da requisição contém JSON inválido.'));
    } else {
      next(error);
    }
  };
  app.use(parserErrorHandler);
}
