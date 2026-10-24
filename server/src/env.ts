import type { JWTVerifyGetKey } from 'jose';

/** Bindings from wrangler.jsonc plus the secret set with `wrangler secret put`. */
export type Bindings = Env & { SESSION_SECRET: string };

export type AppEnv = {
  Bindings: Bindings;
  Variables: { userId: string };
};

/** Where Apple and Google signing keys come from. Tests pass local key sets. */
export type KeySources = {
  apple: JWTVerifyGetKey;
  google: JWTVerifyGetKey;
};
