import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import { findPhotoData } from '../src/sync';
import { app, call, newUser, pull, push, testEnv } from './helpers';

type PushResult = { cursor: number; applied: number; ignored: number };

const day = (id: string, updated_at: number, body: unknown = { pct: 0.8 }) => ({ kind: 'day', id, updated_at, body });

describe('push and pull', () => {
  it('round-trips docs exactly', async () => {
    const { token } = await newUser();
    const body = { steps: { m1: '07:12', h1: 1.4 }, note: 'naïve "quotes" ✓', nested: [1, null, { x: true }] };
    const res = await push(token, [day('2026-10-22', 1000, body), { kind: 'config', id: 'main', updated_at: 5, body: { washDays: [1, 3, 5] } }]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ cursor: 2, applied: 2, ignored: 0 });

    const page = await pull(token);
    expect(page.more).toBe(false);
    expect(page.cursor).toBe(2);
    expect(page.docs).toEqual([
      { kind: 'day', id: '2026-10-22', updated_at: 1000, deleted: 0, body },
      { kind: 'config', id: 'main', updated_at: 5, deleted: 0, body: { washDays: [1, 3, 5] } },
    ]);
  });

  it('keeps every user to their own docs', async () => {
    const a = await newUser();
    const b = await newUser();
    await push(a.token, [day('d1', 1)]);
    await push(b.token, [day('d1', 1, { pct: 0.1 })]);
    expect((await pull(a.token)).docs.map((d) => d.body)).toEqual([{ pct: 0.8 }]);
    expect((await pull(b.token)).docs.map((d) => d.body)).toEqual([{ pct: 0.1 }]);
  });

  it('an empty push just returns the cursor', async () => {
    const { token } = await newUser();
    await push(token, [day('d1', 1)]);
    expect(await (await push(token, [])).json()).toEqual({ cursor: 1, applied: 0, ignored: 0 });
  });
});

describe('last write wins', () => {
  it('applies newer writes and ignores older or equal ones', async () => {
    const { token } = await newUser();
    await push(token, [day('d1', 2000, { v: 'first' })]);

    const older = (await (await push(token, [day('d1', 1000, { v: 'older' })])).json()) as PushResult;
    expect(older).toMatchObject({ applied: 0, ignored: 1 });
    const equal = (await (await push(token, [day('d1', 2000, { v: 'same time' })])).json()) as PushResult;
    expect(equal).toMatchObject({ applied: 0, ignored: 1 });
    expect((await pull(token)).docs[0].body).toEqual({ v: 'first' });

    const newer = (await (await push(token, [day('d1', 3000, { v: 'newer' })])).json()) as PushResult;
    expect(newer).toMatchObject({ applied: 1, ignored: 0 });
    const page = await pull(token);
    expect(page.docs).toHaveLength(1);
    expect(page.docs[0]).toMatchObject({ updated_at: 3000, body: { v: 'newer' } });
  });

  it('resolves duplicates inside one push by updated_at, not by order', async () => {
    const { token } = await newUser();
    await push(token, [day('d1', 5, { v: 'b' }), day('d1', 9, { v: 'c' }), day('d1', 7, { v: 'a' })]);
    expect((await pull(token)).docs).toEqual([{ kind: 'day', id: 'd1', updated_at: 9, deleted: 0, body: { v: 'c' } }]);
  });

  it('writes nothing for an unchanged re-push', async () => {
    const { token } = await newUser();
    const docs = Array.from({ length: 50 }, (_, i) => day(`d${i}`, 100));
    await push(token, docs);
    const again = (await (await push(token, docs)).json()) as PushResult;
    expect(again).toEqual({ cursor: 50, applied: 0, ignored: 50 });
  });
});

describe('tombstones', () => {
  it('stores a deletion without its body and syncs it down', async () => {
    const { token } = await newUser();
    await push(token, [{ kind: 'weighin', id: 'w1', updated_at: 10, body: { kg: 71.2 } }]);
    await push(token, [{ kind: 'weighin', id: 'w1', updated_at: 20, deleted: 1 }]);

    const [doc] = (await pull(token)).docs;
    expect(doc).toEqual({ kind: 'weighin', id: 'w1', updated_at: 20, deleted: 1, body: null });
    const row = await testEnv.DB.prepare('SELECT body FROM docs WHERE kind = ? AND id = ?').bind('weighin', 'w1').first();
    expect(row?.body).toBeNull();
  });

  it('an older edit cannot bring a deleted doc back, a newer one can', async () => {
    const { token } = await newUser();
    await push(token, [{ kind: 'step', id: 'n4', updated_at: 50, deleted: true }]);
    await push(token, [{ kind: 'step', id: 'n4', updated_at: 40, body: { name: 'Shampoo' } }]);
    expect((await pull(token)).docs[0]).toMatchObject({ deleted: 1, body: null });

    await push(token, [{ kind: 'step', id: 'n4', updated_at: 60, body: { name: 'Shampoo' } }]);
    expect((await pull(token)).docs[0]).toMatchObject({ deleted: 0, body: { name: 'Shampoo' } });
  });
});

describe('cursor and pagination', () => {
  it('pages 500 at a time with a more flag', async () => {
    const { token } = await newUser();
    for (let batch = 0; batch < 3; batch++) {
      const docs = Array.from({ length: 200 }, (_, i) => day(`d${batch}-${i}`, 1 + i));
      expect((await push(token, docs)).status).toBe(200);
    }

    const first = await pull(token);
    expect(first.docs).toHaveLength(500);
    expect(first.more).toBe(true);
    expect(first.cursor).toBe(500);

    const second = await pull(token, first.cursor);
    expect(second.docs).toHaveLength(100);
    expect(second.more).toBe(false);
    expect(second.cursor).toBe(600);

    const ids = new Set([...first.docs, ...second.docs].map((d) => d.id));
    expect(ids.size).toBe(600);

    const empty = await pull(token, second.cursor);
    expect(empty).toEqual({ docs: [], cursor: 600, more: false });
  });

  it('honours a smaller limit', async () => {
    const { token } = await newUser();
    await push(token, Array.from({ length: 5 }, (_, i) => day(`d${i}`, 1)));
    const page = await pull(token, 0, 2);
    expect(page.docs.map((d) => d.id)).toEqual(['d0', 'd1']);
    expect(page).toMatchObject({ cursor: 2, more: true });
  });

  it('only returns what changed after the cursor, and an edited doc moves to the end', async () => {
    const { token } = await newUser();
    await push(token, [day('a', 1), day('b', 1), day('c', 1)]);
    const { cursor } = await pull(token);

    const res = (await (await push(token, [day('a', 2, { pct: 1 })])).json()) as PushResult;
    expect(res.cursor).toBeGreaterThan(cursor);

    const delta = await pull(token, cursor);
    expect(delta.docs.map((d) => d.id)).toEqual(['a']);
    expect((await pull(token)).docs.map((d) => d.id)).toEqual(['b', 'c', 'a']);
  });

  it('rejects a bad cursor', async () => {
    const { token } = await newUser();
    expect((await call('/sync?since=-1', { bearer: token })).status).toBe(400);
    expect((await call('/sync?since=abc', { bearer: token })).status).toBe(400);
    expect((await call('/sync?limit=501', { bearer: token })).status).toBe(400);
  });
});

describe('validation and size limits', () => {
  it('accepts 200 docs and refuses 201', async () => {
    const { token } = await newUser();
    const docs = Array.from({ length: 201 }, (_, i) => day(`d${i}`, 1));
    expect((await push(token, docs.slice(0, 200))).status).toBe(200);
    const res = await push(token, docs);
    expect(res.status).toBe(413);
    expect(((await res.json()) as { error: string }).error).toBe('too_many_docs');
  });

  it('refuses a body over 512 KB, with or without Content-Length', async () => {
    const { token } = await newUser();
    const big = 'x'.repeat(520 * 1024);
    const res = await push(token, [day('d1', 1, { big })]);
    expect(res.status).toBe(413);
    expect(((await res.json()) as { error: string }).error).toBe('too_large');

    const stream = new Blob([JSON.stringify({ docs: [day('d1', 1, { big })] })]).stream();
    const chunked = await app.request(
      'https://sync.example.test/sync',
      { method: 'POST', body: stream, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, duplex: 'half' } as RequestInit,
      testEnv,
    );
    expect(chunked.status).toBe(413);

    // Just under the limit is fine.
    expect((await push(token, [day('d1', 1, { big: 'x'.repeat(500 * 1024) })])).status).toBe(200);
  });

  it.each([
    ['an unknown kind', { kind: 'photo', id: 'p', updated_at: 1, body: {} }],
    ['a missing id', { kind: 'day', updated_at: 1, body: {} }],
    ['a fractional timestamp', { kind: 'day', id: 'd', updated_at: 1.5, body: {} }],
    ['a string timestamp', { kind: 'day', id: 'd', updated_at: '1', body: {} }],
    ['a far-future timestamp', { kind: 'day', id: 'd', updated_at: Date.now() + 3 * 86_400_000, body: {} }],
    ['no body on a live doc', { kind: 'day', id: 'd', updated_at: 1 }],
    ['an over-long id', { kind: 'day', id: 'x'.repeat(129), updated_at: 1, body: {} }],
  ])('refuses %s', async (_label, doc) => {
    const { token } = await newUser();
    const res = await push(token, [doc]);
    expect(res.status).toBe(400);
    expect((await pull(token)).docs).toEqual([]);
  });

  it('refuses the whole push when one doc is bad', async () => {
    const { token } = await newUser();
    const res = await push(token, [day('ok', 1), { kind: 'day', id: 'bad', updated_at: 1 }]);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { message: string }).message).toMatch(/^docs\.1:/);
    expect((await pull(token)).docs).toEqual([]);
  });

  it('refuses a non-object body', async () => {
    const { token } = await newUser();
    expect((await call('/sync', { method: 'POST', bearer: token, json: [] })).status).toBe(400);
    expect((await call('/sync', { method: 'POST', bearer: token, json: { docs: 'x' } })).status).toBe(400);
  });
});

describe('photos never sync', () => {
  it('refuses data URIs under photo/photos keys at any depth', async () => {
    const { token } = await newUser();
    const cases = [
      { photo: 'data:image/jpeg;base64,/9j/4AAQ' },
      { front: { photos: ['ok.jpg', 'data:application/octet-stream;base64,AAAA'] } },
      { angles: [{ Photo: ' data:image/png;base64,iVBO' }] },
      { thumbnail: 'data:image/webp;base64,UklG' },
    ];
    for (const body of cases) {
      const res = await push(token, [{ kind: 'checkin', id: 'c1', updated_at: 1, body }]);
      expect(res.status).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe('invalid_doc');
    }
    expect((await pull(token)).docs).toEqual([]);
  });

  it('allows photo file names', async () => {
    const { token } = await newUser();
    const body = { photos: { front: 'checkin-2026-10-22-front.jpg', left: 'file:///var/mobile/left.jpg' }, photo: null };
    expect((await push(token, [{ kind: 'checkin', id: 'c1', updated_at: 1, body }])).status).toBe(200);
  });

  it('stops at absurd nesting', () => {
    let deep: unknown = 'x';
    for (let i = 0; i < 40; i++) deep = { a: deep };
    expect(findPhotoData(deep)).toBe('body is nested too deeply');
  });
});

describe('geo and health', () => {
  it('reads the location Cloudflare attaches to the request', async () => {
    const req = new Request('https://sync.example.test/geo', {
      headers: { 'CF-Connecting-IP': 'geo-test' },
      cf: { city: 'Munich', region: "Bavaria", country: 'DE', latitude: '48.13743', longitude: '11.57549', timezone: 'Europe/Berlin' },
    } as RequestInit);
    const res = await app.request(req, undefined, testEnv);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
    expect(await res.json()).toEqual({ city: 'Munich', region: 'Bavaria', country: 'DE', lat: 48.13743, lon: 11.57549, timezone: 'Europe/Berlin' });
  });

  it('returns nulls when there is no location', async () => {
    const res = await call('/geo');
    expect(await res.json()).toEqual({ city: null, region: null, country: null, lat: null, lon: null, timezone: null });
  });

  it('the deployed worker entry serves /health and 404s the rest', async () => {
    const health = await exports.default.fetch('https://sync.example.test/health');
    expect(await health.json()).toEqual({ ok: true });
    const missing = await exports.default.fetch('https://sync.example.test/nope');
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: 'not_found' });
  });
});
