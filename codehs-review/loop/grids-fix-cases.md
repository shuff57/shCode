# 6.9 fix round: grader case table

Run 2026-10-31 with `lib/grader.ts` bundled by esbuild against the edited `lesson.json` files. Each case is the lab's reference (`solution.js`) or starter with one function replaced. "Expected" is what the policy wants (LAX on honest shapes, strings and comments never satisfy a code card). 0 mismatches. Every starter scores 0 (6.9.14: 0 of 2), every reference scores full. Every regex was timed on 5000-character adversarial input (repeated trigger tokens, with and without braces): worst case 11 ms, no lookbehind.

Also green at the end: `node --import ./scripts/register-ts.mjs scripts/audit-grader-tolerance.mjs --gate` (0 hits), `scripts/check-starters.mjs`, `scripts/check-lesson-citations.mjs`.

Runtime check (moSHion node harness): 6.9.10 reference lights and unlights cells under the new top strip (`lit: 1 of 64` after the scripted clicks, a click in the strip does nothing), all edited starters and references run with no error, the 6.9.5 live block runs, and the new 6.9.5 Try 3 (canvas 440, delete `r < map.length &&`, mouse in the empty strip) really stops the sketch.

| Lab | Case | Expected | Got | Verdict |
| --- | --- | --- | --- | --- |
| 6.9.4 | honest: (TILE / 2) in parens | all green | all green | OK |
| 6.9.4 | honest: double quotes + legend const | record only | all green | OK |
| 6.9.4 | wrong: centre 0, 0 | red: r5 | red: r5 | OK |
| 6.9.4 | starter | red: r1,r2,r3,r4,r5 | red: r1,r2,r3,r4,r5 | OK |
| 6.9.6 | reference | all green | all green | OK |
| 6.9.6 | honest: c * TILE + (TILE / 2) | all green | all green | OK |
| 6.9.6 | honest: (c * TILE) + (TILE / 2) | all green | all green | OK |
| 6.9.6 | honest: TILE * c + TILE / 2 | all green | all green | OK |
| 6.9.6 | honest: cellToPixel helper (5.5.2) defined + called | all green | all green | OK |
| 6.9.6 | honest: half variable | all green | all green | OK |
| 6.9.6 | honest: (c + 0.5) * TILE | all green | all green | OK |
| 6.9.6 | wrong: forgot the half tile (c * TILE) | red: r3 | red: r3 | OK |
| 6.9.6 | cheat: whole reference body as a string | fail-r3-r4-r5 | red: r3,r4,r5 | OK |
| 6.9.6 | honest: tileAt Math.floor + one-line | all green | all green | OK |
| 6.9.6 | declined: x/y swapped (needs P off the diagonal; P is at 1,1) | still green (declined) | all green | OK |
| 6.9.6 | starter | red: r1,r2,r3,r4,r5 | red: r1,r2,r3,r4,r5 | OK |
| 6.9.7 | reference | all green | all green | OK |
| 6.9.7 | cheat: bare expression then won = true | red: r4 | red: r4 | OK |
| 6.9.7 | cheat: || instead of && | red: r3 | red: r3 | OK |
| 6.9.7 | cheat: strings | all red | red: r1,r2,r3,r4 | OK |
| 6.9.7 | honest: nested ifs | all green | all green | OK |
| 6.9.7 | honest: swapped order | all green | all green | OK |
| 6.9.7 | honest: !coins.length | all green | all green | OK |
| 6.9.7 | honest: flag variable | all green | all green | OK |
| 6.9.7 | honest: won = A && B (no if) | all green | all green | OK |
| 6.9.7 | honest: no braces | all green | all green | OK |
| 6.9.7 | honest: score = score + 1, function (p, coin) | record only | all green | OK |
| 6.9.7 | honest: score++ | all green | all green | OK |
| 6.9.7 | starter | red: r1,r2,r3,r4 | red: r1,r2,r3,r4 | OK |
| 6.9.8 | reference | all green | all green | OK |
| 6.9.8 | cheat: ungated levelNum += 1 | red: r4 | red: r4 | OK |
| 6.9.8 | cheat: strings in checkGoal | red: r4,r5 | red: r4,r5 | OK |
| 6.9.8 | cheat: strings in loadLevel | r1-r3-fail | red: r1,r2,r3,r4,r5 | OK |
| 6.9.8 | honest: levelNum++  | all green | all green | OK |
| 6.9.8 | honest: levelNum = levelNum + 1, >= | all green | all green | OK |
| 6.9.8 | honest: check before increment | all green | all green | OK |
| 6.9.8 | honest: swapped overlaps/coins order | all green | all green | OK |
| 6.9.8 | honest: guard return | all green | all green | OK |
| 6.9.8 | honest: no braces if/else | all green | all green | OK |
| 6.9.8 | honest: if (level) braces + level?.delete | all green | all green | OK |
| 6.9.8 | starter | red: r1,r2,r3,r4,r5 | red: r1,r2,r3,r4,r5 | OK |
| 6.9.10 | reference | all green | all green | OK |
| 6.9.10 | cheat: === 1 fill copied from 6.9.9 | red: r2 | red: r2 | OK |
| 6.9.10 | honest: == 1 fill (true == 1 works) | all green | all green | OK |
| 6.9.10 | honest: === true fill | all green | all green | OK |
| 6.9.10 | honest: if/else fill | all green | all green | OK |
| 6.9.10 | honest: for...of draw | all green | all green | OK |
| 6.9.10 | cheat: guard AFTER read (!== undefined) | red: r4 | red: r4 | OK |
| 6.9.10 | cheat: flip then unused ok const | red: r4 | red: r4 | OK |
| 6.9.10 | honest: early return | all green | all green | OK |
| 6.9.10 | honest: grid.length / grid[r].length | all green | all green | OK |
| 6.9.10 | honest: grid[r] === undefined return | all green | all green | OK |
| 6.9.10 | honest: !grid[r] return | all green | all green | OK |
| 6.9.10 | honest: grid[r] && grid[r][c] !== undefined | all green | all green | OK |
| 6.9.10 | honest: ?.[  | all green | all green | OK |
| 6.9.10 | honest: Math.floor, row/col names | all green | all green | OK |
| 6.9.10 | cheat: self-assignment flip | red: r5 | red: r5 | OK |
| 6.9.10 | honest: if/else flip | all green | all green | OK |
| 6.9.10 | honest: ternary flip | all green | all green | OK |
| 6.9.10 | honest: count n++ | all green | all green | OK |
| 6.9.10 | honest: count n = n + 1  | all green | all green | OK |
| 6.9.10 | honest: count nested for...of (3.3.20) | all green | all green | OK |
| 6.9.10 | honest: count alias const lit = grid[r][c] | all green | all green | OK |
| 6.9.10 | honest: count ternary | all green | all green | OK |
| 6.9.10 | cheat: empty if (count never goes up) | red: r6 | red: r6 | OK |
| 6.9.10 | cheat: n = 64 in loops | red: r6 | red: r6 | OK |
| 6.9.10 | cheat: all functions as strings | all red | red: r1,r2,r3,r4,r5,r6 | OK |
| 6.9.10 | honest: makeGrid .fill(false) | all green | all green | OK |
| 6.9.10 | starter | red: r1,r2,r3,r4,r5,r6 | red: r1,r2,r3,r4,r5,r6 | OK |
| 6.9.11 | reference | all green | all green | OK |
| 6.9.11 | honest: const localY = y - TOP; floor(localY / BH) | all green | all green | OK |
| 6.9.11 | honest: y = y - TOP; floor(y / BH) | all green | all green | OK |
| 6.9.11 | honest: y -= TOP | all green | all green | OK |
| 6.9.11 | honest: floor(y / BH - 3) | all green | all green | OK |
| 6.9.11 | honest: floor(y / BH) - 3 | all green | all green | OK |
| 6.9.11 | honest: Math.floor((y - 60) / 20) | all green | all green | OK |
| 6.9.11 | wrong: forgot TOP (floor(y / BH)) | red: r2 | red: r2 | OK |
| 6.9.11 | wrong: round instead of floor | red: r2 | red: r2 | OK |
| 6.9.11 | cheat: column-only bounds, row read first | red: r3 | red: r3 | OK |
| 6.9.11 | cheat: bounds after the read | red: r3 | red: r3 | OK |
| 6.9.11 | cheat: !== undefined read first | red: r3 | red: r3 | OK |
| 6.9.11 | honest: early return bounds | all green | all green | OK |
| 6.9.11 | honest: bricks.length form | all green | all green | OK |
| 6.9.11 | honest: bricks[r] === undefined return | all green | all green | OK |
| 6.9.11 | honest: -= 1, == 1 | all green | all green | OK |
| 6.9.11 | cheat: all functions as strings | all red | red: r1,r2,r3,r4,r5,r6 | OK |
| 6.9.11 | honest: count nested for...of | all green | all green | OK |
| 6.9.11 | honest: count alias | all green | all green | OK |
| 6.9.11 | honest: count sum | all green | all green | OK |
| 6.9.11 | honest: count == 1 n++ | all green | all green | OK |
| 6.9.11 | cheat: empty if (count never rises) | red: r6 | red: r6 | OK |
| 6.9.11 | honest: makeBricks .fill(1) rows | all green | all green | OK |
| 6.9.11 | starter | red: r1,r2,r3,r4,r5,r6 | red: r1,r2,r3,r4,r5,r6 | OK |
| 6.9.14 | reference | all green | all green | OK |
| 6.9.14 | challenge 1: (BRICK_ROWS - r) * 10 | all green | all green | OK |
| 6.9.14 | challenge 1: score = score + (BRICK_ROWS - r) * 10 | all green | all green | OK |
| 6.9.14 | challenge 1: points variable | all green | all green | OK |
| 6.9.14 | challenge 1: if/else per row | all green | all green | OK |
| 6.9.14 | challenge 2: -= 1 | all green | all green | OK |
| 6.9.14 | challenge 2: if (=== 2) = 1 else = 0 | all green | all green | OK |
| 6.9.14 | challenge 3: SHAPE[r][c] === "#" | all green | all green | OK |
| 6.9.14 | challenge 3: alias const ch = SHAPE[r][c] | all green | all green | OK |
| 6.9.14 | challenge 3: switch (SHAPE[r][c]) | all green | all green | OK |
| 6.9.14 | rule changed but no sentence (r2 red) | red: r2 | red: r2 | OK |
| 6.9.14 | cheat: score rule only in a string | red: r1 | red: r1 | OK |
| 6.9.14 | starter | red: r1,r2 | red: r1,r2 | OK |

## Declined or left open on purpose

- 6.9.4 and any lab: a never-called function or a dead variable holding the right text still passes (only `tests`-type requirements close that).
- 6.9.4 keeps strings in play (patterns need `'static'`, `'none'`, `'#'`), so a string statement can still satisfy it.
- 6.9.6: swapped x/y and a hard-coded start stay green because P sits at row 1, column 1 in 6.9.4 to 6.9.7. Only 6.9.8 level 3 was moved (P now at row 3, column 1), as asked. 6.9.6 r1/r2 still read the quoted `'P'`.
- 6.9.7: `coins[0].delete()` inside the overlap, and the result of `findStart` ignored, are left alone (needs a deliberate dummy).
- 6.9.8: `level.delete()` placed after `new Tiles(...)` is not ordered (the advanced report did not build it).
- 6.9.10/6.9.11: counting the wrong cell (`!grid[r][c]`) still passes; the starting screen (`lit: 64`) shows it.
- 6.9.11 r3: a zero test that is only on the column, with the row bounded above, passes; the row upper bound against `BRICK_ROWS`/`5` is required.
- 6.9.13 quiz: only q6 had a real tell (the one option in code formatting); it was rewritten with four code-formatted options. The mild content tells in q1, q3, q4, q5 are left. The answer key shipping to the browser is an author decision (formative quiz).
