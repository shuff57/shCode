# Deploy — Cloudflare Pages + Functions + D1

The site is deployed to Cloudflare Pages as a static Next.js export. The
commit history backend runs as Pages Functions backed by a D1 database,
with Cloudflare Access gating the API so only signed-in students can
write their own commits.

Production URL: `https://<your-pages-project>.pages.dev` (or whatever
custom domain you wire up).

## One-time setup

### 1. Install wrangler

```
npm install -D wrangler @cloudflare/workers-types
```

### 2. Create the D1 database

```
npx wrangler d1 create shcode-commits
```

Copy the printed `database_id` into `wrangler.toml` in the `[[d1_databases]]`
block. Commit that change (the id is not a secret).

### 3. Run the schema migration

```
npx wrangler d1 execute shcode-commits --file migrations/0001_commits.sql --remote
```

(Add `--local` instead of `--remote` to run it against a local wrangler
SQLite copy for testing.)

### 4. Configure Cloudflare Access

In the Cloudflare **Zero Trust** dashboard:

1. **Settings -> Authentication** — add **Google** (or Google Workspace)
   as a login method. Grant the OAuth consent screen.
2. **Access -> Applications -> Add an application -> Self-hosted**.
   - Application domain: your Pages project URL (e.g. `shcode.pages.dev`).
   - Path (optional): `/api/*` — only the API needs Access; the static
     site stays public so lessons load for everyone.
   - Session duration: whatever matches the school day (8 hours is fine).
   - Identity providers: Google (from step 1).
   - Policy: "Allow" where Selector = Emails ending in, Value =
     `@chicousd.org` (or whatever student domain applies).
3. Open the application you just created. Copy:
   - **Application Audience (AUD) Tag** — paste into `wrangler.toml`
     `ACCESS_AUD`.
   - **Team domain** (on the Zero Trust settings page, e.g.
     `yourteam.cloudflareaccess.com`) — paste into `wrangler.toml`
     `ACCESS_TEAM_DOMAIN`.
4. Update `ALLOWED_EMAIL_DOMAIN` in `wrangler.toml` to the same domain
   you used in the policy (e.g. `@chicousd.org`).

### 5. Bind D1 in the Pages project

In the Cloudflare dashboard for the Pages project:
**Settings -> Functions -> D1 database bindings -> Add binding**
- Variable name: `DB`
- D1 database: `shcode-commits`

(The binding is also defined in `wrangler.toml` for local dev; the
dashboard copy is what production reads.)

### 6. Push env vars into the Pages project

In **Settings -> Environment variables**, for **Production**, add:
- `ACCESS_TEAM_DOMAIN` — same as in `wrangler.toml`
- `ACCESS_AUD` — same as in `wrangler.toml`
- `ALLOWED_EMAIL_DOMAIN` — same as in `wrangler.toml`

(`wrangler.toml` `[vars]` is used for local `wrangler pages dev`, but the
dashboard copy is what prod uses.)

## Deploying

Push to the branch that your Pages project tracks (or run
`npx wrangler pages deploy out` after `npm run build`). Pages picks up
`functions/` automatically.

## Local testing

`npm run dev` (Next.js + server.js) does NOT run Functions — the API
routes 404 locally that way. To exercise the commit API against a local
SQLite copy:

```
npm run build
npx wrangler pages dev out
```

This serves the static export at `http://localhost:8788` and runs the
Functions bound to a local `.wrangler/state/v3/d1/...` SQLite file. No
Access headers will be present in local mode, so the Functions detect
that and stamp a dev-only identity on writes (see
`functions/_middleware.ts`).
