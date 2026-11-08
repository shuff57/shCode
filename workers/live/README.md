# shcode-live

The real-time rooms' Durable Objects. Spec: `codehs-review/REALTIME-SPEC.md`.

- `LiveRoom`: real-time play (Part 1). Protocol and rules: `lib/live-protocol.ts`.
- `LiveDoc`: Code together, one shared sandbox program (Part 2, migration tag `v2`). Protocol and
  rules: `lib/live-doc-protocol.ts`. It writes its own text to D1 `code_sessions` (migration 0044)
  through the `DB` binding, the same database as the Pages project.

Both are shared with the dev server's stand-in, `scripts/dev-live.mjs`. The only way in is the Pages
Function `functions/api/live/[code].ts`, through the `LIVE` and `LIVE_DOC` bindings.

- Local check, deploys nothing: `npx wrangler dev -c wrangler.test.toml --port 8799`, then
  `node scripts/test-live-worker.mjs http://127.0.0.1:8799` from the repo root.
- Deploy (the course owner's call): apply migration 0044 first (`npm run d1:migrate`), then
  `npx wrangler deploy` here, then the site with the `LIVE_DOC` binding.
