import type { SQLiteDatabase } from 'expo-sqlite';

import type { Config, Day, Step } from './types';

/** The backup file format (also what the original web app exported). */
export type ExportFile = {
  exportedAt?: string;
  app: { config: Config & { steps: Step[] } };
  days?: Record<string, Omit<Day, 'date'>>;
  checkins?: ({ id?: string; date: string } & Record<string, unknown>)[];
  body?: ({ id?: string; date: string; kg: number; at?: number } & Record<string, unknown>)[];
  shelf?: Record<string, Record<string, unknown>>;
  reviews?: ({ id?: string; week?: string; date?: string } & Record<string, unknown>)[];
};

/** Replace everything with the contents of an export file. Keeps the original ids (m1, n4, h1…). */
export async function importExport(db: SQLiteDatabase, data: ExportFile) {
  const { steps, ...config } = data.app.config;
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      'DELETE FROM steps; DELETE FROM days; DELETE FROM checkins; DELETE FROM weighins; DELETE FROM shelf; DELETE FROM reviews;',
    );

    await db.runAsync('INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)', 'config', JSON.stringify(config));

    for (const [i, s] of steps.entries()) {
      await db.runAsync(
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

    for (const [date, d] of Object.entries(data.days ?? {})) {
      const doc: Day = { ...d, date, done: d.done ?? {} };
      await db.runAsync(
        'INSERT INTO days (date, pct, at, doc) VALUES (?, ?, ?, ?)',
        date,
        doc.pct ?? 0,
        doc.at ?? null,
        JSON.stringify(doc),
      );
    }

    for (const c of data.checkins ?? []) {
      const id = c.id ?? `ck-${c.date}`;
      await db.runAsync(
        'INSERT INTO checkins (id, date, doc) VALUES (?, ?, ?)',
        id,
        c.date,
        JSON.stringify({ ...c, id }),
      );
    }

    for (const b of data.body ?? []) {
      const at = b.at ?? Date.parse(b.date);
      await db.runAsync(
        'INSERT INTO weighins (id, date, kg, at) VALUES (?, ?, ?, ?)',
        b.id ?? `w-${at}`,
        b.date,
        b.kg,
        at,
      );
    }

    for (const [id, doc] of Object.entries(data.shelf ?? {})) {
      await db.runAsync('INSERT INTO shelf (id, doc) VALUES (?, ?)', id, JSON.stringify(doc));
    }

    for (const r of data.reviews ?? []) {
      const week = r.week ?? r.date ?? '';
      const id = r.id ?? `rv-${week}`;
      await db.runAsync('INSERT INTO reviews (id, week, doc) VALUES (?, ?, ?)', id, week, JSON.stringify({ ...r, id }));
    }
  });
}
