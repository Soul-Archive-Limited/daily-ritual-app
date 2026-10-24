import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 2;

/**
 * All data is local-first in one SQLite file.
 * Day/check-in/review rows keep the web app's document shape in a JSON `doc` column,
 * with the fields we query on pulled out into real columns.
 */
const V1 = `
PRAGMA journal_mode = 'wal';

CREATE TABLE IF NOT EXISTS kv (
  key   TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS steps (
  id        TEXT PRIMARY KEY NOT NULL,
  slot      TEXT NOT NULL,
  position  INTEGER NOT NULL,
  name      TEXT NOT NULL,
  product   TEXT NOT NULL DEFAULT '',
  note      TEXT NOT NULL DEFAULT '',
  schedule  TEXT NOT NULL DEFAULT 'every',
  essential INTEGER NOT NULL DEFAULT 0,
  paused    INTEGER NOT NULL DEFAULT 0,
  type      TEXT,
  goal      INTEGER
);

CREATE TABLE IF NOT EXISTS days (
  date TEXT PRIMARY KEY NOT NULL,
  pct  INTEGER NOT NULL DEFAULT 0,
  at   INTEGER,
  doc  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS checkins (
  id   TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  doc  TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS checkins_date ON checkins(date);

CREATE TABLE IF NOT EXISTS weighins (
  id   TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  kg   REAL NOT NULL,
  at   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS weighins_date ON weighins(date);

CREATE TABLE IF NOT EXISTS shelf (
  id  TEXT PRIMARY KEY NOT NULL,
  doc TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id   TEXT PRIMARY KEY NOT NULL,
  week TEXT NOT NULL,
  doc  TEXT NOT NULL
);
`;

/** Changes waiting to be sent to the sync server (only used when signed in). */
const V2 = `
CREATE TABLE IF NOT EXISTS outbox (
  kind       TEXT NOT NULL,
  id         TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, id)
);
`;

export async function migrateDb(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version < 1) {
    await db.execAsync(V1);
    version = 1;
  }
  if (version < 2) {
    await db.execAsync(V2);
    version = 2;
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
