# cs-student-moderate lens, round 4 (final): module 6.9 Grids and tile maps

Method. Rounds 1-3 and grids-fix-cases.md read first. Grader work: `lib/grader.ts` `grade()` run directly
(`node --import ./scripts/register-ts.mjs`), ~115 shapes, each built by splicing ONE function body into the lesson's
`solution.js` (6.9.10, 6.9.11), so only the card under test can move. Baseline: every reference green and every starter red
(6.9.4, .6, .7, .8, .10, .11, .14). Scratch harness lives in the session scratchpad (`.../scratchpad/r4/`), no repo file edited.
Browser: session `g-moderate4` (closed), cookie `dev_student=gmoderate4`, lock ON, 6.9.1-6.9.9 completed through `/api/lesson-state`.

## Round 3 tightenings: did any honest, course-modelled shape go red?  NO.

Guard (6.9.10 r4, 6.9.11 r3), all GREEN:
- `if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;` (one line, braced, c-first, `grid.length`/`grid[0].length`/`grid[r].length`, row/col names)
- two or four separate early returns; `if (!(r >= 0 && ...)) return;`; `const inside = ...; if (inside)`; `const onGrid = ...; if (!onGrid) return`
- nested ifs (row-first and col-first); `0 <= r`; `r > -1`; `r <= ROWS - 1`; one-line if with no braces
- `grid[r] && grid[r][c] !== undefined`; `grid[r] !== undefined && c in range`; `grid[r]?.[c]` in 6.9.10
- pixel guard `if (y < TOP) return;` plus upper bounds (accepted, by design)
- 6.9.11: early return false then brick test (`=== 0`, `!== 1`, `> 0`, `!== 0`, truthy, `const cell = bricks[r][c]`), nested guard then brick if, hit flag
- Still RED, correctly: column-only guard in both labs; no guard.

Offset (6.9.10 r3, 6.9.11 r2), all GREEN: `floor((y - TOP) / CELL)` with `floor` or `Math.floor`, literals (`50`, `40`, `60`, `20`),
no spaces, double parens, `y -= TOP`, `y = y - TOP`, `const py = y - TOP`, other names for the temp (`adjustedY`), `gridY = gridY - TOP`
two statements, `floor(y / CELL - TOP / CELL)`, `floor(y / CELL) - TOP / CELL`, 6.9.11 `floor(y / BH) - 3`. RED, correctly: `y + TOP`, no TOP.

Flip (6.9.10 r5), all GREEN: `!grid[r][c]`, `? false : true`, `=== false`, `!== true`, `1 - grid[r][c]`, if/else both orders,
if/else on `=== true`, `=== false` / `=== true` chain, if-return-then-set, `const cell = ...; = !cell`, `const now = ...; = !now`,
`... ? true : false` of the negation. RED, correctly: `= true` only.

`while` in the cards (round 3 fix): `while` nested in makeGrid, drawGrid, countLit; `for` outer + `while` inner for draw and count; 6.9.11
`bricksLeft` nested `while`; all green. Also green: `for...of` nested counts, ternary `n += cond ? 1 : 0`, `n += bricks[r][c]`, `n = n + 1`,
`g.push([])` + `g[r].push(...)`, `new Array(COLS).fill(false)`. Red as intended: a count with no condition.

## Browser confirmation, 6.9.10 (lock ON)
Replaced script.js with a mix of honest spellings: `while` build, if/else fill in drawGrid, `Math.floor` with `col`/`row`, early `||` return guard,
ternary flip, nested-`while` countLit. Run: strip **6/6**, Submit enabled (it was disabled at 0/6). The `while` pair that stopped at 5/6 in round 3 is fixed in the real UI.

## Findings (all low; none blocks a student who writes what the course modelled)

1. 6.9.11 r4 refuses `bricks[r]?.[c] === 1` as the brick test (r4 "test the cell in the if"), while 6.9.10 r4 accepts `?.[`. Optional chaining is not
   modelled anywhere in 6.9 (nor is `Array.from`), so I count this as a spelling nobody was shown. Fix only if cheap: allow `\?\.\[` in r4's if-test alternation.
2. Not-modelled spellings still red, unchanged and consistent with rounds 2-3: flip through a temp then write back (`const on = !grid[r][c]; grid[r][c] = on`,
   `lit = !lit`) and a row alias (`row[c] = !row[c]`) in 6.9.10 r5; `const row = grid[r]; row[c]` inside drawGrid (r2 wants `grid[r][c]` itself);
   index-assignment builds (`g[r] = []; g[r][c] = false`, `b[r][c] = 1`) and `Array.from` in r1.
3. 6.9.10 r4 pixel-only guards red: `if (x < 0 || x >= 400 || y < TOP || y >= 440) return;` and `py = y - TOP; if (py < 0) return;` followed by `r < ROWS && c < COLS`
   (the `y < TOP` spelling is accepted, the `py < 0` one is not); a flipped `ROWS > r` and a literal `r > 7` (wants 8). Honest but rare, and the module's guard is always on r and c.

## Seams
6.9.9 -> 6.9.10 -> 6.9.11 -> 6.9.14 carries with one-word edits for build, draw, offset, guard, flip and count. No prose reference drifted; no new forward reference.

## Single biggest gap
Clean for anything the course modelled. The largest remaining miss is finding 2 (temp-variable flip and row alias), which nobody is shown in 6.9.
