import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import {
  APPLE_AUD,
  appleKey,
  appleToken,
  call,
  freshIp,
  googleKey,
  googleToken,
  idToken,
  newUser,
  pull,
  strangerKey,
} from './helpers';

const signInApple = async (identityToken: string, extra: Record<string, unknown> = {}) =>
  call('/auth/apple', { method: 'POST', json: { identityToken, ...extra } });
const signInGoogle = async (idToken: string) => call('/auth/google', { method: 'POST', json: { idToken } });

describe('Apple sign-in', () => {
  it('creates a user, returns a session token and sets the cookie', async () => {
    const res = await signInApple(await appleToken('apple-1', { email: 'Alex@privaterelay.appleid.com', email_verified: 'true' }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { token: string; user: { id: string; email: string } };
    expect(body.token.split('.')).toHaveLength(3);
    expect(body.user.email).toBe('alex@privaterelay.appleid.com');

    const cookie = res.headers.get('Set-Cookie') ?? '';
    expect(cookie).toContain(`dr_session=${body.token}`);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/Secure/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Max-Age=7776000/);
  });

  it('returns the same user on the next sign-in', async () => {
    const first = (await (await signInApple(await appleToken('apple-repeat'))).json()) as { user: { id: string } };
    const again = (await (await signInApple(await appleToken('apple-repeat'))).json()) as { user: { id: string } };
    expect(again.user.id).toBe(first.user.id);
  });

  it('ignores an email the provider has not verified', async () => {
    const res = await signInApple(await appleToken('apple-unverified', { email: 'x@example.com', email_verified: false }));
    expect(((await res.json()) as { user: { email: unknown } }).user.email).toBeNull();
  });

  it.each([
    ['wrong audience', () => idToken(appleKey, { iss: 'https://appleid.apple.com', aud: 'com.someone.else', sub: 's' })],
    ['wrong issuer', () => idToken(appleKey, { iss: 'https://evil.example', aud: APPLE_AUD, sub: 's' })],
    ['expired', () => idToken(appleKey, { iss: 'https://appleid.apple.com', aud: APPLE_AUD, sub: 's' }, Math.floor(Date.now() / 1000) - 600)],
    ['unknown signing key', () => idToken(strangerKey, { iss: 'https://appleid.apple.com', aud: APPLE_AUD, sub: 's' })],
    ['a Google token', () => googleToken('s')],
    ['no subject', () => idToken(appleKey, { iss: 'https://appleid.apple.com', aud: APPLE_AUD })],
  ])('rejects a token with %s', async (_label, make) => {
    const res = await signInApple(await make());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'invalid_token' });
  });

  it('rejects an HS256 token signed with a guessed secret', async () => {
    const forged = await new SignJWT({ sub: 's' })
      .setProtectedHeader({ alg: 'HS256', kid: appleKey.kid })
      .setIssuer('https://appleid.apple.com')
      .setAudience(APPLE_AUD)
      .setIssuedAt()
      .setExpirationTime('10m')
      .sign(new TextEncoder().encode('guess'.repeat(8)));
    expect((await signInApple(forged)).status).toBe(401);
  });

  it('checks the nonce when the app sends one', async () => {
    const token = await appleToken('apple-nonce', { nonce: 'n-123' });
    expect((await signInApple(token, { nonce: 'n-123' })).status).toBe(200);
    expect((await signInApple(token, { nonce: 'other' })).status).toBe(401);
  });

  it('validates the request body', async () => {
    expect((await call('/auth/apple', { method: 'POST', json: {} })).status).toBe(400);
    expect((await call('/auth/apple', { method: 'POST', body: '{', headers: { 'Content-Type': 'application/json' } })).status).toBe(400);
    expect((await call('/auth/apple', { method: 'POST', body: 'identityToken=x', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })).status).toBe(415);
  });
});

describe('Google sign-in', () => {
  it('accepts both Google issuer spellings and every configured audience', async () => {
    const a = await signInGoogle(await googleToken('google-1'));
    const b = await signInGoogle(await idToken(googleKey, { iss: 'accounts.google.com', aud: 'test-google-web.apps.googleusercontent.com', sub: 'google-1' }));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const ida = ((await a.json()) as { user: { id: string } }).user.id;
    expect(((await b.json()) as { user: { id: string } }).user.id).toBe(ida);
  });

  it('rejects an Apple token and a wrong audience', async () => {
    expect((await signInGoogle(await appleToken('g'))).status).toBe(401);
    expect((await signInGoogle(await idToken(googleKey, { iss: 'https://accounts.google.com', aud: APPLE_AUD, sub: 'g' }))).status).toBe(401);
  });

  it('keeps Apple and Google accounts with the same verified email separate', async () => {
    const email = 'same@example.com';
    const apple = await signInApple(await appleToken('apple-same', { email, email_verified: 'true' }));
    const google = await signInGoogle(await googleToken('google-same', { email, email_verified: true }));
    const a = (await apple.json()) as { user: { id: string } };
    const g = (await google.json()) as { user: { id: string } };
    expect(a.user.id).not.toBe(g.user.id);
  });
});

describe('sessions', () => {
  it('accepts the bearer token and the cookie', async () => {
    const { token } = await newUser();
    expect((await call('/sync', { bearer: token })).status).toBe(200);
    expect((await call('/sync', { headers: { Cookie: `dr_session=${token}` } })).status).toBe(200);
  });

  it('rejects missing, garbage and foreign-secret tokens', async () => {
    const foreign = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('someone')
      .setIssuer('daily-ritual')
      .setAudience('daily-ritual')
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('not-the-server-secret-0123456789abcdef'));
    expect((await call('/sync')).status).toBe(401);
    expect((await call('/sync', { bearer: 'nope' })).status).toBe(401);
    expect((await call('/sync', { bearer: foreign })).status).toBe(401);
  });

  it('signout clears the cookie', async () => {
    const res = await call('/signout', { method: 'POST' });
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toMatch(/dr_session=;.*Max-Age=0/);
  });

  it('deleting the account removes the user and their docs', async () => {
    const user = await newUser();
    await call('/sync', { method: 'POST', bearer: user.token, json: { docs: [{ kind: 'config', id: 'main', updated_at: 1, body: { a: 1 } }] } });
    const res = await call('/account', { method: 'DELETE', bearer: user.token });
    expect(res.status).toBe(200);
    expect(res.headers.get('Set-Cookie')).toMatch(/Max-Age=0/);
    expect((await pull(user.token)).docs).toEqual([]);

    // The old token still parses, but the account is gone: pushes are refused, not orphaned.
    const again = await call('/sync', { method: 'POST', bearer: user.token, json: { docs: [{ kind: 'config', id: 'main', updated_at: 2, body: {} }] } });
    expect(again.status).toBe(401);
    expect(await again.json()).toEqual({ error: 'account_deleted' });
    expect((await call('/account', { method: 'DELETE', bearer: user.token })).status).toBe(404);
  });
});

describe('rate limits', () => {
  it('allows 10 sign-ins per minute per IP, then answers 429 JSON', async () => {
    const ip = freshIp();
    const token = await appleToken('apple-rl');
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await call('/auth/apple', { method: 'POST', ip, json: { identityToken: token } })).status);
    }
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);

    const limited = await call('/auth/apple', { method: 'POST', ip, json: { identityToken: token } });
    expect(limited.headers.get('Content-Type')).toMatch(/application\/json/);
    expect(limited.headers.get('Retry-After')).toBe('60');
    expect(((await limited.json()) as { error: string }).error).toBe('rate_limited');
    // Another IP is unaffected.
    expect((await call('/auth/apple', { method: 'POST', json: { identityToken: token } })).status).toBe(200);
  });

  it('allows 30 sync calls per minute per user', async () => {
    const a = await newUser();
    const b = await newUser();
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await call('/sync', { bearer: a.token, ip: freshIp() })).status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(30);
    expect(statuses[30]).toBe(429);
    expect((await call('/sync', { bearer: b.token })).status).toBe(200);
  });

  it('allows 30 geo lookups per minute per IP', async () => {
    const ip = freshIp();
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await call('/geo', { ip })).status);
    expect(statuses.filter((s) => s === 200)).toHaveLength(30);
    expect(statuses[30]).toBe(429);
  });
});

describe('CORS', () => {
  it('lets the app (no Origin) and the same origin through', async () => {
    expect((await call('/health')).status).toBe(200);
    const same = await call('/health', { headers: { Origin: 'https://sync.example.test' } });
    expect(same.status).toBe(200);
    expect(same.headers.get('Access-Control-Allow-Origin')).toBe('https://sync.example.test');
    expect(same.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('refuses other origins, including preflights', async () => {
    const res = await call('/sync', { method: 'POST', headers: { Origin: 'https://evil.example' } });
    expect(res.status).toBe(403);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
    expect((await call('/sync', { method: 'OPTIONS', headers: { Origin: 'null' } })).status).toBe(403);
  });

  it('answers a same-origin preflight', async () => {
    const res = await call('/sync', {
      method: 'OPTIONS',
      headers: { Origin: 'https://sync.example.test', 'Access-Control-Request-Method': 'POST' },
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
  });
});

describe('GET /me', () => {
  it('returns the signed-in user from the cookie', async () => {
    const res = await signInApple(await appleToken('apple-me', { email: 'me@example.com', email_verified: 'true' }));
    const cookie = (res.headers.get('Set-Cookie') ?? '').split(';')[0];
    const me = await call('/me', { headers: { Cookie: cookie } });
    expect(me.status).toBe(200);
    expect(((await me.json()) as { user: { email: string } }).user.email).toBe('me@example.com');
  });

  it('is 401 without a session', async () => {
    expect((await call('/me')).status).toBe(401);
  });
});
