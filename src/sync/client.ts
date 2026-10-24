// Optional account sync with the Daily Ritual server (Cloudflare). Local data stays the source of
// truth on the device; each document syncs as a whole and the newest change wins.
import Constants from 'expo-constants';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getKv, setKv, type SyncKind } from '@/db/repo';
import type { Config, Step } from '@/db/types';

export type Session = { token: string; userId: string; provider: 'apple' | 'google'; email?: string | null };

type Doc = { kind: SyncKind; id: string; updated_at: number; deleted: 0 | 1; body?: unknown };

const SESSION = 'sync.session';
const CURSOR = 'sync.cursor';
const BATCH = 200;

/**
 * The sync server. Kept in code, not app.json, so changing it ships over the air.
 * Self-hosters can override it with `extra.syncUrl` in app config.
 */
export const syncUrl =
  (Constants.expoConfig?.extra?.syncUrl as string | undefined) ?? 'https://daily-ritual.fragrant-base-6293.workers.dev';

/** Settings that belong to this device, never copied from another one. */
const LOCAL_ONLY: (keyof Config)[] = ['notify', 'lastTz', 'place'];

export const getSession = (db: SQLiteDatabase) => getKv<Session>(db, SESSION);

async function api<T>(path: string, session: Session | null, init: RequestInit = {}): Promise<T> {
  if (!syncUrl) throw new Error('Sync is not set up in this build.');
  const res = await fetch(syncUrl + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...init.headers,
    },
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw Object.assign(new Error(json.error ?? `HTTP ${res.status}`), { status: res.status });
  return json;
}

/** Exchange an Apple or Google sign-in for a session, then mark everything here for upload. */
export async function signIn(db: SQLiteDatabase, provider: Session['provider'], idToken: string) {
  const body = provider === 'apple' ? { identityToken: idToken } : { idToken };
  const r = await api<{ token: string; user: { id: string; email?: string | null } }>(`/auth/${provider}`, null, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const session: Session = { token: r.token, userId: r.user.id, provider, email: r.user.email ?? null };
  await setKv(db, SESSION, session);
  await setKv(db, CURSOR, 0);
  await queueEverything(db);
  return session;
}

/** Forget the session. With `erase`, this device's data goes too (it stays in the account). */
export async function signOut(db: SQLiteDatabase) {
  await api('/signout', null, { method: 'POST' }).catch(() => {});
  await db.runAsync('DELETE FROM kv WHERE key IN (?, ?)', SESSION, CURSOR);
  await db.runAsync('DELETE FROM outbox');
}

/** Delete the account and everything stored on the server. Data on this device stays. */
export async function deleteAccount(db: SQLiteDatabase) {
  const s = await getSession(db);
  if (s) await api('/account', s, { method: 'DELETE' });
  await signOut(db);
}

/** First sign-in on a device: everything already here is uploaded. */
async function queueEverything(db: SQLiteDatabase) {
  const now = Date.now();
  await db.withTransactionAsync(async () => {
    await db.runAsync("INSERT OR IGNORE INTO outbox (kind, id, updated_at, deleted) VALUES ('config', 'config', ?, 0)", now);
    await db.runAsync("INSERT OR IGNORE INTO outbox (kind, id, updated_at, deleted) VALUES ('step', 'routine', ?, 0)", now);
    await db.runAsync("INSERT OR IGNORE INTO outbox SELECT 'day', date, ?, 0 FROM days", now);
    await db.runAsync("INSERT OR IGNORE INTO outbox SELECT 'shelf', id, ?, 0 FROM shelf", now);
    await db.runAsync("INSERT OR IGNORE INTO outbox SELECT 'checkin', id, ?, 0 FROM checkins", now);
    await db.runAsync("INSERT OR IGNORE INTO outbox SELECT 'weighin', id, ?, 0 FROM weighins", now);
    await db.runAsync("INSERT OR IGNORE INTO outbox SELECT 'review', week, ?, 0 FROM reviews", now);
  });
}

/** The current local body of a document, or null when it no longer exists. */
async function readBody(db: SQLiteDatabase, kind: SyncKind, id: string): Promise<unknown> {
  const one = async <T>(sql: string, ...args: string[]) => db.getFirstAsync<T>(sql, ...args);
  switch (kind) {
    case 'config': {
      const r = await one<{ value: string }>("SELECT value FROM kv WHERE key = 'config'");
      if (!r) return null;
      const c = JSON.parse(r.value) as Config;
      for (const k of LOCAL_ONLY) delete c[k];
      return c;
    }
    case 'step':
      return db.getAllAsync('SELECT * FROM steps ORDER BY position');
    case 'day':
      return (await one<{ doc: string }>('SELECT doc FROM days WHERE date = ?', id))?.doc ?? null;
    case 'shelf':
      return (await one<{ doc: string }>('SELECT doc FROM shelf WHERE id = ?', id))?.doc ?? null;
    case 'checkin':
      return (await one<{ doc: string }>('SELECT doc FROM checkins WHERE id = ?', id))?.doc ?? null;
    case 'weighin':
      return one('SELECT id, date, kg, at FROM weighins WHERE id = ?', id);
    case 'review':
      return (await one<{ doc: string }>('SELECT doc FROM reviews WHERE week = ?', id))?.doc ?? null;
  }
}

const parse = (v: unknown) => (typeof v === 'string' ? JSON.parse(v) : v);

/** Write a document from the server without queueing it again. */
async function applyDoc(db: SQLiteDatabase, d: Doc) {
  const gone = d.deleted === 1;
  const b = gone ? null : parse(d.body);
  switch (d.kind) {
    case 'config': {
      if (gone || !b) return;
      const cur = await getKv<Config>(db, 'config');
      const next = { ...(b as Config) };
      for (const k of LOCAL_ONLY) if (cur?.[k] !== undefined) (next as Record<string, unknown>)[k] = cur[k];
      await setKv(db, 'config', next);
      return;
    }
    case 'step': {
      if (gone || !Array.isArray(b)) return;
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM steps');
        for (const r of b as (Record<string, unknown> & Partial<Step>)[])
          await db.runAsync(
            `INSERT INTO steps (id, slot, position, name, product, note, schedule, essential, paused, type, goal)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            String(r.id),
            String(r.slot),
            Number(r.position ?? 0),
            String(r.name ?? ''),
            String(r.product ?? ''),
            String(r.note ?? ''),
            String(r.schedule ?? 'every'),
            Number(r.essential ?? 0),
            Number(r.paused ?? 0),
            (r.type as string | null) ?? null,
            (r.goal as number | null) ?? null,
          );
      });
      return;
    }
    case 'day':
      if (gone) await db.runAsync('DELETE FROM days WHERE date = ?', d.id);
      else
        await db.runAsync(
          'INSERT OR REPLACE INTO days (date, pct, at, doc) VALUES (?, ?, ?, ?)',
          d.id,
          (b as { pct?: number }).pct ?? 0,
          (b as { at?: number }).at ?? d.updated_at,
          JSON.stringify(b),
        );
      return;
    case 'shelf':
      if (gone) await db.runAsync('DELETE FROM shelf WHERE id = ?', d.id);
      else await db.runAsync('INSERT OR REPLACE INTO shelf (id, doc) VALUES (?, ?)', d.id, JSON.stringify(b));
      return;
    case 'checkin':
      if (gone) await db.runAsync('DELETE FROM checkins WHERE id = ?', d.id);
      else
        await db.runAsync(
          'INSERT OR REPLACE INTO checkins (id, date, doc) VALUES (?, ?, ?)',
          d.id,
          (b as { date: string }).date,
          JSON.stringify(b),
        );
      return;
    case 'weighin': {
      if (gone) await db.runAsync('DELETE FROM weighins WHERE id = ?', d.id);
      else {
        const w = b as { date: string; kg: number; at: number };
        await db.runAsync(
          'INSERT OR REPLACE INTO weighins (id, date, kg, at) VALUES (?, ?, ?, ?)',
          d.id,
          w.date,
          w.kg,
          w.at,
        );
      }
      return;
    }
    case 'review':
      if (gone) await db.runAsync('DELETE FROM reviews WHERE week = ?', d.id);
      else
        await db.runAsync(
          'INSERT OR REPLACE INTO reviews (id, week, doc) VALUES (?, ?, ?)',
          `rv-${d.id}`,
          d.id,
          JSON.stringify(b),
        );
      return;
  }
}

/**
 * One round: send what changed here, then fetch what changed elsewhere.
 * Returns true when anything from the server was written locally (the app should reload).
 */
export async function syncNow(db: SQLiteDatabase): Promise<boolean> {
  const session = await getSession(db);
  if (!session || !syncUrl) return false;

  // Push, at most BATCH documents per request.
  for (;;) {
    const pending = await db.getAllAsync<{ kind: SyncKind; id: string; updated_at: number; deleted: number }>(
      'SELECT kind, id, updated_at, deleted FROM outbox ORDER BY updated_at LIMIT ?',
      BATCH,
    );
    if (!pending.length) break;
    const docs: Doc[] = [];
    for (const p of pending) {
      const body = p.deleted ? null : await readBody(db, p.kind, p.id);
      docs.push(
        body == null
          ? { kind: p.kind, id: p.id, updated_at: p.updated_at, deleted: 1 }
          : { kind: p.kind, id: p.id, updated_at: p.updated_at, deleted: 0, body: parse(body) },
      );
    }
    await api('/sync', session, { method: 'POST', body: JSON.stringify({ docs }) });
    for (const p of pending)
      await db.runAsync(
        'DELETE FROM outbox WHERE kind = ? AND id = ? AND updated_at <= ?',
        p.kind,
        p.id,
        p.updated_at,
      );
    if (pending.length < BATCH) break;
  }

  // Pull everything since the last cursor; anything still waiting to upload here is newer and wins.
  let cursor = (await getKv<number>(db, CURSOR)) ?? 0;
  let changed = false;
  for (;;) {
    const r = await api<{ docs: Doc[]; cursor: number; more?: boolean }>(`/sync?since=${cursor}`, session);
    for (const d of r.docs) {
      const local = await db.getFirstAsync<{ updated_at: number }>(
        'SELECT updated_at FROM outbox WHERE kind = ? AND id = ?',
        d.kind,
        d.id,
      );
      if (local && local.updated_at >= d.updated_at) continue;
      await applyDoc(db, d);
      changed = true;
    }
    cursor = r.cursor;
    await setKv(db, CURSOR, cursor);
    if (!r.more || !r.docs.length) break;
  }
  return changed;
}

/** Approximate place from the server (Cloudflare knows the city from the connection). */
export async function geoFromNetwork(): Promise<{
  city: string | null;
  country: string | null;
  lat: number | null;
  lon: number | null;
  timezone: string | null;
} | null> {
  if (!syncUrl) return null;
  try {
    return await api('/geo', null);
  } catch {
    return null;
  }
}
