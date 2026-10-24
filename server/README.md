# Daily Ritual sync server

A Cloudflare Worker (Hono + D1) for optional accounts and sync. Sign in with Apple or Google. Each phone keeps working fully offline and pushes its changes in batches. Skin photos never leave the phone: the server refuses inline image data.

The official instance runs at https://daily-ritual.fragrant-base-6293.workers.dev. To update it after a change: `cd server && npx wrangler deploy`.

## Run it locally

Each line is one command, run from the repo folder.

Install the server's packages:

```bash
cd server && npm install
```

Run the tests:

```bash
cd server && npm test
```

Create the local database tables (needed once, before signing in locally):

```bash
cd server && npm run db:migrate:local
```

Copy the example local secret (needed only to sign in locally):

```bash
cd server && cp .dev.vars.example .dev.vars
```

Start the server at http://localhost:8787 (then open http://localhost:8787/health):

```bash
cd server && npm run dev
```

## Deploy your own (once)

Each step is one line. Run them in order.

1. Log in to Cloudflare (a browser window opens):

   ```bash
   cd server && npx wrangler login
   ```

2. Create the database. It prints a `database_id`: paste it over the one in `wrangler.jsonc`, and put your own account id (from `npx wrangler whoami`) in `account_id`.

   ```bash
   cd server && npx wrangler d1 create daily-ritual
   ```

3. Create the tables in the real database:

   ```bash
   cd server && npx wrangler d1 migrations apply daily-ritual --remote
   ```

4. Make a random session secret and store it in Cloudflare. You never see or type it:

   ```bash
   cd server && openssl rand -base64 48 | npx wrangler secret put SESSION_SECRET
   ```

5. Build the website and put everything online:

   ```bash
   cd server && npm run deploy
   ```

Put your own sign-in ids in `wrangler.jsonc`: your app's bundle id and website Services ID in `APPLE_AUDIENCES`, your Google iOS and web client ids in `GOOGLE_AUDIENCES` (comma-separated), then deploy again.

Changing `SESSION_SECRET` signs everyone out.

## API

All responses are JSON. Errors look like `{ "error": "code", "message"?: "..." }`.

| Method & path | Auth | What it does |
| --- | --- | --- |
| `GET /health` | – | `{ ok: true }` |
| `GET /geo` | – | `{ city, region, country, lat, lon, timezone }` from Cloudflare's view of the caller's IP. Fields are `null` when unknown. |
| `POST /auth/apple` | – | Body `{ identityToken, nonce? }`. Verifies the Apple ID token (Apple's keys, issuer, audience in `APPLE_AUDIENCES`, expiry, and nonce if sent). Returns `{ token, user }` and sets the `dr_session` cookie. |
| `POST /auth/google` | – | Body `{ idToken, nonce? }`. The same, against Google's keys and `GOOGLE_AUDIENCES`. |
| `GET /sync?since=<cursor>&limit=<1–500>` | yes | `{ docs, cursor, more }`: docs changed after `since`, oldest first, at most 500 per page. |
| `POST /sync` | yes | Body `{ docs: [...] }` with at most 200 docs and 512 KB. Returns `{ cursor, applied, ignored }`. |
| `POST /signout` | – | Clears the cookie. |
| `DELETE /account` | yes | Deletes the user and all their docs. |

**Auth.** The app sends `Authorization: Bearer <token>`. The website (same origin) relies on the httpOnly `dr_session` cookie (Secure, SameSite=Lax). Sessions are HS256 JWTs that last 90 days. They are stateless, so sign-out only clears the cookie. The app should forget its token on sign-out.

**Accounts.** One user per Apple account and one per Google account. If the same verified email signs in with both, they stay two separate users. Linking is a TODO (see `src/users.ts`).

**Docs.** `{ kind, id, updated_at, deleted?, body }`:

- `kind` is one of `config, step, day, shelf, checkin, weighin, review`.
- `id` is the app's own id (`m1`, `2026-10-22`, …), up to 128 characters.
- `updated_at` is the client's time in milliseconds. Values more than 24 h in the future are refused.
- `deleted: 1` is a tombstone. Its body is dropped.
- A `photo`/`photos` key holding a `data:` URI, or any `data:image/…` string, rejects the whole push. File names are fine.

**Merging** is last-write-wins per (user, kind, id): a doc replaces the stored one only if its `updated_at` is strictly newer. If one doc in a push is invalid, nothing from that push is stored.

**Sync flow for the app.**

1. Pull with `GET /sync?since=<saved cursor>` until `more` is false, applying each doc locally by the same last-write-wins rule.
2. Push local changes made since the last push, up to 200 per request.
3. Pull once more from the cursor saved in step 1. That brings in any other device's changes made in between, and the server's copy of any doc where the server won.

Save the cursor from the last pull. Only use the cursor that a push returns when no other device could have written in between.

**Rate limits** (429 with `Retry-After: 60`): sign-in 10/min per IP, sync and account calls 30/min per user, geo 30/min per IP.

**CORS.** Requests with no `Origin` (the app) are allowed. Browsers are allowed only from this Worker's own origin, plus anything in `ALLOWED_ORIGINS`. Every other origin gets 403.

## Staying on the free plan

D1 Free allows 100,000 rows written and 5 million rows read per day.

- A changed doc costs **2 rows written**: the row plus its `seq` index. This was measured locally.
- An unchanged or older doc costs **0 rows written**.
- Pushes, pulls and sign-ins add no other writes, except a user's first sign-in (or an email change).
- The change counter (`seq`) is read from the index (`MAX(seq)`), so no counter row gets rewritten.

At 10,000 daily users that is a budget of about **5 changed docs per user per day**. The app must batch: keep one `day` doc per date and push when the app goes to the background (or at most every ~15 minutes), not on every tick. If usage outgrows this, Workers Paid ($5/month) includes 50 million rows written per month.

Free Workers also get 10 ms of CPU per request. Pulls splice the stored JSON straight into the response rather than parsing and re-serialising it.
