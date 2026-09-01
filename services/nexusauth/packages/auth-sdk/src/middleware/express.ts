import { Request, Response, NextFunction } from 'express';
import { JwksClient } from '../jwks';
import { NexusUser } from '../types';

export interface ExpressAuthMiddlewareOptions {
  jwksUri: string;
  requiredPermissions?: string[];
  optional?: boolean;
}

export function expressAuthMiddleware(opts: ExpressAuthMiddlewareOptions) {
  const jwksClient = new JwksClient(opts.jwksUri);

  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (opts.optional) {
        return next();
      }
      return res.status(401).json({
        code: 'MISSING_AUTH_HEADER',
        message: 'Missing or invalid authorization header',
      });
    }

    const token = authHeader.substring(7);

    try {
      const user: NexusUser = await jwksClient.verifyToken(token);

      if (opts.requiredPermissions && opts.requiredPermissions.length > 0) {
        const userPerms = user.permissions || [];
        const hasAll = opts.requiredPermissions.every((p) => userPerms.includes(p));
        if (!hasAll) {
          return res.status(403).json({
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Missing required permissions',
            required: opts.requiredPermissions,
          });
        }
      }

      (req as any).user = user;
      next();
    } catch (err: any) {
      return res.status(401).json({
        code: 'TOKEN_INVALID',
        message: err.message || 'Invalid or expired token',
      });
    }
  };
}
