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

## Round 3 (2026-11-01)

Sources: `breakout-advanced-r3.md` (+ `breakout-advanced-r3-patterns.json`) and the owner-side lead's brief for this round (apply the ten fixes; one exception, an honest alias shape a fix newly refuses is widened back, since lax grading is policy; 6.10.8's `x`/`y` alias must pass; four shapes declared). Method as in rounds 1 and 2: `lib/grader.ts` bundled by esbuild (no change to `lib/`), each case a lab's reference or starter with one function body replaced, graded against `lesson.json` at HEAD (d284c5bf) and as edited. Case sets: round 1's 111 cases, round 2's 79 cases and 7 declared rows, the r3 lens's 901 named cases and 96 restyles, and the 166 new cases below. **166 new cases (161 labelled, 5 info rows), 0 mismatches; rounds 1 and 2: every score and every red set unchanged.**

### What changed

Only `pattern` strings, in 11 cards of five labs (6.10.4 r3; 6.10.5 r2, r3, r5, r6; 6.10.8 r1, r2; 6.10.9 r1, r2, r3; 6.10.10 r2). Card types, `function` lists, titles and descriptions are unchanged; no lesson text, starter or reference changed.

1. **Fixes 1 to 10, as the r3 lens tested them** (the patterns file applied as is, then the alias widening below on top of 6.10.4 r3 and 6.10.5 r2, r3, r6).
   - 1, 6.10.5 r2, r3, r6 and 6.10.9 r2: the comparison is bound to the ball. The operator and the limit sit next to `ball.x` / `ball.y` (`ball.x < R`, `R > ball.x`, `ball.x - R <= 0`, `ball.x > 400 - R`, `ball.x + R >= width`, `ball.y > 400 + R`, `400 + R < ball.y` ...), so `vx > 0` can no longer lend the right wall its `>`, and `ball.x > R`, `ball.x < 400 - R`, `ball.y > 0 && ...` are red.
   - 2, 6.10.9 r1: a `continue` must sit under a zero test and be followed by the count going up; `n += cell === 0 ...` is refused beside round 2's A; a `.filter` predicate must keep the bricks (`=== 1`, `> 0`, `!== 0`, bare, `Boolean`) and a row filter needs a receiver that is a row of `bricks`; each loop needs a bound that covers the wall (a `.length`, `BRICK_ROWS`, a name, 5 or more, `for...of`, `forEach`, a reverse `>= 0`).
   - 3, 6.10.5 r5: the `if` that holds the steer must name the paddle in its head (`paddle`, `overlaps`, an overlap alias), read over the head only, so the steer's own `paddle.x` cannot supply it; `vx += (ball.x - paddle.x) / 10` is accepted.
   - 4, 6.10.4 r3: the value the clamp compares must be `paddle.x` itself (optionally `- 40` / `+ 40`, either side), in the `if` and the ternary forms.
   - 5, 6.10.10 r2: the `if` that sets `state = 'play'` (or the guard that returns before it) must test a key: a `kb.presses|pressed|released|pressing(` call, a comparison with a one-character string or a digit, a variable bound to a `kb` call, or a flag set to `true`.
   - 6, 6.10.5 r6 and 6.10.9 r2: an x-only "serve" (`ball.x = 200`) no longer counts; `serve()`, `startGame()`, `ball.y =`, `ball.pos.y`, `ball.pos =` do.
   - 7, 6.10.9 r2 and r3: a ternary is read for its sense and its word (`lives === 0 ? 'lost'`, `lives > 0 ? ... : 'lost'`, `bricksLeft() === 0 ? 'won'`, `bricksLeft() > 0 ? ... : 'won'`).
   - 8, 6.10.8 r1, r2: `ball.x` / `ball.y` held in a variable count (`const x = ball.x; const y = ball.y; hitAt(x, y - R)`: 0/2 at HEAD, 2/2 now).
   - 9, 6.10.9 r2: the guard-return lost shape `if (lives > 0) { serve(); return; } state = 'lost';` is accepted; a bare call in the lost-ball guard must be a name from the card's list (`noop()`, `redraw()` are red).
   - 10, 6.10.4 r3: a half-width under any name (`const h = PADDLE_W / 2`, `w2`), and margins 30 to 99 / 300 to 369 (`50 / 350`, `60 / 340` full; `30 / 370`, `20 / 380` still red).
2. **The alias exception.** Fix 4 refused `const px = paddle.x; if (px < 40) paddle.x = 40; ...` (3/3 at HEAD); it is full again. The same widening is applied wherever a fix binds a comparison to a coordinate: 6.10.4 r3 (`paddle.x`), 6.10.5 r2 (`ball.x`, each wall on its own), r3 and r6 (`ball.y`). Each card gets one more alternative: `^(?=[\s\S]*?\b(?:const|let|var)\s+(?<name>…)\s*=\s*<coordinate>\s*[;,\n])` captures the first declaration whose value is the coordinate alone, then a copy of the card's comparison alternatives reads the alias in its place (on 6.10.4 either spelling, so `if (px < 40)` beside `if (paddle.x > 360)` passes). The character the head scan reads just before the alias may not be a word character or a dot, so `mouse.x` is never taken for an alias `x`. `const px = mouse.x`, `= PADDLE_W`, `const bx = ball.y` for a wall, and an alias declared but never compared all stay red. The 6.10.5 ball aliases were refused at HEAD as well (5/6, or 3/6 for `const x = ball.x; const y = ball.y;`); they are full now. 6.10.9 r2 already took `const y = ball.y` through round 1's alias alternative and is not changed beyond Fixes 1, 6, 7 and 9. 6.10.5 r5 is not widened: a position-test head written with `px` is red on r4 at HEAD too (r4 is unchanged), so no full answer is lost.

### Case table (new cases)

| Lab | Case | Expected | HEAD | Now | Verdict |
| --- | --- | --- | --- | --- | --- |
| 6.10.4 | cheat 4: heads about score | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat 4: heads 1 < 2 / 2 > 1 | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat 4: heads about lives | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat 4: heads test mouse.x (keys never clamped) | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat 4: ternary tests mouse.x | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | honest 4: reversed, 40 > paddle.x / 360 < paddle.x | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest 4: paddle.x - 40 < 0 / paddle.x + 40 > 400 | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest 4: (paddle.x), <= and >= | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest 4: else if, braces | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest 4: Math.max(Math.min()) | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest 4: nested ternary | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest 4: LEFT / RIGHT constants | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest 4: halfW and width - halfW | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest 4: paddle.pos.x and paddle.w / 2 | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest 10: const h = PADDLE_W / 2 | full | 2/3 (red r3) | 3/3 | OK |
| 6.10.4 | honest 10: const w2 = PADDLE_W / 2 | full | 2/3 (red r3) | 3/3 | OK |
| 6.10.4 | honest 10: margins 50 / 350 | full | 2/3 (red r3) | 3/3 | OK |
| 6.10.4 | honest 10: margins 60 / 340 | full | 2/3 (red r3) | 3/3 | OK |
| 6.10.4 | fail 10: 30 / 370 (paddle half off the screen) | below full | 2/3 (red r3) | 2/3 (red r3) | OK |
| 6.10.4 | fail 10: 20 / 380 | below full | 2/3 (red r3) | 2/3 (red r3) | OK |
| 6.10.4 | honest alias: const px = paddle.x, ifs 40 / 360 (Fix 4 cost, widened) | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest alias: let x = paddle.x, PADDLE_W / 2 | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest alias: px, braces, else if | full | 2/3 (red r3) | 3/3 | OK |
| 6.10.4 | honest alias: 40 > px / 360 < px | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest alias: px - 40 < 0 / px + 40 > 400 | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest alias: px with a half variable | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest alias: px with const h (Fix 10 and the alias together) | full | 2/3 (red r3) | 3/3 | OK |
| 6.10.4 | honest alias: x, nested ternary | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest alias: x, then one ternary on paddle.x | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest alias: px first if, paddle.x second | full | 3/3 | 3/3 | OK |
| 6.10.4 | honest alias: paddle.pos.x alias | full | 3/3 | 3/3 | OK |
| 6.10.4 | cheat alias: px is mouse.x | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat alias: px is PADDLE_W | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat alias: px declared, heads about score | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat alias: x declared, heads read mouse.x (not the alias) | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat alias: px declared, second head mouse.x | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.4 | cheat alias: assigns 0 / 400 | below full | 2/3 (red r3) | 2/3 (red r3) | OK |
| 6.10.4 | declared: wrong-direction clamp (pins the paddle left) | info | 3/3 | 3/3 | declared |
| 6.10.5 | cheat 1: one wall line, ball.x < R && vx > 0 | below full | 6/6 | 5/6 (red r2) | OK |
| 6.10.5 | cheat 1: right wall ball.x > R | below full | 6/6 | 5/6 (red r2) | OK |
| 6.10.5 | cheat 1: left wall ball.x < 400 - R | below full | 6/6 | 5/6 (red r2) | OK |
| 6.10.5 | cheat 1: left wall ball.x < width - R && vx < 0 | below full | 6/6 | 5/6 (red r2) | OK |
| 6.10.5 | cheat 1: the left line twice, second with vx > 0 | below full | 6/6 | 5/6 (red r2) | OK |
| 6.10.5 | cheat 1: top ball.y > 0 && vy < 5 | below full | 6/6 | 5/6 (red r3) | OK |
| 6.10.5 | cheat 1: serve when ball.y > 0 && ball.x < 400 | below full | 6/6 | 5/6 (red r6) | OK |
| 6.10.5 | cheat 1: serve when ball.y > 0 && score < 999 | below full | 6/6 | 5/6 (red r6) | OK |
| 6.10.5 | cheat 3: steer under if (vy) | below full | 6/6 | 5/6 (red r5) | OK |
| 6.10.5 | cheat 3: steer inside the top-wall if | below full | 6/6 | 5/6 (red r5) | OK |
| 6.10.5 | cheat 3: steer under if (true) | below full | 6/6 | 5/6 (red r5) | OK |
| 6.10.5 | cheat 3: steer under if (control === 'mouse') | below full | 6/6 | 5/6 (red r5) | OK |
| 6.10.5 | cheat 6: serve moves x only | below full | 6/6 | 5/6 (red r6) | OK |
| 6.10.5 | honest 1: walls ball.x - R < 0 / ball.x + R > 400 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls ball.x - R <= 0 / ball.x + R >= width | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls ball.d / 2 and width - ball.d / 2 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls R > ball.x / 400 - R < ball.x | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls ball.x < 6 / ball.x > 394 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls ball.x < R + 1 / ball.x > 399 - R | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls ball.pos.x | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls vx *= -1 / 0 - vx | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls -1 * vx / abs | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls ternary walls | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls one \|\| line | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: walls Allman | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: top ball.y < 0 + R | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: lost 400 + R < ball.y | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: lost ball.y - R > 400 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 1: lost ball.y > height | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: vx += (ball.x - paddle.x) / 10 (was 5/6) | full | 5/6 (red r5) | 6/6 | OK |
| 6.10.5 | honest 3: steer before the flip | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: offset variable inside the if | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: offset variable before the if | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: nested overlaps then vy > 0 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: hit alias | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: position-test head with paddle.x | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: constrain((ball.x - paddle.x) * 0.1, -4, 4) | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: map(ball.x - paddle.x, -40, 40, -4, 4) | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: / paddle.w * 8 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: else if after a wall if | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 3: paddle.overlaps(ball), extra parentheses | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 6: serve() | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest 6: inline reset as 6.10.3 | full | 6/6 | 6/6 | OK |
| 6.10.5 | honest alias: const bx = ball.x for both walls | full | 5/6 (red r2) | 6/6 | OK |
| 6.10.5 | honest alias: const x, y for walls, top and lost | full | 3/6 (red r2,r3,r6) | 6/6 | OK |
| 6.10.5 | honest alias: by for the top | full | 5/6 (red r3) | 6/6 | OK |
| 6.10.5 | honest alias: by for the lost ball | full | 5/6 (red r6) | 6/6 | OK |
| 6.10.5 | honest alias: bx, R > bx / width - R < bx | full | 5/6 (red r2) | 6/6 | OK |
| 6.10.5 | cheat alias: bx, one wall line | below full | 5/6 (red r2) | 5/6 (red r2) | OK |
| 6.10.5 | cheat alias: by, lost on by > 0 | below full | 5/6 (red r6) | 5/6 (red r6) | OK |
| 6.10.5 | cheat alias: by, top on by > R | below full | 5/6 (red r3) | 5/6 (red r3) | OK |
| 6.10.5 | cheat alias: bx is ball.y | below full | 5/6 (red r2) | 5/6 (red r2) | OK |
| 6.10.5 | cheat alias: x declared, walls test paddle.x | below full | 5/6 (red r2) | 5/6 (red r2) | OK |
| 6.10.5 | declared: the whole moveBall body moved into setup() | info | 6/6 | 6/6 | declared |
| 6.10.8 | honest 8: const x = ball.x; const y = ball.y; hitAt(x, y - R) (was 0/2) | full | 0/2 (red r1,r2) | 2/2 | OK |
| 6.10.8 | honest 8: let bx, by | full | 0/2 (red r1,r2) | 2/2 | OK |
| 6.10.8 | honest 8: x, y with braces and four ifs | full | 0/2 (red r1,r2) | 2/2 | OK |
| 6.10.8 | cheat 8: x, y, centre only | below full | 0/2 (red r1,r2) | 0/2 (red r1,r2) | OK |
| 6.10.8 | cheat 8: x, y declared, offsets on another name | below full | 0/2 (red r1,r2) | 0/2 (red r1,r2) | OK |
| 6.10.8 | cheat 8: x, y declared, flips not tied to a hit | below full | 0/2 (red r1,r2) | 0/2 (red r1,r2) | OK |
| 6.10.9 | cheat 2: continue on a gap, n never counted | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: continue on a brick, then n++ (counts gaps) | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: continue on !== 0, then n += 1 | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: continue on a truthy cell, then n++ | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: n += cell === 0 ? 1 : 0 | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: n += (cell === 0) | below full | 2/3 (red r1) | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: flat().filter(b => b === 0) | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: flat().filter(b => !b) | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: flat().filter(() => true) | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: row.filter(cell => cell === 0) in a loop | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: loops r < 1, c < 1 | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: c < 3 only | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: while (false) loops | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | cheat 2: loops then WALL.filter | below full | 3/3 | 2/3 (red r1) | OK |
| 6.10.9 | honest 2: reference | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: continue on a gap then n++ | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: continue braced, else | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: n += bricks[r][c] | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: n += cell === 1 ? 1 : 0 | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: flat().filter(b => b === 1) | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: flat().filter(b => b > 0) | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: flat().filter(b => b !== 0) | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: flat().filter(b => b) | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: flat().filter(Boolean) | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: bricks[r].filter in an index loop | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: row.filter(cell => cell) over for...of | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: row alias then filter | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: forEach of forEach | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: r < BRICK_ROWS, c < BRICK_COLS | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: r < 5, c < 8 | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: r !== bricks.length, c <= length - 1 | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 2: reverse loops r >= 0 | full | 3/3 | 3/3 | OK |
| 6.10.9 | cheat 1: lose a life when ball.y > 0 && score < 999 | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat 6: x-only serve in else | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat 7: state = lives > 0 ? 'play' : 'won' | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | cheat 7: state = bricksLeft() > 0 ? 'won' : 'play' | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.9 | cheat 7: state = bricksLeft() ? 'won' : 'play' | below full | 3/3 | 2/3 (red r3) | OK |
| 6.10.9 | cheat 9: guard calls noop() and the life is lost elsewhere | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.9 | honest 7: state = lives === 0 ? 'lost' : 'play' | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 7: state = lives > 0 ? 'play' : 'lost' | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 7: state = bricksLeft() === 0 ? 'won' : state | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 9: guard return, if (lives > 0) { serve(); return; } (was 2/3) | full | 2/3 (red r2) | 3/3 | OK |
| 6.10.9 | honest 6: inline reset in else, ball.pos.x | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 6: inline reset under lives > 0 | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest 1: height + R, braces | full | 3/3 | 3/3 | OK |
| 6.10.9 | honest alias: const y = ball.y | full | 3/3 | 3/3 | OK |
| 6.10.9 | declared: serve() outside the lost branch | info | 3/3 | 3/3 | declared |
| 6.10.9 | open: alias y, lost on y > 0 (the bool/value alias route is not bound) | info | 3/3 | 3/3 | open |
| 6.10.10 | cheat 5: if (true) state = 'play' | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat 5: if (1) state = 'play' | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat 5: if (control) state = 'play' | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat 5: if (kb) state = 'play' | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat 5: if (!false) state = 'play' | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat 5: if (score >= 0) state = 'play' | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat 5: if (state) state = 'play' | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | cheat 5: if (false) return; state = 'play' | below full | 3/3 | 2/3 (red r2) | OK |
| 6.10.10 | honest 5: reference | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest 5: else if | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest 5: combined \|\| then one state | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest 5: const k = kb.presses(...) then if (k) | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest 5: chosen flag | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest 5: picked === true | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest 5: guard return | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest 5: switch on a key variable | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest 5: start('mouse') helper | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest 5: kb.pressed, double quotes, no semicolons | full | 3/3 | 3/3 | OK |
| 6.10.10 | honest 5: kb.presses(1), extra parentheses | full | 3/3 | 3/3 | OK |
| 6.10.10 | declared: if (kb.presses('9')) state = 'play' | info | 3/3 | 3/3 | declared |

Of the 161 labelled rows: 99 honest (16 refused at HEAD, all full now; 83 full at HEAD and still full) and 62 cheats (50 full at HEAD, all red now; 12 already red and still red). References full and starters below full on every lab, unchanged: 6.10.4 3/3, 6.10.5 6/6, 6.10.6 5/5, 6.10.8 2/2, 6.10.9 3/3, 6.10.10 3/3, 6.10.13 2/2; every starter 0, and `check-starters` agrees.

### Replays

- **Round 1's 111 cases and round 2's 79 cases and 7 declared rows**: the same output, score and red set, at HEAD and now.
- **Advanced r3 lens, 901 named cases** (its own case files, replayed): 199 mismatches against the lens's labels at HEAD, 137 under the lens's patterns file, 136 now. The one difference from the lens patch is the `const px = paddle.x` clamp (refused under the lens patch, full now). No case mismatches now that did not at HEAD. By the lens's own accounting the rest are its declared leftovers, its section 3, the "not fixed" elegance rows, and seven cases it marked as mislabelled; the lens report says 142 for its patch where its case files replay to 137 here.
- **96 restyles** of the six graded references (`==`, `let`/`var`, no spaces, double quotes, backticks, Allman, CRLF, tabs, blank lines, brace-less to braced, `ball.pos.x`, `n++`/`lives--`, longhand, extra parentheses round every `if`, unchanged): all full; 6.10.13 under the same transforms: full.

### Declared, left lax on purpose (round 3, owner decision)

- **6.10.9 r2, `serve()` outside the lost branch**: `if (bricksLeft() === 0) { state = 'won'; serve(); }` with the lost branch only counting lives, or `serve();` as the last line of `checkEnd`, stays 3/3. The serve lookahead reads the whole listed-function body; tying it to the lost block needs a brace-depth model.
- **6.10.4 r3, the wrong-direction clamp**: `if (paddle.x > 40) paddle.x = 40; if (paddle.x > 360) paddle.x = 360;` stays 3/3. A direction rule breaks the `40 > paddle.x` pairs and the combined `||` shape; it is a wrong-value mistake like the declared `1 / 399`.
- **6.10.10 r2, `kb.presses('9')` as the state change**: `if (kb.presses('9')) state = 'play';` after key 1 and key 2 set only `control` stays 3/3 (the same shape as round 2's "key 2 without its own `state`").
- **6.10.5, the `moveBall` body inside `setup()`**: the whole body moved into `setup()` (or `serve()`) and `moveBall` left empty stays 6/6. The price of round 2's whole-file `regex` (Fix H).

Found while checking aliases, **not fixed, not declared (for the owner)**: 6.10.9 r2's round-1 alias alternative (`const lost = ...ball.y...; if (lost)`) is not bound to a lost-ball comparison, so `const y = ball.y; if (y > 0) { lives -= 1; ... }` and `const lost = ball.y > 0; if (lost) { ... }` stay 3/3, as at HEAD. It is Fix 1's sibling on the alias route. Binding it means requiring a lost-ball comparison in the declaration or on the alias in the head, and an offset alias such as `const by = ball.y + R; if (by > 400)` (3/3 at HEAD) would then need its own alternative.

**The advanced pattern loop for 6.10 ends here.** What remains (the four declared shapes above, round 1 and round 2's declared floor, the r3 lens's section 3) cannot be told from honest code by reading the text: it needs a `tests` requirement that runs the sketch through `scripts/moshion-harness.mjs` (for example `checkEnd` called with `ball.y = 500`, expecting the ball back on the screen; `moveBall` called once, expecting the ball to move). Whether to add one is a later decision.

### Speed

Whole `grade()` call on 5000-character adversarial bodies placed in every graded function of 6.10.4, .5, .8, .9 and .10: 2184 combinations, from the r3 lens's 29 triggers plus 23 alias triggers (`const px = paddle.x; if (px < `, `if (px `, `px < 40 ? 40 : px > 360 ? `, `const h = PADDLE_W / 2; const px = paddle.x; `, `const bx = ball.x; if (bx < R && `, `if (by > `, `const x = ball.x; const y = ball.y; `, `if (( x `, `let x = ball.x, ` ...), each with and without an alias declaration in front, and with no closer, `}}}}` or `))))`. The machine sat at load average 66 to 84 throughout, so wall times are inflated: the first pass (best of 3) read up to 246 ms on a 6.10.5 trigger that no changed card reacts to. Every combination over 30 ms on that pass (187) was measured again, best of 10: worst wall time 68.3 ms, worst CPU time (`process.cpuUsage`) 30.4 ms, both on 6.10.5 with `if (` repeated. Nothing over 100 ms. The slowest single changed card is 6.10.4 r3 on `const px = paddle.x;`, then `if (` x 1250, then `))))`, best of 15: 3.2 ms CPU at HEAD, 5.7 ms with the lens patch, 15.0 ms now (the alias copy reads every `if (` head a second time). No lookbehind in any 6.10 pattern. The alias alternatives start at `^`, so each one runs from a single start position, and every scan they add is bounded (`[^;{}]{0,200}?`) apart from the one lazy `[\s\S]*?` from `^`, as in rounds 1 and 2.

### Gates

Generators (module-docs, lessons-manifest, ai-graders, quiz-keys, solutions, lesson-starters; no tracked file changed), `check-lesson-numbers`, `check-lesson-groups`, `check-prompt-pointers`, `check-lesson-citations` (838 lessons; the 2 FORWARD notes are 1.4.9 and 6.4.4, as before), `check-hints` (382), `check-live-blocks` (491, all match), `check-starters` (every reference full, every starter not), `check-solution-leak`, `test-quiz`, `test-grader-tolerance` (334 cases), `audit-grader-tolerance --gate`, `tsc --noEmit`: all green. The full audit on 6-10 has the same single triage hit as rounds 1 and 2 (6.10.13 r2 refusing a `/* */` sentence, tagged maybe-intentional). The full `npm test` was not run.
