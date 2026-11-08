# shcode-live

The real-time rooms' Durable Object (`LiveRoom`). Spec: `codehs-review/REALTIME-SPEC.md`.
Protocol and rules: `lib/live-protocol.ts` (shared with the dev server's stand-in, `scripts/dev-live.mjs`).
The only way in is the Pages Function `functions/api/live/[code].ts` through the `LIVE` binding.

- Local check, deploys nothing: `npx wrangler dev -c wrangler.test.toml --port 8799`, then
  `node scripts/test-live-worker.mjs http://127.0.0.1:8799` from the repo root.
- Deploy (the course owner's call): `npx wrangler deploy` here, then the Pages binding.
