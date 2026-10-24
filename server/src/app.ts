import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import {
  APPLE_ISSUER,
  clearSessionCookie,
  GOOGLE_ISSUERS,
  remoteKeySources,
  requireUser,
  setSessionCookie,
  signSession,
  verifyIdToken,
} from './auth';
import type { AppEnv, KeySources } from './env';
import { clientIp, fail, list, originGuard, rateLimit, requireJson } from './http';
import { MAX_PUSH_BYTES, MAX_PUSH_DOCS, PAGE_SIZE, PushBody, pullDocs, pushDocs, toRows } from './sync';
import { deleteUser, getUser, upsertUser, type Provider } from './users';

const byIp = (c: Context<AppEnv>) => `ip:${clientIp(c)}`;
const byUser = (c: Context<AppEnv>) => `user:${c.get('userId')}`;

const token = z.string().min(20).max(8192);
const AppleBody = z.object({ identityToken: token, nonce: z.string().max(512).optional() });
const GoogleBody = z.object({ idToken: token, nonce: z.string().max(512).optional() });
const SyncQuery = z.object({
  since: z.coerce.number().int().nonnegative().default(0),
  limit: z.coerce.number().int().min(1).max(PAGE_SIZE).default(PAGE_SIZE),
});

async function parseJson(c: Context<AppEnv>): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return fail(c, 400, 'invalid_json');
  }
}

function validate<T extends z.ZodType>(c: Context<AppEnv>, schema: T, raw: unknown): z.output<T> | Response {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  return fail(c, 400, 'invalid_request', issue ? `${issue.path.join('.') || 'body'}: ${issue.message}` : undefined);
}

async function readJson<T extends z.ZodType>(c: Context<AppEnv>, schema: T): Promise<z.output<T> | Response> {
  const raw = await parseJson(c);
  return raw instanceof Response ? raw : validate(c, schema, raw);
}

export function createApp(keys: KeySources = remoteKeySources()) {
  const app = new Hono<AppEnv>();

  app.use('*', originGuard);

  app.get('/health', (c) => c.json({ ok: true }));

  app.get('/geo', rateLimit('GEO_LIMIT', byIp), (c) => {
    const cf = c.req.raw.cf as IncomingRequestCfProperties | undefined;
    const num = (v: unknown) => (v === undefined || v === null || v === '' ? null : Number(v));
    c.header('Cache-Control', 'private, no-store');
    return c.json({
      city: cf?.city ?? null,
      region: cf?.region ?? null,
      country: cf?.country ?? null,
      lat: num(cf?.latitude),
      lon: num(cf?.longitude),
      timezone: cf?.timezone ?? null,
    });
  });

  async function signIn(c: Context<AppEnv>, provider: Provider, idToken: string, nonce?: string) {
    const identity = await verifyIdToken(idToken, provider === 'apple' ? keys.apple : keys.google, {
      issuer: provider === 'apple' ? APPLE_ISSUER : GOOGLE_ISSUERS,
      audiences: list(provider === 'apple' ? c.env.APPLE_AUDIENCES : c.env.GOOGLE_AUDIENCES),
      nonce,
    });
    if (!identity) return fail(c, 401, 'invalid_token');
    const user = await upsertUser(c.env.DB, provider, identity);
    const session = await signSession(c.env, user.id);
    setSessionCookie(c, session);
    c.header('Cache-Control', 'no-store');
    return c.json({ token: session, user });
  }

  app.post('/auth/apple', rateLimit('AUTH_LIMIT', byIp), requireJson, async (c) => {
    const body = await readJson(c, AppleBody);
    if (body instanceof Response) return body;
    return signIn(c, 'apple', body.identityToken, body.nonce);
  });

  app.post('/auth/google', rateLimit('AUTH_LIMIT', byIp), requireJson, async (c) => {
    const body = await readJson(c, GoogleBody);
    if (body instanceof Response) return body;
    // TODO(linking): same verified email on Apple and Google stays two users for now (see upsertUser).
    return signIn(c, 'google', body.idToken, body.nonce);
  });

  // The website asks this on load to know whether someone is signed in (cookie session).
  app.get('/me', requireUser, rateLimit('SYNC_LIMIT', byUser), async (c) => {
    const user = await getUser(c.env.DB, c.get('userId'));
    c.header('Cache-Control', 'no-store');
    return user ? c.json({ user }) : fail(c, 401, 'account_deleted');
  });

  app.post('/signout', (c) => {
    clearSessionCookie(c);
    return c.json({ ok: true });
  });

  app.get('/sync', requireUser, rateLimit('SYNC_LIMIT', byUser), async (c) => {
    const query = SyncQuery.safeParse(c.req.query());
    if (!query.success) return fail(c, 400, 'invalid_request', 'since must be a cursor from an earlier sync');
    const json = await pullDocs(c.env.DB, c.get('userId'), query.data.since, query.data.limit);
    return c.body(json, 200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
  });

  app.post(
    '/sync',
    requireUser,
    rateLimit('SYNC_LIMIT', byUser),
    requireJson,
    bodyLimit({
      maxSize: MAX_PUSH_BYTES,
      onError: (c) => fail(c, 413, 'too_large', `Body must be at most ${MAX_PUSH_BYTES / 1024} KB`),
    }),
    async (c) => {
      const raw = await parseJson(c);
      if (raw instanceof Response) return raw;
      const count = (raw as { docs?: unknown })?.docs;
      if (Array.isArray(count) && count.length > MAX_PUSH_DOCS) {
        return fail(c, 413, 'too_many_docs', `At most ${MAX_PUSH_DOCS} docs per request`);
      }
      const body = validate(c, PushBody, raw);
      if (body instanceof Response) return body;
      const rows = toRows(body.docs);
      if (!Array.isArray(rows)) return fail(c, 400, 'invalid_doc', `docs.${rows.index}: ${rows.message}`);
      try {
        return c.json(await pushDocs(c.env.DB, c.get('userId'), rows));
      } catch (err) {
        // The account was deleted while this session token was still valid.
        if (String(err).includes('FOREIGN KEY')) return fail(c, 401, 'account_deleted');
        throw err;
      }
    },
  );

  app.delete('/account', requireUser, rateLimit('SYNC_LIMIT', byUser), async (c) => {
    const deleted = await deleteUser(c.env.DB, c.get('userId'));
    clearSessionCookie(c);
    return deleted ? c.json({ ok: true }) : fail(c, 404, 'not_found');
  });

  app.notFound((c) => fail(c, 404, 'not_found'));
  app.onError((err, c) => {
    console.error(err);
    return fail(c, 500, 'internal');
  });

  return app;
}
