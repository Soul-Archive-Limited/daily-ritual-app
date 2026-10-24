import { z } from 'zod';

export const KINDS = ['config', 'step', 'day', 'shelf', 'checkin', 'weighin', 'review'] as const;
export const MAX_PUSH_DOCS = 200;
export const MAX_PUSH_BYTES = 512 * 1024;
export const PAGE_SIZE = 500;
/** Timestamps further ahead than this would win every future merge, so they are refused. */
const MAX_CLOCK_AHEAD_MS = 24 * 3_600_000;
const MAX_DEPTH = 32;

const DocInput = z.object({
  kind: z.enum(KINDS),
  id: z.string().min(1).max(128),
  updated_at: z.number().int().nonnegative(),
  deleted: z
    .union([z.literal(0), z.literal(1), z.boolean()])
    .optional()
    .transform((v) => (v === 1 || v === true ? 1 : 0)),
  body: z.unknown().optional(),
});

export const PushBody = z.object({
  docs: z.array(DocInput).max(MAX_PUSH_DOCS),
});

export type PushDoc = z.output<typeof DocInput>;

/** A row ready to store: body already serialised (null for tombstones). */
type Row = { kind: string; id: string; updated_at: number; deleted: 0 | 1; body: string | null };

/**
 * Photos never leave the phone. Any `photo`/`photos` key holding a data URI is refused,
 * and so is an inline image anywhere else in the body. File names are fine.
 */
export function findPhotoData(value: unknown, depth = 0, underPhotoKey = false): string | null {
  if (depth > MAX_DEPTH) return 'body is nested too deeply';
  if (typeof value === 'string') {
    if (underPhotoKey && /^\s*data:/i.test(value)) return 'photos must not be uploaded';
    if (/^\s*data:image\//i.test(value)) return 'images must not be uploaded';
    return null;
  }
  if (Array.isArray(value)) {
    for (const v of value) {
      const hit = findPhotoData(v, depth + 1, underPhotoKey);
      if (hit) return hit;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      const hit = findPhotoData(v, depth + 1, underPhotoKey || /^photos?$/i.test(k));
      if (hit) return hit;
    }
  }
  return null;
}

/** Validates each doc beyond its shape and turns it into a row. Returns an error message instead when one is bad. */
export function toRows(docs: PushDoc[], now = Date.now()): Row[] | { index: number; message: string } {
  const rows: Row[] = [];
  for (const [index, doc] of docs.entries()) {
    if (doc.updated_at > now + MAX_CLOCK_AHEAD_MS) return { index, message: 'updated_at is in the future' };
    if (doc.deleted) {
      rows.push({ kind: doc.kind, id: doc.id, updated_at: doc.updated_at, deleted: 1, body: null });
      continue;
    }
    if (doc.body === undefined || doc.body === null) return { index, message: 'body is required unless deleted' };
    const photo = findPhotoData(doc.body);
    if (photo) return { index, message: photo };
    rows.push({ kind: doc.kind, id: doc.id, updated_at: doc.updated_at, deleted: 0, body: JSON.stringify(doc.body) });
  }
  return rows;
}

/** D1 allows 100 bound parameters per statement: ?1 is the user, then 5 per doc. */
const ROWS_PER_STATEMENT = 19;

/**
 * Last-write-wins upsert. A doc is written only when its updated_at is newer than what is stored,
 * so an unchanged or older doc costs no row write. Each written doc gets the user's next seq.
 *
 * Docs go in multi-row statements (19 per statement, 11 for a full push) inside one batch,
 * which D1 runs as a single transaction. The final statement reads the new cursor.
 */
export async function pushDocs(db: D1Database, userId: string, rows: Row[]) {
  const statements: D1PreparedStatement[] = [];
  for (let start = 0; start < rows.length; start += ROWS_PER_STATEMENT) {
    const chunk = rows.slice(start, start + ROWS_PER_STATEMENT);
    const params: unknown[] = [userId];
    const values = chunk.map((row, i) => {
      const p = params.length + 1;
      params.push(row.kind, row.id, row.updated_at, row.deleted, row.body);
      // Within one statement SQLite may evaluate the MAX once or per row; `+ i + 1` keeps seq unique either way.
      return `(?1, ?${p}, ?${p + 1}, ?${p + 2}, ?${p + 3}, ?${p + 4}, (SELECT COALESCE(MAX(seq), 0) FROM docs WHERE user_id = ?1) + ${i + 1})`;
    });
    statements.push(
      db
        .prepare(
          `INSERT INTO docs (user_id, kind, id, updated_at, deleted, body, seq) VALUES ${values.join(', ')}
           ON CONFLICT (user_id, kind, id) DO UPDATE SET
             updated_at = excluded.updated_at, deleted = excluded.deleted, body = excluded.body, seq = excluded.seq
           WHERE excluded.updated_at > docs.updated_at`,
        )
        .bind(...params),
    );
  }
  statements.push(db.prepare('SELECT COALESCE(MAX(seq), 0) AS cursor FROM docs WHERE user_id = ?').bind(userId));

  const results = await db.batch(statements);
  const applied = results.slice(0, -1).reduce((n, r) => n + (r.meta.changes ?? 0), 0);
  const cursor = (results.at(-1)?.results[0] as { cursor: number } | undefined)?.cursor ?? 0;
  return { cursor, applied, ignored: rows.length - applied };
}

type StoredRow = { kind: string; id: string; updated_at: number; deleted: number; body: string | null; seq: number };

/**
 * Docs changed after `since`, oldest first. Returns the JSON text directly: stored bodies are
 * already JSON, so they are spliced in instead of parsed and re-serialised (saves CPU on big pages).
 */
export async function pullDocs(db: D1Database, userId: string, since: number, limit = PAGE_SIZE): Promise<string> {
  const { results } = await db
    .prepare(
      'SELECT kind, id, updated_at, deleted, body, seq FROM docs WHERE user_id = ? AND seq > ? ORDER BY seq LIMIT ?',
    )
    .bind(userId, since, limit + 1)
    .all<StoredRow>();

  const more = results.length > limit;
  const page = more ? results.slice(0, limit) : results;
  const cursor = page.length ? page[page.length - 1].seq : since;
  const docs = page.map(
    (r) =>
      `{"kind":${JSON.stringify(r.kind)},"id":${JSON.stringify(r.id)},"updated_at":${r.updated_at},"deleted":${r.deleted ? 1 : 0},"body":${r.body ?? 'null'}}`,
  );
  return `{"docs":[${docs.join(',')}],"cursor":${cursor},"more":${more}}`;
}
