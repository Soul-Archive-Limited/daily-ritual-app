import type { Context, MiddlewareHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv } from './env';

export function fail(c: Context, status: ContentfulStatusCode, error: string, message?: string) {
  return c.json(message ? { error, message } : { error }, status);
}

/** Comma-separated env var → trimmed, non-empty entries. */
export function list(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Strict CORS. Requests without an Origin (the iPhone app, curl) pass through.
 * Browser requests must come from this Worker's own origin or one listed in ALLOWED_ORIGINS;
 * anything else is refused before it reaches a route.
 */
export const originGuard: MiddlewareHandler<AppEnv> = async (c, next) => {
  const origin = c.req.header('Origin');
  if (!origin) return next();

  const allowed = new Set([new URL(c.req.url).origin, ...list(c.env.ALLOWED_ORIGINS)]);
  if (!allowed.has(origin)) return fail(c, 403, 'origin_not_allowed');

  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    Vary: 'Origin',
  };
  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204, {
      ...cors,
      'Access-Control-Allow-Methods': 'GET, POST, DELETE',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Max-Age': '600',
    });
  }
  await next();
  for (const [k, v] of Object.entries(cors)) c.res.headers.set(k, v);
};

/** Refuse non-JSON bodies so a plain HTML form on another site can never post here. */
export const requireJson: MiddlewareHandler<AppEnv> = async (c, next) => {
  const type = c.req.header('Content-Type') ?? '';
  if (!/^application\/json\b/i.test(type)) return fail(c, 415, 'json_required');
  return next();
};

export function clientIp(c: Context): string {
  return c.req.header('CF-Connecting-IP') ?? 'unknown';
}

type LimiterName = 'AUTH_LIMIT' | 'SYNC_LIMIT' | 'GEO_LIMIT';

/** Workers Rate Limiting binding; `key` picks who is counted (IP or user). */
export function rateLimit(name: LimiterName, key: (c: Context<AppEnv>) => string): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const { success } = await c.env[name].limit({ key: key(c) });
    if (!success) {
      c.header('Retry-After', '60');
      return fail(c, 429, 'rate_limited', 'Too many requests. Try again in a minute.');
    }
    return next();
  };
}
