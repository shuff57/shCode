# Chapter 5 aiCheck: live sample (2026-11-02)

The 66 Chapter 5 labs that had no `aiCheck` got one (branch `codehs-inspiration`). This is a small
live check of those rubrics against the real model, plus a
free check of the regex requirements the builders flagged.

## How it was run

- Model: `@cf/google/gemma-4-26b-a4b-it` on Workers AI, the production transport. Calls went through
  `scripts/grade-harness.mjs --provider workers-ai --runs 1 --source file`, pointed at a throwaway local
  `wrangler dev` worker on 127.0.0.1:8799 that forwards `{model, inputs}` to `env.AI.run` with wrangler's
  existing login. The worker refused anything past 30 calls. It was stopped afterwards.
- Prompt and rubric: read from the regenerated `functions/_shared/ai-graders.generated.ts`, the same
  config the route reads.
- **29 model calls in total** (limit 30): 18 for six labs (reference, starter, one honest shape each),
  6 wrong-idea answers, 5 extra honest shapes. No call errored or was retried.
- One run per text, so a single verdict can be noise. The one false rejection was run twice and
  repeated.
- Answer files were kept in the session scratchpad, not in the repo. Each honest shape is described
  below so it can be rebuilt.

Reading the table: each cell is `criterion expected/actual`. Only `met` turns a Quest card green, so
`partial` counts as not met.

## Results

| Lab | Text | Per criterion (expected/actual) | Verdict |
| --- | --- | --- | --- |
| 5.1.11 | reference | r1 met/met; r2 met/met; r3 met/met; r4 met/met | as expected |
| 5.1.11 | starter | r1 not/missing; r2 not/missing; r3 not/missing; r4 not/missing | as expected |
| 5.1.11 | honest | r1 met/met; r2 met/met; r3 met/met; r4 met/met | as expected |
| 5.3.8 | reference | r1 met/met; r2 met/met; r3 met/met | as expected |
| 5.3.8 | starter | r1 not/missing; r2 not/missing; r3 not/missing | as expected |
| 5.3.8 | honest | r1 met/met; r2 met/met; r3 met/met | as expected |
| 5.4.8 | reference | r1 met/met; r2 met/met; r4 met/met; r5 met/met; r6 met/met; r3 met/met | as expected |
| 5.4.8 | starter | r1 not/missing; r2 not/missing; r4 not/missing; r5 not/missing; r6 not/missing; r3 not/missing | as expected |
| 5.4.8 | honest | r1 met/met; r2 met/met; r4 met/met; **r5 met/missing**; r6 met/met; r3 met/met | **false rejection** |
| 5.4.8 | honest (rerun) | r1 met/met; r2 met/met; r4 met/met; **r5 met/missing**; r6 met/met; r3 met/met | **false rejection** |
| 5.7.12 | reference | r1 met/met; r2 met/met; r3 met/met; r4 met/met | as expected |
| 5.7.12 | starter | r1 not/missing; r2 not/missing; r3 not/missing; r4 not/missing | as expected |
| 5.7.12 | honest | r1 met/met; r2 met/met; r3 met/met; r4 met/met | as expected |
| 5.7.12 | wrong: `let e1` inside setup | r1 met/met; r2 not/partial; r3 met/met; r4 met/met | as expected |
| 5.8.13 | reference | r1 met/met; r2 met/met | as expected |
| 5.8.13 | starter | r1 not/missing; r2 not/missing | as expected |
| 5.8.13 | honest | r1 met/met; r2 met/met | as expected |
| 5.8.13 | honest, no filter (loop builds the new list) | r1 met/met; r2 met/met | as expected (see note) |
| 5.11.4 | reference | r1 met/met; r2 met/met; r3 met/met; r4 met/met; r5 met/met; r6 met/met | as expected |
| 5.11.4 | starter | r1 not/missing; r2 not/missing; r3 not/missing; r4 not/missing; r5 not/missing; r6 not/missing | as expected |
| 5.11.4 | honest | r1 met/met; r2 met/met; r3 met/met; r4 met/met; r5 met/met; r6 met/met | as expected |
| 5.2.3 | honest: `round(random(1, 6))` | r1 met/met; r2 met/met; r3 met/met; r4 met/met; r5 met/met | as expected |
| 5.2.10 | honest: nested ifs instead of `&&` | r1 met/met; r2 met/met; r3 met/met; r4 met/met | as expected |
| 5.8.18 | honest: backward loop splices the dead | r1 met/met; r2 met/met; r3 met/met; r4 met/met | as expected |
| 5.5.8 | wrong: `return false` inside the loop | r1 not/missing; r2 met/met; r3 met/met | as expected |
| 5.7.19 | wrong: delete after the return | r1 met/met; r2 met/met; r3 not/missing; r4 met/met; r5 met/met | as expected |
| 5.5.4 | wrong: up/down set only `dy` | **r1 not/met**; r2 met/met; r3 met/met | **wrong-idea pass** |
| 5.4.11 | wrong: only change is a text colour from the score | r1 not/missing | as expected |
| 5.2.4 | wrong: the beat only ever sets `on = true` | r1 met/met; r2 not/missing; r3 met/met; r4 met/met; r5 met/met | as expected |

### What the honest shapes were

- **5.1.11**: the sprite is `hero`, not `player`; `new Sprite(width / 2, height / 2, SIZE, SIZE)` with
  `const SIZE = 40`; colour `'#ff8800'`; `background(20, 20, 40)`.
- **5.3.8**: `for (let i = 0; i < 3; i++)`, the memory is `bump.hitBefore`, set by an if/else to
  `true`/`false`, and `score = score + bump.worth`. The regex check rejects all three cards on this
  answer; the AI accepts all three.
- **5.4.8**: a `gameOver` flag that starts `false`; the crash calls `endRound()` (gravity 0, the pipes
  stopped with `forEach`); R calls `restart()`, which empties the pipes with `while (pipes.length > 0)
  pipes.pop()`; and `draw()` checks R, then **returns early** while `gameOver`, drawing `'GAME OVER'`
  in `draw()` rather than `drawTop()`.
- **5.7.12**: `e3`, then `e2`, then `e1`, at positions worked out from `width` and `height`.
- **5.8.13**: `const stillHere = enemies.filter(function (foe) { return foe.hp > 0; }); enemies = stillHere;`
- **5.11.4**: `Math.max(0, this.hp - n)`; `isAlive()` as `if (this.hp <= 0) return false; return true;`;
  `land()` as `this.takeHit(this.hp)`; `forEach` in `moveEnemies`; an index loop in `hitEnemies` with
  `foe.hp > 0 &&`; a separate `sweepEnemies()` that walks backwards, removing and splicing each
  finished enemy.

## Verdict quality

- **Honest shapes: 1 of 10 distinct honest shapes falsely rejected (11 calls with the rerun).** All
  six references and the other nine honest shapes were met on every card. The rejection is **5.4.8 r5**, and it repeated
  on a second run: the code builds pipes only after an early `return` while `gameOver`, which the
  rubric names as accepted ("after an early return while the round is over"), but the model said
  "the code for making new pipes (frameCount % 90) still runs even when gameOver is true" both times.
  A student who writes this shape cannot turn that card green with Check. Suggested fix for the next
  round: in the r5 description, put the early-return case first and spell it out ("an
  `if (gameOver) { ...; return; }` near the top of draw() counts: nothing below it runs after a
  crash"), then re-run this one text.
- **Starters: 6 of 6 failed every card.** No starter got a green card.
- **Wrong ideas: 1 pass in 6.** **5.5.4 r1** passed an answer where up and down set only `dy` and
  leave `dx` alone (the block would move diagonally); the model claimed "each key correctly sets both
  dx and dy". The other five (let inside setup, `return false` in the loop, delete after return,
  looks-only challenge, `on = true` only) were all caught, with notes that name the exact line.
- **5.8.13 note**: the rubric asks for `filter`, and the lab is "Reap the dead with filter", yet the
  model accepted a `for...of` loop that builds a new list of the living. That is lenient, not wrong
  about the program; the lead can decide whether the card should insist on `filter`.

## Flagged regex requirements, checked against the regex grader (no model calls)

Each probe is the lab's reference solution (or its starter, for the challenge labs) with one honest
change, run through `lib/grader.ts` `grade()`. "Strict" means a shape the aiCheck rubric accepts is
rejected by the regex; "loose" means a wrong shape the regex accepts. Every flag reproduced.

| Lab | Req | Kind | Probe | Regex |
| --- | --- | --- | --- | --- |
| 5.1.22 | r6 | strict | `mover.rotation += 2; mover.x += 1;` every frame, no `frameCount` | rejects |
| 5.1.24 | r4 | strict | challenge 1 with `kb.pressing('left')` changing the colour | rejects |
| 5.2.3 | r3 | strict | `round(random(1, 6))`, and separately `int(random(1, 7))` | rejects both |
| 5.2.4 | r2 | loose | the beat only ever sets `on = true` | accepts |
| 5.2.10 | r3 | strict | `if (kb.presses(' ')) if (player.colliding(ground)) {` | rejects |
| 5.2.12 | r1 | strict | walls made plain, then `.collider = 'static'` | rejects |
| 5.2.17 | r3 | strict | `goal.remove()` | rejects |
| 5.3.4 | r1 | loose | `world.gravity.y = -10` (the ball rises) | accepts |
| 5.3.8 | r1 | strict | `for (let i = 0; i < 3; i++)` | rejects |
| 5.3.8 | r2 | strict | if/else that sets `wasTouching` to `true` / `false` | rejects |
| 5.4.7 | r1 | strict and loose | `pipes.forEach` scoring placed above the delete loop: rejects. No scoring at all but a `bird.x` line within 300 characters after the delete loop: accepts. (`forEach` placed after the delete loop passes only because the delete loop's `for (...pipes...)` is close enough.) | both |
| 5.4.11 | r1 | loose | only change: `fill(score > 5 ? 'gold' : 'white')` | accepts |
| 5.5.6 | r2 | strict | `const tail = segments.pop(); tail.remove();` | rejects |
| 5.5.11 | r1 | strict | a best score named `highScore` (the only challenge done) | rejects |
| 5.6.10 | r2 | strict | `kb.pressing('space')` | rejects |
| 5.6.14 | r2 | strict | `new Sprite(120, 150, 80, 50, 'static')` | rejects |
| 5.7.13 | r1 | strict | five `new Enemy(...)` in an array literal | rejects |
| 5.7.14 | r1 | strict | `enemies.forEach((e) => e.render())` | rejects |
| 5.7.19 | r3 | loose | `return this.value;` before `this.sprite.delete();` | accepts |
| 5.8.13 | r1, r2 | strict | a loop that builds a new list of the living, no `filter` | rejects both |
| 5.8.18 | r4 | strict | backward loop that splices out the dead (the rubric says it counts) | rejects |
| 5.10.2 | r1 | strict | `new Sprite(x, y, 30, 30, 'none')` | rejects |

Where a strict probe was also sent to the model (5.2.3 round, 5.2.10 nested ifs, 5.3.8, 5.8.13 loop,
5.8.18 splice loop), the AI met the card. Where a loose probe was sent (5.2.4, 5.4.11, 5.7.19), the AI
refused it. On these labs the AI Check is the better grader of the two; the regex still decides the
cards when the AI is unreachable (the fallback), so these are worth fixing.
