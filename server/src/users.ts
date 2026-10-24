import type { ProviderIdentity } from './auth';

export type Provider = 'apple' | 'google';

export type User = { id: string; email: string | null; created_at: number };

const SUB_COLUMN: Record<Provider, 'apple_sub' | 'google_sub'> = {
  apple: 'apple_sub',
  google: 'google_sub',
};

/**
 * Finds the user for this provider account, creating it on first sign-in.
 * A returning user costs one read and no writes (a write only when their email changed).
 *
 * TODO(linking): if the same verified email exists on an Apple user and a Google user they stay
 * separate accounts. Linking needs an explicit, signed-in "connect Google/Apple" flow — never
 * merge on email alone.
 */
export async function upsertUser(db: D1Database, provider: Provider, identity: ProviderIdentity): Promise<User> {
  const col = SUB_COLUMN[provider];
  const select = db.prepare(`SELECT id, email, created_at FROM users WHERE ${col} = ?`).bind(identity.sub);

  const existing = await select.first<User>();
  if (existing) {
    if (identity.email && identity.email !== existing.email) {
      await db.prepare('UPDATE users SET email = ? WHERE id = ?').bind(identity.email, existing.id).run();
      return { ...existing, email: identity.email };
    }
    return existing;
  }

  // ON CONFLICT covers two first sign-ins racing; whichever lands first wins and both read it back.
  await db
    .prepare(`INSERT INTO users (id, ${col}, email, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(${col}) DO NOTHING`)
    .bind(crypto.randomUUID(), identity.sub, identity.email, Date.now())
    .run();
  const created = await select.first<User>();
  if (!created) throw new Error('user insert failed');
  return created;
}

/** Deletes the user and all their docs in one transaction. */
export async function deleteUser(db: D1Database, userId: string): Promise<boolean> {
  const res = await db.batch([
    db.prepare('DELETE FROM docs WHERE user_id = ?').bind(userId),
    db.prepare('DELETE FROM users WHERE id = ?').bind(userId),
  ]);
  return (res[1]?.meta.changes ?? 0) > 0;
}

/** The signed-in user, or null when the account was deleted. */
export async function getUser(db: D1Database, id: string): Promise<User | null> {
  return db.prepare('SELECT id, email, created_at FROM users WHERE id = ?').bind(id).first<User>();
}
