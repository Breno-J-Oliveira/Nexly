import type { NextFunction, Request, Response } from 'express';

/** Valida a origem nas operações autenticadas pelo cookie de refresh. */
export function cookieOriginGuard(origins: string[]) {
  const allowed = new Set(origins.map((origin) => origin.trim()));
  return (req: Request, res: Response, next: NextFunction): void => {
    const path = req.path.toLowerCase().replace(/\/+$/, '');
    const sensitive = [
      '/api/auth/refresh',
      '/api/auth/logout',
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/2fa/verify',
    ];
    if (req.method !== 'POST' || !sensitive.includes(path)) {
      next();
      return;
    }
    const origin = req.headers.origin;
    const hasCookie = /(?:^|;\s*)refreshToken=/.test(req.headers.cookie ?? '');
    if ((origin && !allowed.has(origin)) || (hasCookie && !origin)) {
      res
        .status(403)
        .json({ code: 'INVALID_ORIGIN', message: 'Origem da solicitação não permitida' });
      return;
    }
    next();
  };
}
