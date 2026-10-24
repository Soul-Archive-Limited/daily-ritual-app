-- Accounts. A user signs in with Apple or Google; the two are never linked automatically.
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  apple_sub TEXT UNIQUE,
  google_sub TEXT UNIQUE,
  email TEXT,
  created_at INTEGER NOT NULL
);

-- One row per synced document. WITHOUT ROWID keeps the primary key as the table itself,
-- so a write touches the row plus the seq index and nothing else.
-- seq is the per-user change counter: every accepted write gets MAX(seq)+1 for that user
-- (read through idx_docs_user_seq), so no separate counter row has to be written.
CREATE TABLE docs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  id TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted INTEGER NOT NULL DEFAULT 0,
  body TEXT,
  seq INTEGER NOT NULL,
  PRIMARY KEY (user_id, kind, id)
) WITHOUT ROWID;

CREATE INDEX idx_docs_user_seq ON docs (user_id, seq);
