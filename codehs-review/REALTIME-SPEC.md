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

## Part 2: co-editing ("Code together"), written 2026-11-08

Real-time play shipped 2026-11-07 (Worker `shcode-live` deployed, migration 0043 applied, site live). This
part lets 2-4 classmates edit ONE sandbox program at the same time, on the same Worker. **Build and test
locally; nothing new is deployed (no migration applied, no `wrangler deploy`) until the owner says so.**

### Scope
- **Sandbox only**, the JavaScript (console) and moSHion modes. Never in a lesson: a lesson is a student's own
  graded work, so no lesson page shows the button.
- 2-4 people. The host's current sandbox code is the starting text.

### The student's view
- A **Code together** button in the sandbox toolbar (signed in and in a live class; otherwise it is absent,
  like Publish game). It opens a small bar above the editor, the same look as the moSHion lobby bar
  (components/MoshionLobby.tsx): **Start** (pick 2-4 people), the 4-picture code with the picture picker to
  join by code, and **Open sessions** in your classes for this mode (host name, "2 of 3 here", Join).
- Joining confirms first ("Your sandbox code will be swapped for the shared program. Your own code is kept in
  History."), then saves the joiner's current draft as a History snapshot (the same helper Remix uses in
  lib/games-client.ts) and loads the shared text.
- While in a session: the bar reads "Coding together · <code pictures> · 3 here: Sam R., Ana P., you", with
  Leave. Each other person's cursor and selection show in the editor in their own colour with a small name
  tag. Typing anywhere appears for everyone within a fraction of a second. Run runs on each computer
  separately (no shared run); the moSHion online modes still work inside it.
- Leave (or closing the tab): you keep the shared program as your own sandbox draft (saved through the normal
  sandbox save path, so it reaches Cloud history). The host leaving ends the session for everyone, each
  keeping a copy, with a plain note "Sam R. ended the session. You kept a copy."
- Offline/expired: the bar says so in plain words; the editor goes back to being yours, text kept.

### Rooms and rules (reuse, do not fork)
- A session is a **room** in `game_rooms` (same codes, seats per account + tab, classmates only, 3 hours,
  3 open per host, host leaving closes it). Migration **0044**: `ALTER TABLE game_rooms ADD COLUMN kind TEXT
  NOT NULL DEFAULT 'game'`, values `'game' | 'code'`. A code room is always `live = 1`.
  `POST /api/rooms { kind: 'code', game: 'code-js' | 'code-moshion', seats }`; `GET /api/rooms?game=&live=1&kind=code`
  lists code rooms only, and a game lobby never lists one. The polling send route refuses a code room (409).
- `GET /api/live/[code]` routes by kind: a game room to `LIVE` (LiveRoom, as now), a code room to a new binding
  `LIVE_DOC` (class `LiveDoc` in the same Worker, script `shcode-live`). The ticket and auth are the same
  (`authorizeLive`), plus the kind.

### Server: the `LiveDoc` Durable Object (workers/live/, same Worker)
- A second SQLite-backed class, migration tag `v2`, `new_sqlite_classes = ["LiveDoc"]`, WebSocket Hibernation.
- **The algorithm is `@codemirror/collab`'s central-authority model** (add `@codemirror/collab` as a
  dependency; `@codemirror/state` already is): the DO holds the document and the ordered list of accepted
  updates (`ChangeSet.toJSON()` + `clientID`), a client sends `{ t: 'push', version, updates }`; if `version`
  equals the DO's, the DO applies them (`ChangeSet.fromJSON`, `apply` to its `Text`), appends, and broadcasts
  `{ t: 'updates', updates }` to every socket; otherwise it answers with the updates since `version` and the
  client rebases (the collab extension does this: `receiveUpdates`, `sendableUpdates`). Rebuild from the
  doc's own text + version on wake.
- Persist the text and version in the DO's storage (SQLite) on every accepted push batch, and keep only the
  last 500 updates in memory (an older `version` gets `{ t: 'reset', doc, version }` and starts again).
- Limits: document 64 KB (UTF-8 bytes; a push that would exceed it is refused with a plain error), frame
  16 KB, the same 30/s burst-60 token bucket per socket, presence (`{ t: 'cursor', anchor, head }`) at most
  10/s and relayed only, never stored. Updates are stamped with the sender's seat by the DO.
- On connect: `{ t: 'hello', seat, seats, players, version, doc }`. The FIRST socket of the host seeds an
  empty doc with `{ t: 'seed', doc }` (accepted only from seat 0 and only while version is 0 and the doc is empty).
- Put the doc protocol and its rules in ONE shared module, `lib/live-doc-protocol.ts` (`LiveDocCore`), used by
  the DO and by the dev stand-in (`scripts/dev-live.mjs`), exactly as `LiveRoomCore` is.

### Safety: this is free text, so it is kept and visible to teachers
Game rooms carry game data only so they cannot be a chat (owner's rule, 2026-11-07). Code is free text, so a
shared program could carry messages in comments. The rules that stand in for "game data only":
- Classmates only, as rooms. Names first name + last initial.
- **The shared program is kept and a teacher can read it.** The `shcode-live` Worker gets its own D1 binding
  (`DB`, database `shcode-commits`, the same id as the repo's wrangler.toml) and the LiveDoc writes the text
  itself (never a client's copy) to table `code_sessions` (code, host_email, kind ('js'|'moshion'),
  participants JSON of emails from the tickets, text, started_at, updated_at, closed_at): at most every 2
  minutes while the text changes, and on close (host leaves, expiry, or the last person leaves). Rows older
  than 30 days are deleted on the next write. Migration 0044 creates the table; the ticket carries the email
  for this (the Worker has no public URL, so it never leaves Cloudflare), but no email is ever sent to a socket.
- The class page's Students tab gets **Code together sessions** (`GET /api/classes/[id]/code-sessions`,
  owner, co-teacher or admin): sessions whose host or any participant is enrolled in that class, newest
  first, with names and a read-only view of the text. Students are told on the bar: "Your teacher can see
  programs you write together."

### Client
- `lib/live-doc.ts`: opens the socket (`GET /api/live/<code>?device=`), runs the collab extension
  (`collab({ startVersion, clientID })` plus a ViewPlugin that pushes `sendableUpdates` and applies incoming
  `updates`), presence decorations, reconnect with backoff (on reconnect, pull from its version).
- `components/CodeMirrorPane.tsx` takes an optional `collab` prop (extensions to add through a Compartment)
  so the sandbox can switch it on and off without remounting the editor; the sandbox keeps the store's file
  text in step with the editor as now (onChange), so Run and Save behave as always.
- `components/CodeTogetherBar.tsx` (reusing MoshionLobby's picture picker and open-rooms list where it can).

### Dev
- `scripts/dev-live.mjs` serves code rooms too, with the same `LiveDocCore`. In dev, two `dev_student`
  cookies are two classmates (as the game lobby).

### Tests
- `scripts/test-live-doc.mjs` in npm test: concurrent pushes from two clients converge to the same text
  (simulate with two `@codemirror/state` clients and the core, many random edits); a stale version gets the
  missing updates; seed only from seat 0 at version 0; the 64 KB cap; rate limit; presence not stored;
  `kind` routing (a code room is refused by the polling send route and by LIVE; a game room by LIVE_DOC);
  the room list keeps the kinds apart; `code_sessions` written on close and readable only by that class's
  teachers.
- `scripts/test-live-worker.mjs` gains a LiveDoc case against `npx wrangler dev -c wrangler.test.toml` (local only).
- Browser on the dev server: two tabs of two dev students in the sandbox, moSHion mode: Start in one, Join
  from Open sessions in the other, type in both at once (the same line too), see both cursors, Leave, each
  keeps the program; then the teacher view lists the session.

### Deploy order (when the owner says so)
Apply 0044 (`npm run d1:migrate`), `cd workers/live && npx wrangler deploy` (adds LiveDoc, tag v2), then the
site with the `LIVE_DOC` binding in the repo's wrangler.toml (`script_name = "shcode-live"`).
