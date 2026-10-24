import type { Context, MiddlewareHandler } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createRemoteJWKSet, jwtVerify, SignJWT, type JWTPayload, type JWTVerifyGetKey } from 'jose';
import type { AppEnv, Bindings, KeySources } from './env';
import { fail } from './http';

export const SESSION_COOKIE = 'dr_session';
const SESSION_DAYS = 90;
const SESSION_ISSUER = 'daily-ritual';

export const APPLE_ISSUER = 'https://appleid.apple.com';
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/** Live Apple and Google key sets. jose caches them per isolate and refetches on unknown key ids. */
export function remoteKeySources(): KeySources {
  return {
    apple: createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'), { cacheMaxAge: 3_600_000 }),
    google: createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'), { cacheMaxAge: 3_600_000 }),
  };
}

export type ProviderIdentity = { sub: string; email: string | null };

/**
 * Verifies an Apple or Google ID token: signature against the provider's keys, issuer,
 * audience (one of our app/client ids), expiry, and the nonce when the app sent one.
 * Returns null for any invalid token.
 */
export async function verifyIdToken(
  token: string,
  keys: JWTVerifyGetKey,
  opts: { issuer: string | string[]; audiences: string[]; nonce?: string },
): Promise<ProviderIdentity | null> {
  if (opts.audiences.length === 0) return null;
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, keys, {
      issuer: opts.issuer,
      audience: opts.audiences,
      algorithms: ['RS256'],
      clockTolerance: 60,
      requiredClaims: ['sub', 'exp', 'iat'],
    }));
  } catch {
    return null;
  }
  if (typeof payload.sub !== 'string' || !payload.sub) return null;
  if (opts.nonce !== undefined && payload.nonce !== opts.nonce) return null;

  // Apple sends email_verified as the string "true"; Google sends a boolean.
  const verified = payload.email_verified === true || payload.email_verified === 'true';
  const email = verified && typeof payload.email === 'string' ? payload.email.toLowerCase() : null;
  return { sub: payload.sub, email };
}

function secretKey(env: Bindings): Uint8Array {
  const secret = env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET must be set (32+ characters)');
  return new TextEncoder().encode(secret);
}

export async function signSession(env: Bindings, userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey(env));
}

export async function readSession(env: Bindings, token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(env), {
      issuer: SESSION_ISSUER,
      audience: SESSION_ISSUER,
      algorithms: ['HS256'],
    });
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/** For the website on the same origin. The app uses the token from the response body instead. */
export function setSessionCookie(c: Context, token: string) {
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  });
}

export function clearSessionCookie(c: Context) {
  deleteCookie(c, SESSION_COOKIE, { path: '/', secure: true, httpOnly: true, sameSite: 'Lax' });
}

/** Accepts `Authorization: Bearer <token>` (app) or the `dr_session` cookie (website). */
export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header('Authorization');
  const bearer = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  const token = bearer ?? getCookie(c, SESSION_COOKIE);
  const userId = token ? await readSession(c.env, token) : null;
  if (!userId) return fail(c, 401, 'unauthorized');
  c.set('userId', userId);
  return next();
};
