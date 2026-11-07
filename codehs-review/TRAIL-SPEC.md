# Trail: a race board game, as a chain of day-modules (6.22-6.26)

Build spec, written 2026-11-07. The course owner chose this game (issue report #71, "make a board
game like Candy Land"), its place (Unit 6, after Sling, no renumber), the shape (a full chain under
`DAY-MODULES.md`, checkers as a second chain after this one passes its student walks) and the
players (two on one computer AND online across computers, through the relay in `CLAUDE.md`'s
"Online game rooms" section).

**Trail is an original game.** It is a race along a snaking path with jump, slide and wait squares.
It does not use Candy Land's name, colours-as-cards mechanic, characters, art or board. Do not
name or describe any real board game in a lesson.

## The game

A track is ONE LINE OF TEXT, one letter per square (the 6.14 idea: a level is text, the picture is
drawn from data). `makePath()` turns it into `path`, a list of `{ x, y, kind }`, and rows snake:
even rows run left to right, odd rows right to left. Two players take turns: SPACE rolls
`floor(random(1, 7))`, the player moves that many squares (never past the end), and the square
they land on decides: `J` jumps ahead 3, `S` slides back 3, `W` waits a turn (a flag, cleared when
the turn is skipped), `F` is the finish. First to the last square wins; R starts again.

Online: H hosts a room and shows its code; to join, a student puts the code in `const JOIN` and
runs. The roller does NOT move their token: they `online.send({ roll: r })`, and `takeTurn(roll)`
runs inside `online.onMove`, on both computers, in the same order. That is the one idea of 6.25:
**one list of moves, applied in the same order everywhere, keeps two boards the same.** Only the
player whose `online.seat` equals `turn` may roll. One student can test alone with two browser
tabs (a seat is an account in a tab).

## Reference code: `codehs-review/trail-ref/`

Every file runs clean in `scripts/moshion-harness.mjs` and was played through to a win. Each lab
stage is a strict extension of the one before (diff them), so a student's own game carries
forward. Use these as the `solution.js` files exactly, or change them only to fix a real defect
(and then fix the later stages the same way).

| File | Is the solution of |
| --- | --- |
| `sb1-path.js` | 6.22.3 Sub-build: A path from a list |
| `a-path.js` | 6.22.4 Lab: Lay the trail |
| `sb2-die.js` | 6.23.2 Sub-build: One die, two turns |
| `b-turns.js` | 6.23.3 Lab: Take turns to the finish |
| `sb3-square.js` | 6.24.2 Sub-build: A square that does something |
| `c-special.js` | 6.24.3 Lab: Jump, slide and wait |
| `sb4-online.js` | 6.25.2 Sub-build: Send and receive one number |
| `d-online.js` | 6.25.3 Lab: Trail online |

## The chain

Folder ids follow the Sling pattern: `6-22-trail-1-plan-...`, `6-22-trail-2-reading-...`. Category
`"Unit 2: moSHion: Applied Game Development"`, `week: 17`, `slos: ["SLO-3"]` (plan/playtest as
Sling's do). Each module gets `curriculum/modules/6.2N_trail-....md` and
`curriculum/groups/6.2N.json`, copying the shape of the 6.16-6.21 Sling files.

| Module | Screens | Min |
| --- | --- | --- |
| **6.22 Trail: plan and the path** | 1 Plan: Break Trail into parts · 2 Reading: A path is a list of squares · 3 Sub-build: A path from a list · 4 Lab: Lay the trail | ~45 |
| **6.23 Trail: roll and take turns** | 1 Reading: A die, and whose turn it is · 2 Sub-build: One die, two turns · 3 Lab: Take turns to the finish | ~45 |
| **6.24 Trail: squares that do something** | 1 Reading: The square decides · 2 Sub-build: A square that does something · 3 Lab: Jump, slide and wait | ~40 |
| **6.25 Trail: play online** | 1 Reading: One list of moves, two computers · 2 Sub-build: Send and receive one number · 3 Lab: Trail online | ~45 |
| **6.26 Trail: playtest and extend** | 1 Playtest and reflect · 2 Check (5 multiple choice) · 3 Challenges: Make it yours | 35 (+25) |

### What each screen teaches (the one idea, and only it)

- **6.22.2** The track is text; `track[i]` is square i's letter. Row and column from an index:
  `r = floor(i / COLS)`, `c = i % COLS`, and on an odd row `c = COLS - 1 - c` so the path snakes.
  The centre of a square: `c * SIZE + SIZE / 2`. Cite 6.14 (a level as text, pixel and cell).
- **6.22.3** Sub-build: a hand-written list of six `{x, y}`, drawn with a loop, each square numbered.
  Starter: canvas + the list + a `// STEP` where the loop goes. Cards: a loop over `path`; a rect at
  `path[i].x`/`.y`; the number drawn.
- **6.22.4** Lab: starter is the board WITHOUT `makePath` filled in (a stub returning `[]` with
  `// STEP` comments), with `drawBoard`, the token and SPACE-to-step already there, so Run shows an
  empty board and the student's work makes it appear. Cards: loops over the track; an odd row is
  reversed (`COLS - 1 -`); pushes x, y and kind.
- **6.23.1** A die is `floor(random(1, 7))` (why 7). Players are a list of objects (`{name, color, at}`);
  `turn` is an index; passing the turn is `turn = (turn + 1) % players.length`. One function,
  `takeTurn(r)`, does a whole turn. `min(p.at + r, last)` keeps a token on the board.
- **6.23.2** Sub-build `sb2-die.js`. Cards: a roll from 1 to 6; the turn passes with `%`.
- **6.23.3** Lab: starter = 6.22.4's solution (carry). Cards: a roll from 1 to 6; a list of players;
  the turn passes with `%`; never past the last square (`min`); a winner when a player reaches it.
- **6.24.1** Read the square you landed on: `path[p.at].kind`, then an `if` per letter. A wait is
  a flag on the player, checked when the turn passes. Why the board is laid out so a jump or a
  slide always lands on a plain square (a slide onto a J would do nothing, and that reads as a bug).
- **6.24.2** Sub-build `sb3-square.js`. Cards: reads the letter at the token; J moves ahead; S moves back.
- **6.24.3** Lab: starter = 6.23.3's solution. Cards: J jumps 3 (`min`); S slides 3 (`max(..., 0)`);
  W sets a flag; the next turn skips a waiting player and clears the flag.
- **6.25.1** `online.host()`, `online.code`, `online.join(code)`, `online.send(move)`,
  `online.onMove((move, seat) => ...)`, `online.status`, `online.seat`. The rule: send, then apply in
  onMove. Your own move comes back too. Only your seat's turn may roll. Classmates only; a move is
  numbers, true/false and short words (a sentence is refused, on purpose: it is not a chat). Testing
  alone: open the sandbox or the lesson in a second tab. Online needs a signed-in student in a class.
- **6.25.2** Sub-build `sb4-online.js`. Cards: `online.onMove` with a function; `online.send`; host or
  join.
- **6.25.3** Lab: starter = 6.24.3's solution. Cards: rolls are sent, not applied (`online.send`);
  `takeTurn` runs in `onMove`; only your seat rolls (`online.seat` compared with `turn`). Offline play
  still works (`online.status === 'off'`).
- **6.26.1** Playtest and reflect, AI-graded, 0 points, lenient, like 6.21.1: play three times (once
  online if you can), one surprise, the line of code behind it, one change.
- **6.26.2** Check, five multiple-choice questions: snake row math, `% players.length`, why `min`,
  why apply in onMove, what W's flag does.
- **6.26.3** Challenges (one card any of them turns green, like 6.14.14 / 6.21.3): three players;
  a token that hops one square at a time instead of jumping; a new square letter of your own
  (e.g. `B` back to the start).

## Rules for every screen

- **Taught before asked** (memory: lesson voice). Nothing in a lab or card that an earlier screen of
  the course did not teach. moSHion calls in use: `new Canvas`, `background`, `fill`, `rect(x, y, w, h, r)`,
  `circle`, `text(str, x, y, size, color)`, `drawTop()`, `kb.presses`, `random`, `floor`, `min`, `max`,
  and `online.*` (new, taught in 6.25.1).
- **Words on screen go in `drawTop()`**, the 5.4 convention.
- Requirements are regex cards with `ignoreStrings`, written so ANY correct phrasing passes (memory:
  grading is lax); each lab also carries an `aiCheck` like Sling's. Every card's description ends
  with a "Help: 6.2N.M (title)" pointer to the screen that taught it.
- Targets must not equal a starter's value, so typing is exercised.
- The reference solution must score full on its own cards and the starter must not
  (`scripts/check-starters.mjs`).
- `npm test` green, including `check-lesson-numbers`, `check-lesson-groups`, `check-carry-chain`
  (derive the 6.23.3 / 6.24.3 / 6.25.3 `carryFrom` with `scripts/derive-carry-chain.mjs`),
  `check-prompt-pointers`, `check-concept-order`, `check-hints`, `check-live-blocks`.
