import type { SQLiteDatabase } from 'expo-sqlite';

import type { ExportFile } from './import';
import type { ShelfRecord } from '@/logic/shelf';
import type { Checkin } from '@/skin/model';

import type { Config, Day, Review, Step, StepRule } from './types';

type StepRow = {
  id: string;
  slot: Step['slot'];
  position: number;
  name: string;
  product: string;
  note: string;
  schedule: StepRule;
  essential: number;
  paused: number;
  type: 'water' | null;
  goal: number | null;
};

const toStep = (r: StepRow): Step => ({
  id: r.id,
  slot: r.slot,
  name: r.name,
  product: r.product,
  note: r.note,
  on: r.schedule,
  ...(r.essential ? { essential: true } : {}),
  ...(r.paused ? { paused: true } : {}),
  ...(r.type ? { type: r.type } : {}),
  ...(r.goal != null ? { goal: r.goal } : {}),
});

/** Kinds of synced documents (the server accepts exactly these). */
export type SyncKind = 'config' | 'step' | 'day' | 'shelf' | 'checkin' | 'weighin' | 'review';

/** Note a change for the next sync. Cheap, so it is recorded whether or not anyone is signed in. */
export async function markChanged(db: SQLiteDatabase, kind: SyncKind, id: string, deleted = false) {
  await db.runAsync(
    'INSERT OR REPLACE INTO outbox (kind, id, updated_at, deleted) VALUES (?, ?, ?, ?)',
    kind,
    id,
    Date.now(),
    deleted ? 1 : 0,
  );
}

export async function getConfig(db: SQLiteDatabase): Promise<Config | null> {
  const row = await db.getFirstAsync<{ value: string }>("SELECT value FROM kv WHERE key = 'config'");
  return row ? (JSON.parse(row.value) as Config) : null;
}

export async function setConfig(db: SQLiteDatabase, config: Config) {
  await db.runAsync("INSERT OR REPLACE INTO kv (key, value) VALUES ('config', ?)", JSON.stringify(config));
  await markChanged(db, 'config', 'config');
}

export async function getSteps(db: SQLiteDatabase): Promise<Step[]> {
  const rows = await db.getAllAsync<StepRow>('SELECT * FROM steps ORDER BY position');
  return rows.map(toStep);
}

export async function getDays(db: SQLiteDatabase, from?: string, to?: string): Promise<Record<string, Day>> {
  const rows = await db.getAllAsync<{ doc: string }>(
    'SELECT doc FROM days WHERE date >= ? AND date <= ? ORDER BY date',
    from ?? '0000-00-00',
    to ?? '9999-99-99',
  );
  const out: Record<string, Day> = {};
  for (const r of rows) {
    const d = JSON.parse(r.doc) as Day;
    out[d.date] = d;
  }
  return out;
}

export async function putDay(db: SQLiteDatabase, day: Day) {
  await db.runAsync(
    'INSERT OR REPLACE INTO days (date, pct, at, doc) VALUES (?, ?, ?, ?)',
    day.date,
    day.pct ?? 0,
    day.at ?? Date.now(),
    JSON.stringify(day),
  );
  await markChanged(db, 'day', day.date);
}

/** Everything, in the backup file format (Profile › Backup). */
export async function exportAll(db: SQLiteDatabase): Promise<ExportFile> {
  const [config, steps, days, checkins, weighins, shelf, reviews] = await Promise.all([
    getConfig(db),
    getSteps(db),
    getDays(db),
    db.getAllAsync<{ doc: string }>('SELECT doc FROM checkins ORDER BY date'),
    db.getAllAsync<{ id: string; date: string; kg: number; at: number }>('SELECT * FROM weighins ORDER BY at'),
    db.getAllAsync<{ id: string; doc: string }>('SELECT * FROM shelf'),
    db.getAllAsync<{ doc: string }>('SELECT doc FROM reviews ORDER BY week'),
  ]);
  return {
    exportedAt: new Date().toISOString().slice(0, 10),
    app: { config: { ...(config as Config), steps } },
    days: Object.fromEntries(Object.entries(days).map(([k, { date: _d, ...rest }]) => [k, rest])),
    checkins: checkins.map((r) => JSON.parse(r.doc)),
    body: weighins,
    shelf: Object.fromEntries(shelf.map((r) => [r.id, JSON.parse(r.doc)])),
    reviews: reviews.map((r) => JSON.parse(r.doc)),
  };
}

/** Replace the whole routine (it's small), keeping the given order. */
export async function saveSteps(db: SQLiteDatabase, steps: Step[]) {
  await db.withExclusiveTransactionAsync(async (tx) => {
    await tx.runAsync('DELETE FROM steps');
    for (const [i, s] of steps.entries()) {
      await tx.runAsync(
        `INSERT INTO steps (id, slot, position, name, product, note, schedule, essential, paused, type, goal)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        s.id,
        s.slot,
        i,
        s.name,
        s.product ?? '',
        s.note ?? '',
        s.on ?? 'every',
        s.essential ? 1 : 0,
        s.paused ? 1 : 0,
        s.type ?? null,
        s.goal ?? null,
      );
    }
  });
  await markChanged(db, 'step', 'routine');
}

export type Weighin = { id: string; date: string; kg: number; at: number };

export async function getWeighins(db: SQLiteDatabase): Promise<Weighin[]> {
  return db.getAllAsync<Weighin>('SELECT id, date, kg, at FROM weighins ORDER BY date, at');
}

export async function putWeighin(db: SQLiteDatabase, w: Weighin) {
  await db.runAsync('INSERT OR REPLACE INTO weighins (id, date, kg, at) VALUES (?, ?, ?, ?)', w.id, w.date, w.kg, w.at);
  await markChanged(db, 'weighin', w.id);
}

export async function deleteWeighin(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM weighins WHERE id = ?', id);
  await markChanged(db, 'weighin', id, true);
}

export async function getKv<T>(db: SQLiteDatabase, key: string): Promise<T | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv WHERE key = ?', key);
  return row ? (JSON.parse(row.value) as T) : null;
}

export async function setKv(db: SQLiteDatabase, key: string, value: unknown) {
  await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', key, JSON.stringify(value));
}

export async function getShelf(db: SQLiteDatabase): Promise<Record<string, ShelfRecord>> {
  const rows = await db.getAllAsync<{ id: string; doc: string }>('SELECT id, doc FROM shelf');
  return Object.fromEntries(rows.map((r) => [r.id, JSON.parse(r.doc) as ShelfRecord]));
}

export async function putShelf(db: SQLiteDatabase, id: string, doc: ShelfRecord) {
  await db.runAsync('INSERT OR REPLACE INTO shelf (id, doc) VALUES (?, ?)', id, JSON.stringify(doc));
  await markChanged(db, 'shelf', id);
}

export async function deleteShelf(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM shelf WHERE id = ?', id);
  await markChanged(db, 'shelf', id, true);
}

export async function getCheckins(db: SQLiteDatabase): Promise<Checkin[]> {
  const rows = await db.getAllAsync<{ doc: string }>('SELECT doc FROM checkins ORDER BY date DESC');
  return rows.map((r) => JSON.parse(r.doc) as Checkin);
}

export async function putCheckin(db: SQLiteDatabase, c: Checkin) {
  await db.runAsync(
    'INSERT OR REPLACE INTO checkins (id, date, doc) VALUES (?, ?, ?)',
    c.id,
    c.date,
    JSON.stringify(c),
  );
  await markChanged(db, 'checkin', c.id);
}

export async function deleteCheckinRow(db: SQLiteDatabase, id: string) {
  await db.runAsync('DELETE FROM checkins WHERE id = ?', id);
  await markChanged(db, 'checkin', id, true);
}

/** Newest first */
export async function getReviews(db: SQLiteDatabase): Promise<Review[]> {
  const rows = await db.getAllAsync<{ doc: string }>('SELECT doc FROM reviews ORDER BY week DESC');
  return rows.map((r) => JSON.parse(r.doc) as Review);
}

export async function putReview(db: SQLiteDatabase, r: Review) {
  await db.runAsync(
    'INSERT OR REPLACE INTO reviews (id, week, doc) VALUES (?, ?, ?)',
    `rv-${r.week}`,
    r.week,
    JSON.stringify(r),
  );
  await markChanged(db, 'review', r.week);
}
