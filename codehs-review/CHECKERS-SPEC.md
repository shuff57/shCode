# Checkers: the second board game, as a chain of day-modules (6.27-6.32)

Build spec, written 2026-11-07. The course owner chose this (issue report #71: "make a board game
like chess or candy land"; chess is too big for a chain, checkers is the second board game after
Trail), placed after Trail (6.22-6.26) with no renumber of anything built. Climb and the Unit 6
capstone, which `BUILD-YOUR-OWN.md` and `DAY-MODULES.md` pencilled in as 6.27/6.28 but which do not
exist, move after this chain. Players: two on one computer AND online, through the same relay and
the same `online` calls 6.25 taught.

**Follow `TRAIL-SPEC.md` for everything this file does not say** (file shapes, category, week,
voice, cards, carry-forward). Checkers is a public-domain game and may be called checkers.

## The game

The board is an 8x8 grid of letters (the 6.14 idea again, now one you change): `''` empty, `'r'`
red, `'b'` black, `'R'` and `'B'` kings. Pieces sit on the dark squares, `(r + c) % 2 === 1`; black
fills the top three rows, red the bottom three, red moves first and up the screen. Click one of your
pieces to pick it up (it lights), click a square to move. One function, `moveKind(fr, fc, tr, tc)`,
answers `'step'`, `'jump'` or `''`, and EVERY rule lives in it, so the same check guards a click,
a chained jump and a move that arrives online. After a jump, the same piece must jump again if it can
(`chain`); landing on the far row crowns a king, which moves both ways, and crowning ends the turn.
A player with no legal move (no pieces, or all blocked) loses. Forced capture is NOT a rule here
(it is a challenge).

Online: the host is red (seat 0). A click sends `{ fr, fc, tr, tc }`; `doMove` runs in `onMove`
only when `seat` is the turn's seat, there is no winner, and `isLegal(...)` agrees, so a broken or
out-of-turn move is ignored on both computers. H calls `newGame()` then `online.host()`.

## Reference code: `codehs-review/checkers-ref/`

Every file runs clean in `scripts/moshion-harness.mjs`; each lab stage is a strict extension of the
one before; the scaled-down board was clicked in a real browser (clicks land on the right squares).
`rules-check.mjs <file>` runs 12 rule checks (crown, king backward, crown ends a chain, win by
capture, win by block, five illegal moves, junk input) and passes on `d-kings.js` and `e-online.js`.

| File | Is the solution of |
| --- | --- |
| `sb1-pattern.js` | 6.27.3 Sub-build: A checkered board |
| `a-board.js` | 6.27.4 Lab: Set up the board |
| `sb2-pick.js` | 6.28.2 Sub-build: Pick up and put down |
| `b-move.js` | 6.28.3 Lab: Pick a piece and step |
| `sb3-jump.js` | 6.29.2 Sub-build: Jump and take |
| `c-jumps.js` | 6.29.3 Lab: Jumps, and jumping again |
| `sb4-crown.js` | 6.30.2 Sub-build: Crown a king |
| `d-kings.js` | 6.30.3 Lab: Kings and the win |
| `sb5-online.js` | 6.31.2 Sub-build: Send a click |
| `e-online.js` | 6.31.3 Lab: Checkers online |

## The chain

| Module | Screens |
| --- | --- |
| **6.27 Checkers: plan and the board** | 1 Plan: Break checkers into parts (assignment WITH an aiGrader, the 5-5-snake-1 shape) · 2 Reading: A board is a grid of letters · 3 Sub-build · 4 Lab |
| **6.28 Checkers: pick up and move** | 1 Reading: From a click to a square, and one rule function · 2 Sub-build · 3 Lab |
| **6.29 Checkers: jumps** | 1 Reading: Jumping over, and jumping again · 2 Sub-build · 3 Lab |
| **6.30 Checkers: kings and the win** | 1 Reading: Kings, and a player with no move · 2 Sub-build · 3 Lab |
| **6.31 Checkers: play online** | 1 Reading: The same rule check, on both computers (short: cite 6.25.1, teach only what is new) · 2 Sub-build · 3 Lab |
| **6.32 Checkers: playtest and extend** | 1 Playtest and reflect (aiGrader, 0 points) · 2 Check (5 multiple choice) · 3 Challenges: Make it yours (a moSHion lab carried from 6.31.3, one card any challenge turns green: forced capture, a move counter / draw after 40 moves without a capture, highlight every legal square for the picked piece) |

### What each screen teaches

- **6.27.2** The board is `grid[r][c]`, built with two loops (cite 6.14's grid of arrays); a dark square
  is `(r + c) % 2 === 1`; which rows get which letter. The picture is drawn from the grid.
- **6.27.4** Lab starter: `makeBoard` returns an all-`''` board (8 rows of 8) with `// STEP` comments,
  and the drawing is already there, so Run shows an empty board. Cards: a dark-square test with `% 2`;
  black placed on the top rows; red on the bottom rows.
- **6.28.1** A click to a cell: `floor(x / CELL)`, `floor((y - TOP) / CELL)` (cite 6.14.9 / 6.22).
  Picking up = remembering `{ r, c }` in `picked` (null when nothing is). A step is one row and one
  column away, `abs(dr) === 1 && abs(dc) === 1`, forward only (red's rows get smaller), onto `''`.
  Put every rule in ONE function that answers what the move is; the click only asks it.
- **6.28.3** Lab cards: click to row/column with `floor`; picking your own piece; a diagonal step
  (`abs`); forward only by colour; the turn passes.
- **6.29.1** A jump is two diagonal squares; the square jumped over is the halfway square
  `((fr + tr) / 2, (fc + tc) / 2)` and must hold the OTHER colour; it is emptied. `chain`: after a
  jump, if `canJumpFrom` the landing square, the same player goes again with that piece only.
- **6.29.3** Lab cards: two squares diagonally; the middle square is the other colour; the jumped
  piece is removed; a chain keeps the turn.
- **6.30.1** Crowning on the far row (`'r'` on row 0 becomes `'R'`); `toLowerCase()` so a king still
  belongs to its colour; a king may move backward; crowning ends the turn; a player with no move loses
  (`hasAnyMove` asks `moveKind` about every piece), which covers "no pieces left".
- **6.30.3** Lab cards: crowned on the far row; a king can move back; a check for no moves; a winner
  and R to play again.
- **6.31.1** Only what is new over 6.25.1: a move is four numbers; run `isLegal` in `onMove` too (the
  same rule function guards both computers, so a bad move is ignored everywhere); the host is red.
- **6.31.3** Lab cards: a click sends four numbers; `doMove` runs in `onMove`; it checks the seat and
  `isLegal`; offline still works.

## Lessons from the Trail walks (2026-11-07): build them in from the start

- Every `preview: "assignment"` screen needs an `aiGrader` (or Submit can never turn on and the chain
  behind it locks).
- A step must never name a function the student was not told to write, and must not leave code that
  crashes after it is followed literally (walk your own steps in order).
- No backticks in requirement titles or descriptions (they render raw).
- A card that tests a letter in quotes uses `ignoreStrings: true` plus `keepShortStrings: true`
  (lib/grader.ts), and wants the letter in a comparison (`=== 'r'`, `case 'r'`).
- Online status words must fit the 480 px canvas; `online.status === 'off'` shows "Press H to host",
  never `null`.
- In the quiz, the right option must not be the longest.
- Cards are lax (any correct phrasing; see `scripts/test-grader-tolerance.mjs`'s Trail block, and add
  a Checkers block the same way, pinned with real alternatives: other names, `Math.abs`, a ternary,
  `!==` forms, nested ifs, a `switch`).
