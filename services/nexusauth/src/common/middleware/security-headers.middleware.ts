import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

/**
 * Security headers middleware.
 *
 * Adds defense-in-depth headers that complement Helmet:
 * - Permissions-Policy: disables powerful browser features
 * - Clear-Site-Data on logout
 * - Cache-Control for sensitive endpoints
 * - X-Permitted-Cross-Domain-Policies
 */
@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Permissions Policy: disable powerful browser features
    res.setHeader(
      'Permissions-Policy',
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
    );

    // X-Permitted-Cross-Domain-Policies
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');

    // M39 FIX: Explicit X-Content-Type-Options as defense-in-depth.
    // Helmet sets this, but repeating it in middleware ensures it cannot be
    // accidentally removed by a misconfigured Helmet instance.
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Clear-Site-Data on logout
    if (req.path === '/auth/logout' && req.method === 'POST') {
      res.setHeader('Clear-Site-Data', '"cache", "cookies", "storage"');
    }

    // No-cache for sensitive endpoints
    const sensitivePaths = [
      '/auth',
      '/admin',
      '/sessions',
      '/api-keys',
      '/webhooks',
      '/audit-log',
    ];
    if (sensitivePaths.some((p) => req.path.startsWith(p))) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private',
      );
      res.setHeader('Pragma', 'no-cache');
    }

    // Remove X-Powered-By (should be set by express but ensure)
    res.removeHeader('X-Powered-By');

    next();
  }
}
