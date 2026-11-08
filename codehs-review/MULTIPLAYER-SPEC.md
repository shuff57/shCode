# Multiplayer as a setting, a lobby, and a Games library

Build spec, written 2026-11-07. Decided by the course owner:

- One setting, four modes: `'none'` (default), `'local'` (same keyboard), `'coop'` (online, same side),
  `'versus'` (online, against each other).
- The student sets the number of players, **2 to 4**, for every mode except `'none'`.
- Another student joins through a **Games library**: a student publishes a game to Library → Games, a
  classmate opens it (it runs the publisher's code, so both have the same game), and then hosts, joins by
  code, or picks an open room from a list. Classmates only, as rooms already are.

What exists and must keep working: the relay (`functions/api/rooms/*`, migration 0041, rules in
`functions/_shared/rooms.ts`: classmates only, game data only, a seat is an account in a tab) and the
sketch API `online.*` in `public/moshion/extras.js` with its parent half `lib/moshion-online.ts`. Read
CLAUDE.md "Online game rooms". Every lesson that already uses `online.host()` / `online.join(JOIN)` (6.25,
6.31, 7.20 and their sub-builds) keeps working unchanged: the new layer sits on top of `online`.

## Part A: the setting and the lobby (one builder)

### The sketch API (extras.js; NOT the vendored moshion.js)

```js
multiplayer('versus', 2);   // in setup(); mode, then players 2-4 (default 2)
```

| Mode | What it means | Provided |
| --- | --- | --- |
| `'none'` | one player (default; calling nothing is the same) | nothing changes |
| `'local'` | 2-4 players take turns at one keyboard | `players` (count), `turn` (0..players-1), `nextTurn()`, `myTurn()` (always true) |
| `'versus'` | online, turn-based, against each other | the lobby; `seat`; `turn`; `myTurn()` (true when seat === turn and the room is full); `nextTurn()` (call it inside onMove so every computer advances together); `online.send` / `online.onMove` as now |
| `'coop'` | online, same side, no turns | the lobby; `seat`; any player may send at any time; `onMove` delivers every move in one order everywhere; `myTurn()` is true whenever the room is full |

Rules: `multiplayer()` must be called once, in `setup()`; a bad mode or a count outside 2-4 is a
readable console error and falls back to `'none'`. Expose a small `game` object too (`game.mode`,
`game.players`, `game.ready`) so a sketch can show status without touching `online`. Do not teach or
require `online.host()` / `JOIN` for these modes: the lobby does it. A sketch that never calls
`multiplayer()` behaves exactly as today.

**Be honest about speed:** moves travel by polling (about once a second) with a rate limit (30 moves per
10 s per player). The docs say `'coop'`/`'versus'` suit turn-based and slower games; real-time action is
out of scope. While a room is ready, the parent may poll faster (e.g. 400 ms) but must stay inside the
server's limits.

### The lobby (parent page, React, NOT drawn in the canvas)

When the running sketch calls `multiplayer('versus' | 'coop', n)`, the iframe tells the parent
(postMessage, the same bridge as `online`), and `MoshionPreview` shows a lobby bar above the canvas:

- **Host** (creates a room for `n` players; shows the 6-letter code big, with a Copy button),
- **Join** (a real text box for a code),
- **Open rooms** in your classes for THIS game (host's first name + last initial, "2 of 3 here", Join),
  refreshed every few seconds while the bar shows,
- once in a room: "Room ABC123 · 2 of 3 here · you are player 2", and a Leave button.

The game key: `MoshionPreview` takes a new optional prop `gameKey` (string). Lesson pages pass the lesson
id, the sandbox passes `'sandbox'`, the Games library's play page passes `'game-<id>'`. Rooms are created
with that key, and the open-rooms list shows only rooms with the same key, so you never join a different
game. (Rooms' `game` column already exists; widen its validator to at most 48 characters of
`[a-z0-9-]`.) New route `GET /api/rooms?game=<key>`: open rooms (not closed, not expired, not full) whose
host shares a live class with the caller, with code, host label, seats, players present. Classmates only,
no emails.

Hidden for `'none'` and `'local'`. Signed out or in no class: the bar says so plainly ("Sign in and join a
class to play online").

### Tests and checks (Part A)
- `scripts/test-rooms.mjs`: the list route (classmates only, only this game key, no full/closed rooms, no
  emails), the widened game key.
- A headless check that `multiplayer()` validates mode and count and that `'local'` turn helpers work.
- Browser: two tabs of one dev student on the sandbox with a tiny `multiplayer('versus', 2)` sketch: host,
  join from the list (no typing), play; then `multiplayer('coop', 3)` with three tabs ("2 of 3 here" until
  full). Dev server: `DEV_ROLE=student`, cookie `dev_student=<name>`; one shared dev server on port 3019.

## Part B: the Games library (a second builder)

- Migration `0042_library_games.sql`: `library_games` (id 32-hex, owner_email, title, code TEXT (≤ 64 KB),
  mode, players, created_at, updated_at, deleted_at) and `library_game_shares` (game_id, class_id,
  shared_at, hidden_at, hidden_by), mirroring `library_items` / `library_shares` and their rules
  (`functions/_shared/libraryShare.ts`): owner-only edit and delete; shared into the publisher's live
  classes (enrolled, or taught for a teacher); teachers of a class can hide, unhide and remove; names as
  first name + last initial.
- Routes under `functions/api/games/`: publish/update (POST, owner), list mine, list shared to my classes,
  get one (owner or classmate), delete (owner), share toggle, and teacher moderation (reuse the class
  library moderation pattern).
- UI:
  - Sandbox (moSHion mode): a **Publish game** button (title field; re-publishing updates the same game).
  - Library: a **Games** section ("Yours" and "Shared with your class"), each with **Play**, and **Remix**
    (copies the code into the student's own sandbox draft).
  - A play page (`/play?game=<id>`, query-string routing because of the static export) that runs the game
    in `MoshionPreview` with `gameKey="game-<id>"`, the title and the publisher's name, and the lobby from
    Part A when the game calls `multiplayer()`.
  - Teacher moderation for games on the class page's Students tab, beside the art moderation.
- Safety: published code runs only in the existing sandboxed iframe (no `allow-same-origin`), exactly as
  any sketch does. Do not add any other way to execute it.
- Tests: `scripts/test-library-games.mjs` in `npm test` (publish, list, share into classes, classmates
  only, owner-only edit/delete, teacher hide/remove, size cap).

## Part C: docs and a short lesson (after A and B)
- `public/moshion/docs`: a "Multiplayer" page (the four modes, players 2-4, the lobby, publishing, the speed
  limit), and editor autocomplete for `multiplayer`, `game.*`, `myTurn`, `nextTurn` (scripts/generate-moshion-completions.mjs).
- One short lesson after Quest that turns an existing game into `multiplayer('versus', 2)` and publishes it.
- CLAUDE.md: replace the "Online game rooms" section's API paragraph with the setting and the Games library.

## Process (same as the board games)
Builders commit per part on cs-3d; three student-lens walks in a real browser; fixers split by file
ownership; full `npm test`; `npm run d1:migrate` for 0042 before deploy; deploy; push.
