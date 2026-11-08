# Real-time play (then co-editing): live rooms over WebSockets

Build spec, written 2026-11-07. The course owner asked for real-time collaboration, play first, then
co-editing on the same server piece. Cloudflare was checked first (the owner also has a VPS on the tailnet
as a fallback): wrangler is logged in to the shCode account (bd9289625d5d3d62591c36e5ebe49055) with
workers/scripts write, and the Workers Free plan can create and use SQLite-backed Durable Objects with the
WebSocket Hibernation API (idle rooms are not billed; outgoing messages are free; incoming ones count 20:1
against the daily request allowance). So the live server is a Durable Object, not the VPS.

**Nothing new is deployed to Cloudflare until the owner says so.** Build and test locally first.

## What exists (keep it working)

The turn-based relay (polling D1, `functions/api/rooms/*`, migration 0041, rules in
`functions/_shared/rooms.ts`), the lobby (`components/MoshionLobby.tsx`, picture codes `lib/room-icons.ts`),
the sketch API (`public/moshion/extras.js`: `online.*`, `multiplayer(mode, players)`), its parent half
(`lib/moshion-online.ts`), the Games library and the online demos. Read CLAUDE.md "Online game rooms",
"Online demos" and "Games library". Every existing sketch and lesson behaves exactly as now.

## The student API

```js
multiplayer('coop', 4, { realtime: true });   // or 'versus'; 2-4 players as before
online.share(player);                          // this sprite's x, y, rotation (and vel) on every screen
online.send({ shoot: true });                  // events arrive in a few ms, same order everywhere
online.onMove((move, seat) => { ... });        // unchanged
```

- `realtime: true` uses a live room (WebSocket) instead of polling. The lobby, picture codes, classmates-only
  rule and seats are the SAME (a live room is created through the same `POST /api/rooms`, with a flag), so the
  lobby code path barely changes.
- `online.share(sprite)`: the owner seat (the seat that called it) sends that sprite's state about 15-20 times
  a second; other computers create/update a matching sprite and smooth between updates (interpolate, do not
  teleport). Sprites shared by other seats appear automatically as `online.peers[seat]` (a sprite each) so a
  student can draw/collide with them. Only the owner moves its own shared sprite.
- `online.send` / `onMove` keep their meaning; in real time they arrive within milliseconds. Turn helpers
  (`myTurn`, `nextTurn`) still work.
- Honest limits in the docs: no physics is shared (each computer simulates its own; shared sprites are
  positions), collisions between players are decided by the owner of the thing that was hit, and lag is real.

## Server

- A new Worker project `workers/live/` (its own `wrangler.toml`, name `shcode-live`, a Durable Object class
  `LiveRoom` with `new_sqlite_classes` migration — SQLite-backed, the only kind the free plan allows), using
  the WebSocket Hibernation API (`state.acceptWebSocket`, `webSocketMessage`, `serializeAttachment` for the
  per-socket seat/email). No HTTP surface of its own beyond what the binding calls.
- The Pages project binds it: `[[durable_objects.bindings]] name = "LIVE", class_name = "LiveRoom",
  script_name = "shcode-live"` in the repo's wrangler.toml (and the Pages dashboard binding for production).
- `GET /api/live/[code]` (a Pages Function, behind the existing auth middleware): checks the caller is a
  player in that room (D1, the same rules as the polling routes: classmates only, a seat per tab/device), then
  forwards the WebSocket upgrade to `env.LIVE.idFromName(code)` with the seat attached (a header the DO
  trusts only from the binding). The DO never sees the cookie and trusts only what the Function passed.
- In the DO: every message is checked with the same `checkGameData` rules (game data only, no sentences)
  plus a shared-sprite message shape; per-socket rate limit (e.g. 30 messages/s, burst 60); room size from
  D1's seats; a closed or expired room refuses; the host leaving closes the room (as now). Messages are
  stamped with the sender's seat by the DO, never trusted from the client.
- Polling rooms keep working; a live room also records nothing per-frame in D1 (only joins/leaves/close).

## Local development (no Cloudflare)

- `server.js` gets an in-process stand-in for the live room (the `ws` package if already a dependency, else
  Node's built-in WebSocket server support in Next's custom server), speaking the SAME message protocol, so
  the browser path is identical in dev. Keep the protocol in one shared module used by the DO and the stand-in.
- The real Worker is also exercised once with `npx wrangler dev` in `workers/live/` (miniflare) by a script
  test that opens two sockets and checks relay, seat stamping, refusal of bad data, rate limit and close.

## Tests
- `scripts/test-live-room.mjs` in npm test: the shared protocol (message checks, rate limit, shared-sprite
  shape) against the stand-in; the Pages route's auth (non-player 404, classmates only, closed room 410).
- Browser on the dev server: a small `multiplayer('coop', 2, { realtime: true })` sketch where each player
  moves a square with the arrow keys and sees the other's square move smoothly, in two tabs.

## Then: co-editing (separate part, same Worker)
A `LiveDoc` Durable Object per shared file, CodeMirror's collaboration extension (`@codemirror/collab`) in
the sandbox, a "Collaborate" button that invites classmates (same classes-only rule), saving through the
existing lesson-sync path. Spec it after real-time play ships.
