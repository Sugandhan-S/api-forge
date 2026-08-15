import { type Request, type Response, type NextFunction } from 'express';

/**
 * API Key Authentication Middleware
 *
 * If `API_SECRET_KEY` is set in the environment, all protected routes require
 * the client to send a matching key via the `X-API-Key` request header.
 *
 * If the environment variable is not set, authentication is skipped entirely,
 * preserving the current "open" local-dev experience without extra configuration.
 *
 * Usage:
 *   app.use('/api/ai', apiKeyAuth, aiRouter);
 *   app.use('/api/mock', apiKeyAuth, mockRouter);
 */

const API_KEY_HEADER = 'x-api-key';

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const expectedKey = process.env.API_SECRET_KEY;

  // If no key is configured, bypass auth — safe for local development
  if (!expectedKey) {
    next();
    return;
  }

  const providedKey = req.headers[API_KEY_HEADER];

  if (!providedKey || providedKey !== expectedKey) {
    res.status(401).json({
      error: 'Unauthorized — valid X-API-Key header required.',
    });
    return;
  }

  next();
}
