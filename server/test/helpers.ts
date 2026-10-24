import { env } from 'cloudflare:workers';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWK, type JWTPayload } from 'jose';
import { createApp } from '../src/app';
import type { Bindings } from '../src/env';

export const APPLE_AUD = 'com.soularchive.dailyritual';
export const GOOGLE_AUD = 'test-google-ios.apps.googleusercontent.com';

type Signer = { kid: string; privateKey: CryptoKey; jwk: JWK };

async function signer(kid: string): Promise<Signer> {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  return { kid, privateKey, jwk: { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' } };
}

/** Local stand-ins for Apple's and Google's signing keys, plus one key neither provider publishes. */
export const appleKey = await signer('apple-test-1');
export const googleKey = await signer('google-test-1');
export const strangerKey = await signer('apple-test-1');

export const app = createApp({
  apple: createLocalJWKSet({ keys: [appleKey.jwk] }),
  google: createLocalJWKSet({ keys: [googleKey.jwk] }),
});

export const testEnv = env as unknown as Bindings;

type Claims = Omit<JWTPayload, 'iss' | 'aud'>;

export async function idToken(key: Signer, claims: Claims & { iss: string; aud: string }, expiresIn: string | number = '10m') {
  const { iss, aud, ...rest } = claims;
  return new SignJWT(rest)
    .setProtectedHeader({ alg: 'RS256', kid: key.kid })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key.privateKey);
}

export const appleToken = (sub: string, extra: Claims = {}) =>
  idToken(appleKey, { iss: 'https://appleid.apple.com', aud: APPLE_AUD, sub, ...extra });

export const googleToken = (sub: string, extra: Claims = {}) =>
  idToken(googleKey, { iss: 'https://accounts.google.com', aud: GOOGLE_AUD, sub, ...extra });

/** A fresh client IP key per call so per-IP rate limits don't leak between tests. */
export const freshIp = () => `test-${crypto.randomUUID()}`;

export function call(path: string, init: RequestInit & { ip?: string; json?: unknown; bearer?: string } = {}) {
  const { ip, json, bearer, ...rest } = init;
  const headers = new Headers(rest.headers);
  headers.set('CF-Connecting-IP', ip ?? freshIp());
  if (json !== undefined) headers.set('Content-Type', 'application/json');
  if (bearer) headers.set('Authorization', `Bearer ${bearer}`);
  return app.request(
    `https://sync.example.test${path}`,
    { ...rest, headers, body: json !== undefined ? JSON.stringify(json) : rest.body },
    testEnv,
  );
}

/** Signs in a brand-new Apple user and returns their session token and id. */
export async function newUser() {
  const sub = `apple-${crypto.randomUUID()}`;
  const res = await call('/auth/apple', { method: 'POST', json: { identityToken: await appleToken(sub) } });
  if (res.status !== 200) throw new Error(`sign-in failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { token: string; user: { id: string } };
  return { token: body.token, id: body.user.id, sub };
}

export type Doc = { kind: string; id: string; updated_at: number; deleted?: number; body?: unknown };

export const push = (token: string, docs: unknown[]) => call('/sync', { method: 'POST', bearer: token, json: { docs } });

export async function pull(token: string, since = 0, limit?: number) {
  const q = new URLSearchParams({ since: String(since) });
  if (limit) q.set('limit', String(limit));
  const res = await call(`/sync?${q}`, { bearer: token });
  if (res.status !== 200) throw new Error(`pull failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { docs: Required<Doc>[]; cursor: number; more: boolean };
}
