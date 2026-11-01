# 6.10 Breakout fix round: grader case table

## Round 1 (2026-11-01)

Sources: `breakout-beginner.md`, `breakout-moderate.md`, `breakout-advanced.md` (+ `breakout-advanced-patterns.json`), `breakout-editors.md`. Method as in `grids-fix-cases.md`: `lib/grader.ts` bundled by esbuild (no change to `lib/`), each case is a lab's reference (`solution.js`) or starter with one function body replaced, graded against `lesson.json` at HEAD and as edited. "Expected" is the lax policy: honest taught shapes full, cheats below full, every reference full, every starter below full. **111 cases, 0 mismatches.**

### What changed

1. **Ball glued to a side wall (moderate G1, editors G1).** The wall test now flips only a ball moving into that wall, in two lines, `if (ball.x < R && vx < 0) vx = -vx;` and `if (ball.x > 400 - R && vx > 0) vx = -vx;`: the 6.10.2 snippet (plus one sentence beside the paddle's `vy > 0` reason), the 6.10.3 live block and its Try 3 wording, 6.10.5 step 2, its hints, its STEP comment and the r2 card text, and every starter and reference from 6.10.5 on (6.10.5 reference; 6.10.6, .8, .9, .10, .13 starters and references). 6.10.5 r2 accepts the guarded form (two lines, one line, nested `if (vx < 0)`, `abs()` per wall, ternary, either operand order) **and** the old unguarded form; the references no longer use it. The top wall is left unguarded: `vy` only ever changes sign, so it cannot stick (shown below: 0 stuck).
2. **Click the canvas first (beginner, editors G2).** One clause citing 5.1.13 at 6.10.4 s2, 6.10.9 s2 (Press R), 6.10.10 s2 (1 and 2) and s3 (R), 6.10.13 hint 1 and its content page.
3. **6.10.13.** r2 counts any four non-space words (digits included) in a `//` comment above the first line of code; only a comment opening with a lesson number (the title line, `6.10.13 ...`) is skipped; the keyword alternative is unchanged. Card text says exactly that. r1 also accepts a new serve speed (`vx` other than 3, `vy` other than -4). Challenge 3 (step and page) says `wallNum = 0` goes above `bricks = makeBricks();` and why.
4. **Smaller refusals and text.** 6.10.10 r1: one `text()` in the title branch is enough, `state !== 'play'` counts as the title test. 6.10.5 r6: anything before `serve()` / `ball.y =` / `ball.x =` in the block (6.10.3's inline reset), the reversed `400 + R < ball.y`. 6.10.6 r2: `push(0)` then `row[c] = 1` (and `push(1)` then `= 0`), `push(Number(...))`. 6.10.5 s1 "Press Stop, then Run"; 6.10.10 s1 gives an x that fits (about 30); 6.10.6 s3 hint drops "promised"; 6.10.2 leads with "the bricks are data" and drops the speed-loss claim.
5. **Advanced lens, card by card**, widened for the honest shapes the brief names: ternary flips and clamps, `forEach` counts (3.7.19), `n = n + bricks[r][c]`, aliases (mouse, keys, overlap, hit flags, `const lost`, `const left`), the `dx` key helper, key moves written `kb.pressing(...) ? paddle.x -= 6 : 0` or with `&&`, guard returns. Helpers are accepted by adding common helper names to the card's `function` list (6.10.4 r3 `keepOnScreen` ...; 6.10.5 r2/r3 `bounceWalls` ...; 6.10.9 r2 `loseBall`, `loseLife` ...; 6.10.10 r1 `drawTitle` ...), and 6.10.10 r2 takes a call such as `begin('mouse')` inside a key `if`. A helper under a name not on the list is still refused, as at HEAD. Closed: 6.10.9 bare `.filter(`, empty brick `if` then `n += 1`, the lost-ball wrapper deleted or emptied, `state = 'lost'` / `'won'` not inside the `lives` / `bricksLeft()` test; 6.10.8 a flip not inside an `if` (or ternary, alias, flag, `&&`) on a `hitAt`; 6.10.5 `= 0` flips, bare `overlaps` and `vy > 0` statements, `if (ball.y > 0) serve()` and `if (ball.y < 400) serve()`; 6.10.4 key reads and paddle updates not linked, a clamp limit that is not half the paddle; 6.10.10 key reads (or `prompt`) not tied to the `control` assignments, R not tied to `state = 'title'`.

### Case table

| Lab | Case | Expected | HEAD | Now | Verdict |
| --- | --- | --- | --- | --- | --- |
| 6.10.4 | reference | full | 3/3 | 3/3 | OK |
| 6.10.4 | starter | below full | 0/3 (red r1,r2,r3) | 0/3 (red r1,r2,r3) | OK |
| 6.10.4 | cheat: kb reads and updates unrelated | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.4 | cheat: empty key ifs then updates | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.4 | cheat: clamp limit 0 / 400 (half the paddle off) | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat: clamp limit 999 / 1 | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | honest: numbers 40 / 360 | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: constrain | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: Math.max / Math.min | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: named limits MIN_X / MAX_X | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: half = PADDLE_W / 2 | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: paddle.w / 2 and width | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: else if keys, paddle.x = paddle.x - 6 | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: key aliases | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: one statement, both keys | full | 2/3 (red r2) | 3/3 | OK |
| 6.10.4 | honest: switch (control) + constrain | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: WASD keys a / d | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: SPEED constant | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest: key move as ternary / && statements | full | 3/3 | 3/3 | OK |
| 6.10.4 | cheat: ternary key reads that never move the paddle | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.5 | reference (guarded two-line walls) | full | 6/6 | 6/6 | OK |
| 6.10.5 | starter | below full | 0/6 (red r1,r2,r3,r4,r5,r6) | 0/6 (red r1,r2,r3,r4,r5,r6) | OK |
| 6.10.5 | honest: guarded one-line (brief form) | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest: old unguarded one-line (taught before the fix) | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest: old unguarded two separate ifs | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest: guard first (vx < 0 && ball.x < R) | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest: guard nested if | full | 5/6 (red r2) | 6/6 | OK |
| 6.10.5 | honest: abs() per wall (left +abs, right -abs) | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest: guarded, braces on own lines (Allman) | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest: guarded, vx *= -1 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest: guarded, width and ball.d / 2 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest: guarded else-if | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest: guarded ternary | full | 5/6 (red r2) | 6/6 | OK |
| 6.10.5 | honest: guarded top too | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest: lost ball as 6.10.3 models it (ball.x first, inline) | full | 5/6 (red r6) | 6/6 | OK |
| 6.10.5 | honest: lost ball reversed, 400 + R < ball.y | full | 5/6 (red r6) | 6/6 | OK |
| 6.10.5 | honest: paddle via overlap alias | full | 6/6 | 6/6 | OK |
| 6.10.5 | cheat: walls set vx = 0 (ball sticks) | below full | 6/6 | 5/6 (red r2) | OK |
| 6.10.5 | cheat: top sets vy = 0 | below full | 6/6 | 5/6 (red r3) | OK |
| 6.10.5 | cheat: wall flip outside the if (empty if) | below full | 5/6 (red r2) | 5/6 (red r2) | OK |
| 6.10.5 | cheat: bare overlaps and vy > 0 statements | below full | 6/6 | 5/6 (red r4) | OK |
| 6.10.5 | cheat: overlaps in an if, vy > 0 as a statement | below full | 5/6 (red r5) | 4/6 (red r4,r5) | OK |
| 6.10.5 | cheat: if (ball.y > 0) serve() (serves every frame) | below full | 6/6 | 5/6 (red r6) | OK |
| 6.10.5 | cheat: if (ball.y < 400) serve() (wrong way) | below full | 5/6 (red r6) | 5/6 (red r6) | OK |
| 6.10.5 | cheat: whole reference body in a string | below full | 0/6 (red r1,r2,r3,r4,r5,r6) | 0/6 (red r1,r2,r3,r4,r5,r6) | OK |
| 6.10.6 | reference | full | 5/5 | 5/5 | OK |
| 6.10.6 | starter | below full | 0/5 (red r1,r2,r3,r4,r5) | 0/5 (red r1,r2,r3,r4,r5) | OK |
| 6.10.6 | honest: push 0 then overwrite with 1 | full | 4/5 (red r2) | 5/5 | OK |
| 6.10.6 | honest: push 1 then overwrite gaps with 0 | full | 4/5 (red r2) | 5/5 | OK |
| 6.10.6 | honest: hitBricks with score first in braces | full | 5/5 | 5/5 | OK |
| 6.10.6 | cheat: hitBricks flip not tied to the hit | below full | 4/5 (red r5) | 4/5 (red r5) | OK |
| 6.10.8 | reference | full | 2/2 | 2/2 | OK |
| 6.10.8 | starter | below full | 0/2 (red r1,r2) | 0/2 (red r1,r2) | OK |
| 6.10.8 | cheat: flips not tied to a hit | below full | 2/2 | 0/2 (red r1,r2) | OK |
| 6.10.8 | cheat: edge calls in empty ifs, flips after | below full | 2/2 | 0/2 (red r1,r2) | OK |
| 6.10.8 | honest: four separate ifs | full | 2/2 | 2/2 | OK |
| 6.10.8 | honest: flags set by the hits | full | 2/2 | 2/2 | OK |
| 6.10.8 | honest: let aliases of each pair | full | 2/2 | 2/2 | OK |
| 6.10.8 | honest: point aliases | full | 2/2 | 2/2 | OK |
| 6.10.8 | honest: vy *= ternary | full | 0/2 (red r1,r2) | 2/2 | OK |
| 6.10.8 | honest: braces, Allman | full | 2/2 | 2/2 | OK |
| 6.10.9 | reference | full | 3/3 | 3/3 | OK |
| 6.10.9 | starter | below full | 0/3 (red r1,r2,r3) | 0/3 (red r1,r2,r3) | OK |
| 6.10.9 | cheat: empty brick if, then n += 1 | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat: empty brick if, then n++ | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat: bare .filter( on bricks | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat: bare .filter( in a loop of rows that never reads a row | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | honest: n = n + bricks[r][c] | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest: n += bricks[r][c] | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest: forEach count (3.7.19) | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest: for...of | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest: row alias | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest: continue on a gap | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest: flat().filter() | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest: row filter in a loop | full | 3/3 | 3/3 | OK |
| 6.10.9 | cheat: lost-ball wrapper deleted | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat: empty lost-ball if, life code after | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat: lost on y > 0 | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat: state = lost unlinked | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat: win unlinked | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.9 | honest: lives--, braces, if/else blocks | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest: lives > 0 first | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest: guard return (win test first) | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest: const lost = ball.y > 400 + R | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest: const left = bricksLeft() | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest: helper loseLife() | full | 2/3 (red r2) | 3/3 | OK |
| 6.10.9 | honest: height instead of 400 | full | 3/3 | 3/3 | OK |
| 6.10.10 | reference | full | 3/3 | 3/3 | OK |
| 6.10.10 | starter | below full | 0/3 (red r1,r2,r3) | 0/3 (red r1,r2,r3) | OK |
| 6.10.10 | cheat: key read unrelated to the assignments | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat: empty key ifs | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat: prompt( unrelated | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat: R unrelated to state = title | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.10 | honest: prompt string compare | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest: else-if, state first, double quotes | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest: numeric kb.presses(1) | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest: one state = play after both | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest: R in startGame() | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest: title one text line | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.10 | honest: title under state !== play | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.10 | honest: title in a switch (6.6.11 shape) | full | 3/3 | 3/3 | OK |
| 6.10.13 | reference | full | 2/2 | 2/2 | OK |
| 6.10.13 | starter | below full | 0/2 (red r1,r2) | 0/2 (red r1,r2) | OK |
| 6.10.13 | honest: the lesson-modeled sentence after the title line | full | 1/2 (red r2) | 2/2 | OK |
| 6.10.13 | honest: sentence first line, title line deleted | full | 2/2 | 2/2 | OK |
| 6.10.13 | honest: "// 3 balls become 1 when you press 3" | full | 1/2 (red r2) | 2/2 | OK |
| 6.10.13 | honest: faster serve vx = 5, vy = -6 + sentence | full | 1/2 (red r1) | 2/2 | OK |
| 6.10.13 | honest: faster serve vx = 3.5 only | full | 1/2 (red r1) | 2/2 | OK |
| 6.10.13 | fail: challenge done, only the title line | below full | 1/2 (red r2) | 1/2 (red r2) | OK |
| 6.10.13 | fail: two-word comment | below full | 1/2 (red r2) | 1/2 (red r2) | OK |
| 6.10.13 | fail: sentence starting with a lesson number | below full | 1/2 (red r2) | 1/2 (red r2) | OK |

### Replays

- Advanced lens, 271 case files: 0 honest shapes newly refused; 35 earlier refusals now accepted; 22 cheats now caught; 9 still full, all declared below; 13 informational rows changed as intended (e.g. constrain(mouse.x, 0, 999) with no key clamp now red on r3).
- Beginner lens, 216 shapes: 0 newly refused; 19 now accepted (6.10.5 r6 by hand and reversed, 6.10.6 push 0 then overwrite, 6.10.10 one-line and `!== 'play'` titles and `kb.presses("Digit1")`, 6.10.13 serve speed and the digit sentences). The remaining reds are partial runs, `.map` (not in the ledger), a two-word comment, a comment placed below the code, and 6.10.13 rules the card does not name (ball colour, steer divisor, key speed).

### Declared, left lax on purpose

- Empty `if` bodies where the card only reads the head: 6.10.5 r4 (`if (ball.overlaps(paddle) && vy > 0) {}` then a flip below) and 6.10.6 r1 to r4 (loop and push fragments). Only a `tests` requirement could tell `{}` from a working body.
- 6.10.13: any of `kb.presses('3')` as a bare statement, `level++`, a rule in a dead function, `// if` as the sentence; a `/* */` sentence is red (the card says `//`).
- Blanked strings: 6.10.10 r1 cannot read the title words, 6.10.4 r2 cannot tell left from right (reversed arrows pass), 6.10.9 r2 cannot tell `'lost'` from `'play'`.
- 6.10.8: the centre test kept with the edge points as dead expressions; the swapped edge pairing (as before).
- 6.10.5 walls at 1 / 399 (any small number counts as the radius), and the structural class from 6.9 (dead code, decoy functions).
- 6.10.10 r1, starter plus one line (round 2, owner decision: accepted as the lax floor). `if (state === 'title') anyName();` added to the untouched starter turns r1 green (1/3 of the lab; r2 and r3 stay red), and the reference with an empty `function showTitle() {}` stays 3/3: the card reads a title test and a call, and a later `text(` in `drawTop()` (the `won` / `lost` lines) satisfies its lazy scan, so the title is never required to be drawn. No pattern-only fix leaves the honest helper shapes (`showMenu`, `drawStartScreen`) alone; only a `tests` requirement could, and none is added.
- 6.10.10 r3, unconditional `state = 'title'` (round 2, owner decision: accepted as the lax floor). `state = 'title';` written after the R branch in `draw()`, or `kb.presses('r'); state = 'title';` as bare statements, scores 3/3 while the game can never leave the title. The card joins `draw` and `startGame` into one body, so a pattern cannot tell this line from the honest "`startGame()` sets the title" shape; no fragile pattern is added for it.

### Physics (headless bot, `scripts/moshion-harness.mjs`)

A paddle that follows the ball with a random offset re-rolled every 90 frames (30% of the time up to 55 px, so the ball lands on the paddle's end), 30 seeds x 12,000 frames per sketch; a run counts as stuck when the ball stays within 8 px of a side wall for 25 frames in a row (a normal bounce spends 2 to 3).

| Sketch | HEAD stuck | Now stuck |
| --- | --- | --- |
| 6.10.3 live block | 4 / 30 | 0 / 30 |
| 6.10.5 reference | 10 / 30 | 0 / 30 |
| 6.10.6 reference | 8 / 30 | 0 / 30 |
| 6.10.8 reference | 9 / 30 | 0 / 30 |
| 6.10.9 reference | 10 / 30 | 0 / 30 |
| 6.10.10 reference | 9 / 30 | 0 / 30 |
| 6.10.13 reference | 11 / 30 | 0 / 30 |

Every HEAD case is the mechanism the lenses found (first entries such as `x 5.4 vx -3.46`, `x 398.7 vx -3.52`). No sketch error in 420 runs.

6.10.3 live block against its page: on Run `vx: 3   vy: -4` and `paddle bounces: 0`; in play it bounces off the left (14), right (11) and top (34) walls and the paddle (33, the counter agrees); a miss is served again after 174 frames. Try 2 (no steer line): `vx` only ever 3 or -3. Try 3 (as reworded: `ball.x < 0`, `ball.x > 400`): `ball.x` reaches -2.4 and 402.6. Try 4 (`/ 4`): `vx` from -8.6 to 9.1. `test-moshion.mjs --corpus --only=6-10`: 16 of 16 sketches run and draw.

### Speed

Each changed card was graded on 5000- and 1500-character adversarial bodies placed in every graded function of its lab (about 100 trigger shapes: repeated `if (ball.y > 400 `, `if (ball.x < R && vx < 0) {`, `kb.pressing(`, `const a = kb.pressing(`, `paddle.x = paddle.x < 40 ? `, `if (bricks[r][c] === 1) `, `bricks.forEach(row => row.forEach(c => `, `const h = hitAt(ball`, `if (state === 'title') { `, `case 'title': `, `if (a === '1') `, open parentheses, braces, `else`, each with and without a closing `)`), and 6.10.13 r2 on whole files of blank lines, `// a` lines, `//` runs and long comment lines. Median of five after a warm-up, timing the whole `grade()` call (comment and string cleaning included): worst 13.5 ms (6.10.5 r3 on `if (ball.y ` x 5000) at load average 22; two earlier runs at load average 35 to 50 gave 17.8 ms and 38 ms. The advanced proposal measured 236 ms on `if (ball.y > 400 ` x500; the same body now takes a few milliseconds. Every gap is bounded (`[^;{}]{0,200}` heads, `{0,300}` blocks, `{0,600}` alias reaches) except one lazy `[\s\S]*?` scan per lookahead from `^`; no lookbehind; no nested unbounded quantifier.

### Gates

Generators (module-docs, lessons-manifest, ai-graders, quiz-keys, solutions, lesson-starters; no tracked file changed), `check-lesson-numbers`, `check-lesson-groups`, `check-prompt-pointers`, `check-lesson-citations` (the 2 FORWARD notes are 1.4.9 and 6.4.4, as before), `check-hints`, `check-live-blocks` (491, all match), `check-starters` (every reference full, every starter not), `check-solution-leak`, `test-quiz`, `audit-grader-tolerance --gate`, `tsc --noEmit`: all green. The full (non-gate) audit on 6-10 has one triage hit, 6.10.13 r2 refusing a `/* */` sentence (tagged maybe-intentional; the card asks for `//`).

### Outside 6.10 (reported, not changed)

6.5.6 teaches that `getItem` gives back a string. moSHion's `storeItem` stores `JSON.stringify(val)` and `getItem` returns `JSON.parse(raw)` (`public/moshion/moshion.js` 3160 to 3173), so a stored number comes back a number: the page's own live block prints `without coercion: 6`, not the `"51"` its comment and prose promise (measured on the harness). The same claim runs through 6.5.5, 6.5.7, 6.5.10, 6.5.11, 6.5.13, 6.5.25 and 6.5.26, so it is a unit-level rewrite, not a cheap fix; `Number(getItem(...)) || 0` stays harmless, so student code still works.

## Round 2 (2026-11-01)

Sources: `breakout-advanced-r2.md` (+ `breakout-advanced-r2-patterns.json`), `breakout-moderate-r2.md`, `breakout-beginner-r2.md`, `breakout-editors-r2.md` (its one gap, M1), and the owner-side lead's decisions on advanced gaps 1 and 6. Method as in round 1: `lib/grader.ts` bundled by esbuild (no change to `lib/`), each case a lab's reference or starter with one function body replaced (or a helper added), graded against `lesson.json` at HEAD (59d61d25) and as edited. Three case sets: round 1's 111 cases, the advanced r2 lens's 502 cases, and the 79 new cases below. **79 new cases, 0 mismatches; round 1's 111 cases, every verdict unchanged.**

### What changed

1. **Patches A to H, as the advanced r2 lens tested them** (the patterns file applied as is; a lens-only replay of the 502 cases with the file and with the shipped result gives identical output).
   - A, 6.10.9 r1: the counter is whatever identifier `bricksLeft` returns, so `count`, `total`, `left`, `howMany` ... all count; a zero test (`=== 0`, `== 0`, `< 1`, `<= 0`, `!x`) directly followed by the increment is refused, so counting the gaps is red, and so are `return n + 1` and `return 0`.
   - B, 6.10.9 r2: `if (...) state = 'lost'` needs a zero test on `lives`; `else state = 'lost'` needs a positive `if (lives > 0 / >= 1 / !== 0)` in front of it. Losing on the first miss is red.
   - C, 6.10.5 r5: the steer line sits inside an `if` body and reads `ball.x` before `paddle.x` (or `-(paddle.x - ball.x)`); offset aliases are kept. A steer outside the `if`, after an empty `if`, or the wrong way round is red.
   - D, 6.10.10 r2: `state = 'play'` has to be under an `if`, a `case`, or after a guard `return`; a bare first or last line is red.
   - E, 6.10.4 r3: what the clamp assigns must carry a limit too, so `paddle.x = 400` / `= 0` / `= 1000` clamps are red.
   - F, 6.10.5 r2: the right wall also takes `400 - 6` (any `400 - 1..12`).
   - G, 6.10.6 r1: `forEach` counts as a loop and `WALL.forEach(` as a way to read the rows.
   - H, 6.10.4 r2, r3 and 6.10.5 r1 to r6: whole-file `regex` instead of `inFunction` over a list of names (the `function` lists are dropped), so a helper under any name is read. Labs 6.10.6, .8, .9, .10 are not switched (the lens showed it lets `makeBricks`'s loops satisfy `drawBricks`, and any `serve()` satisfy 6.10.9 r2).
2. **Four widenings on 6.10.9, on top of A and B** (each in the table below as W1 to W4):
   - W1, r1: the returned counter may be written `return count` with no semicolon (end of line or end of body) or `return (count);`. Without this A refused a missing semicolon on the return line; `return count + 1` stays red.
   - W2, r2 (moderate N1, the brief's 6.10.9 item): "served again" also takes the inline reset 6.10.3 models, `ball.x = ...` / `ball.y = ...` (or `ball.pos.x`) in place of `serve()`, as 6.10.5 r6 already does.
   - W3, r1: a cell loop `for (const cell of bricks[r])` inside the index loop, or `for (const cell of row)` over a `const row = bricks[r]` alias, then a test or a sum on the cell (`n += cell`). Refused at HEAD and under the lens patch.
   - W4, r1: the inner `forEach` callback written `function (cell) { ... }` as well as an arrow (it captured `function` as the cell's name). Refused at HEAD and under the lens patch.
3. **Card text.** 6.10.6 r1 "(two loops: for, while or forEach)"; 6.10.9 r1 "the counter it gives back (n, or any name) goes up".
4. **Lesson text.** 6.10.5 s2: the wall test is "the same idea as the paddle test you add next" (was "the paddle's `vy > 0` in step 3", not yet written). 6.10.13 Challenge 1, step and content page: the title line is given with its place, `text('Press 3 for one ball, with the mouse', 27, 290);` under the two `Press` lines in `drawTop()` (the reference's numbers). 6.10.2: one sentence before the paddle block says what its two lines do ("the first line flips `vy`; the second sets `vx` from where the ball landed on the paddle, which aims it"), pointing at "The paddle steers" below. 6.10.10 s1 (editors r2, M1): `Press 2 to play with the arrow keys` is "about 340 pixels wide" (was 300; the runner's 16 px monospace measures 336), and the step's conclusions stand (x 30 ends at 366 and fits, x 100 ends at 436 and is cut off).
5. **Declared floor (owner decision).** Advanced gaps 1 (6.10.10 r1, starter plus one line) and 6 (6.10.10 r3, unconditional `state = 'title'`) are accepted as the lax floor and added to the declared list above. No pattern was added for them.

### Case table (new cases)

| Lab | Case | Expected | HEAD | Now | Verdict |
| --- | --- | --- | --- | --- | --- |
| 6.10.9 | cheat A: count the gaps (=== 0) | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat A: count the gaps (== 0) | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat A: count the gaps (!cell) | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat A: count the gaps, renamed counter | below full | 2/3 (red r1) | 2/3 (red r1) | OK |
| 6.10.9 | cheat A: return n + 1 | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat A: return count + 1 (no semicolon) | below full | 2/3 (red r1) | 2/3 (red r1) | OK |
| 6.10.9 | cheat A: return 0 in place of the count | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat A: counts into k, returns n (always 0) | below full | 2/3 (red r1) | 2/3 (red r1) | OK |
| 6.10.9 | honest A: counter named count, count++ | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: counter named total, total++ | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: counter named left, left++ | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: counter named num, num++ | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: counter named sum, sum++ | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: counter named bricks_left, bricks_left++ | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: counter named c2, c2++ | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: counter named howMany, howMany++ | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: count += 1 | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: count = count + 1 | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: ++count | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: count = count + bricks[r][c] | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: total += bricks[r][c] | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: for...of, if (cell) total += 1 | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: forEach count, named count | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest W1: return count with no semicolon | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest W1: return n with no semicolon (starter name) | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest W1: return (count); | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest W1: one-line body, no semicolon before } | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: brick test != 0 | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest A: continue on a gap, renamed | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest W3: index rows, for (const cell of bricks[r]), n += cell | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest W3: for (const cell of bricks[r]), if (cell === 1) count++ | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | honest W3: row alias, for (const cell of row) | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | cheat W3: for (const cell of bricks[r]) counting gaps | below full | 2/3 (red r1) | 2/3 (red r1) | OK |
| 6.10.9 | cheat W3: for (const cell of bricks[r]), cell never read | below full | 2/3 (red r1) | 2/3 (red r1) | OK |
| 6.10.9 | honest W4: forEach(function (cell) { if (cell > 0) count = count + 1; }) | full | 2/3 (red r1) | 3/3 | OK |
| 6.10.9 | cheat W4: forEach(function (cell) ...) counting gaps | below full | 2/3 (red r1) | 2/3 (red r1) | OK |
| 6.10.9 | cheat B: lives > 0 -> lost (game ends on the first miss) | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat B: lives !== 0 -> lost | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat B: lives >= 1 -> lost | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat B: lives === 0 -> serve, else lost | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat: no serve and no reset (ball never comes back) | below full | 2/3 (red r2) | 2/3 (red r2) | OK |
| 6.10.9 | honest B: lives > 0 serve, else lost | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest B: lives <= 0 | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest B: !lives | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest B: lives < 1, braces | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest W2 (moderate N1): inline reset in else, as 6.10.3 | full | 2/3 (red r2) | 3/3 | OK |
| 6.10.9 | honest W2: inline reset under lives > 0, else lost | full | 2/3 (red r2) | 3/3 | OK |
| 6.10.9 | honest W2: inline reset written with ball.pos.x | full | 2/3 (red r2) | 3/3 | OK |
| 6.10.5 | cheat C: steer outside the paddle if (every frame) | below full | 6/6 | 5/6 (red r5) | OK |
| 6.10.5 | cheat C: wrong-way steer (paddle.x - ball.x) | below full | 6/6 | 5/6 (red r5) | OK |
| 6.10.5 | cheat C: steer after an empty if | below full | 6/6 | 5/6 (red r5) | OK |
| 6.10.5 | honest C: steer before the flip | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest C: offset variable inside the if | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest C: offset variable before the if | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest C: nested overlap / vy > 0 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest C: -(paddle.x - ball.x) / 10 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest C: one line with braces | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest C: * 0.1 and ball.pos.x | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest F: right wall written 400 - 6 | full | 5/6 (red r2) | 6/6 | OK |
| 6.10.5 | honest H: walls in wallsBounce() | full | 4/6 (red r2,r3) | 6/6 | OK |
| 6.10.5 | honest H: walls in bounceOffEdges() | full | 4/6 (red r2,r3) | 6/6 | OK |
| 6.10.5 | honest H: paddle in bouncePaddle() | full | 4/6 (red r4,r5) | 6/6 | OK |
| 6.10.5 | honest H: move in moveIt() | full | 5/6 (red r1) | 6/6 | OK |
| 6.10.5 | cheat H: walls in a helper with vx = 0 | below full | 4/6 (red r2,r3) | 5/6 (red r2) | OK |
| 6.10.4 | cheat E: clamp sends the paddle to the far side (400 / 0) | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat E: clamp assigns 1000 | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | honest E: 40 / 360 literals | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest E: 400 - 40 | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest E: ternary clamp | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest H: keys in moveWithKeys() | full | 2/3 (red r2) | 3/3 | OK |
| 6.10.4 | honest H: clamp in limitPaddle() | full | 2/3 (red r3) | 3/3 | OK |
| 6.10.6 | honest G: WALL.forEach + split forEach | full | 4/5 (red r1) | 5/5 | OK |
| 6.10.10 | cheat D: state = play unconditional, last line | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat D: state = play unconditional, first line | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | honest D: guard return, then state = play | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest D: combined \|\| if | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest D: if / else if / else | full | 3/3 | 3/3 | OK |
| 6.10.10 | declared: r1 green from the starter plus one line | info | 1/3 (red r2,r3) | 1/3 (red r2,r3) | declared |
| 6.10.10 | declared: r3 unconditional state = title after the R branch | info | 3/3 | 3/3 | declared |

References full and starters below full on every lab, as before: the round 1 rows (6.10.4 3/3, 6.10.5 6/6, 6.10.6 5/5, 6.10.8 2/2, 6.10.9 3/3, 6.10.10 3/3, 6.10.13 2/2; every starter 0) are unchanged, and `check-starters` agrees.

### Replays

- **Round 1's 111 cases**: every verdict unchanged. One score moved, on a cheat that was already red: "bare overlaps and vy > 0 statements" 5/6 (red r4) is now 4/6 (red r4, r5), Fix C. In round 1's declared rows, "empty paddle if, flip after it" went from 6/6 to 5/6 (r5 red, Fix C closes part of that leftover), and "helper with an unlisted name (moveWalls)" from 4/6 to 6/6 (Fix H).
- **Advanced r2 lens, 502 cases**: against the lens's own expectations, 125 mismatches at HEAD, 71 under the lens patch, 69 now (W3 and W4 accept `n += cell` over `bricks[r]` and the `function (cell)` forEach). No case mismatches now that did not at HEAD. The 69 left are the lens's "not fixed" rows: 39 cheats still full (6.10.6 fragments and decoys, 6.10.8 centre / pairing / combined flip, 6.10.5 `abs` sign and `vx = 1`, 1/399 and 12/388 walls, 6.10.4 `-= 0` and reversed arrows, 6.10.10 key 2 with no `state` of its own, the two declared 6.10.10 rows, structural dead code) and 30 honest refusals (helpers named off the list on 6.10.6 / .8 / .9 / .10, a radius named `RADIUS` or `r`, `hw2`, `clampToScreen(x)`, `isLost()`, `map` / `Array.from` with no loop, a single loop with `%`, an `x, y` alias on 6.10.6 r5, the ternary and `&&` titles, `restart()`, `if (vy < 0) {} else if (overlap)`, and the untaught `.reduce` and bare `key === '1'`; 6.10.13 rules the card does not name and a sentence trailing on a code line).

### Speed

Whole `grade()` call, best of 3, 5000-character adversarial bodies in every graded function and helper name, load average 15 to 24. Round 1's sweep (720 combinations): worst 15.2 ms (6.10.5 `draw` on `if (`). The lens's sweep plus 16 new triggers for C, W1 to W4 (`return count `, `return (`, `if (!bricks[r][c]) `, `ball.x = `, `if (lives > 0) { ball.x = 200; `, `if (x) { { } { } `, ...; 591 combinations): worst 12.4 ms. A targeted 6.10.9 sweep (30 triggers, including `for (const c of bricks[r]) `, `const row = bricks[r]; for (const c of row) `, `row.forEach(function (`, `if (` + 4996 identifier characters; 3 functions; 3 closers): worst 8.9 ms. Nothing over 50 ms. No lookbehind in any 6.10 pattern; the new alternatives are bounded (`[\s\S]{0,400}?`, `[^\]]{1,40}`).

### Gates

Generators (module-docs, lessons-manifest, ai-graders, quiz-keys, solutions, lesson-starters; no tracked file changed), `check-lesson-numbers`, `check-lesson-groups`, `check-prompt-pointers`, `check-lesson-citations` (838 lessons; the 2 FORWARD notes are 1.4.9 and 6.4.4, as before), `check-hints` (382), `check-live-blocks` (491, all match), `check-starters` (every reference full, every starter not), `check-solution-leak`, `test-quiz`, `test-grader-tolerance` (334 cases), `audit-grader-tolerance --gate`, `tsc --noEmit`: all green. The full audit on 6-10 has the same single triage hit as round 1 (6.10.13 r2 refusing a `/* */` sentence, tagged maybe-intentional).
