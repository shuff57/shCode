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
