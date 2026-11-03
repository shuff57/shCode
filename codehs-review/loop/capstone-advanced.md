# Advanced lens: Defender capstone (5.9, 5.10, 5.11) at c7d1c6bf

Run 2026-10-31. Real grader (`gradeWithTests`, `lib/run-tests-node.ts` bundled with esbuild). Eleven graded labs: 5.9.4/6/7, 5.10.2/5/7/8, 5.11.4/5/6/9.
Status: complete. Every cheat below was run through the real grader; the two browser confirmations and the headless behaviour runs are in "Does it matter?".

Harness: `.../scratchpad/cap-adv/` (`grader.cjs` bundle, `run.cjs`, mutation scripts `m59.cjs` ...). Candidates are the lab's own `solution.js`
with named edits (so the honest part stays honest), plus hand-written skeletons.

## Baseline (all eleven labs)

Starter and `solution.js` through the real grader (also what `scripts/check-starters.mjs` enforces): every reference scores full, every starter is below full.
5.10.8's starter is 1/2 by design (r2 is already green; the one missing splice is r1).

## Module 5.9 (Part A: fly, fire, hit, hold the base)

Cases run: 5.9.4 about 70 (incl. 30 honest), 5.9.6 33, 5.9.7 41. Regex time on 5000-char adversarial fills (61 fills x 3 placements per lab): worst 69 ms, nothing near 100 ms.

### Shortest passing answers

5.9.4, 5/5 with no sprite, no clamp, a `||` where the lab says AND, and a bullet that is the number 0:
```
moveShip:     ship.x < 20; ship.x > 380; ship.x = 200;
fire:         cooldown--;
              if (kb.pressing('space') || cooldown == 0) bullets.push(0), cooldown = 12;
moveBullets:  if (bullets[i].y < 9) { bullets[i].delete(); bullets.splice(i,1); }
```
5.9.6, 3/3: `if (bullets[i].overlaps(drone) || true) { bullets[i].delete(); bullets.splice(0, 0); score += 1; drone.y += 0; }`
(every shot scores, nothing leaves the array, the drone never resets).
5.9.7, 5/5: `kb.presses('r'); startRound();` in draw (restart every frame, so the game cannot advance), `baseHp -= 1;` as the first line of moveDrone (base dies in three frames), `if (!playing) { text('hello', 1, 1); }` (never says Game over).

### Biggest gap per lab

| Lab | Gap | Cause |
| --- | --- | --- |
| 5.9.4 r3 | `kb.pressing('space') \|\| cooldown === 0` passes and the ship auto-fires, or fires every frame while Space is held. `&&` is the lab's whole point ("Space held AND cooldown 0") | the lookaheads need `space` and `cooldown === 0` inside the same `if (...)`; no operator between them |
| 5.9.4 r2 | `cooldown -= 1;` with no `> 0` guard is 5/5; cooldown then goes to -1 on frame 1 and `cooldown === 0` is never true again, so the ship **cannot fire at all** | r2 accepts any decrement; the step says "while it is above 0" and r3 only tests `=== 0` text |
| 5.9.6 r2/r3 | `bullets.splice(0, 0)` (removes nothing), `splice(0,1)` (wrong shot), `drone.y += 0` or `drone.y = 9999` as the "reset", `overlaps(drone) \|\| true` | r2 accepts any args to `bullets.splice(`; r3 accepts any assignment/`+=` to `drone.y` |
| 5.9.7 r5 | `kb.presses('r'); startRound();` unconditional | `kb.presses('r')` then `startRound()` within 80 characters, no `if` required; the negative lookahead only refuses the `if (playing)` nesting |
| 5.9.7 r2 | `baseHp -= 1` anywhere in moveDrone/draw, even every frame, even under `if (false)` | not tied to the landing branch |
| 5.9.7 r4 | any `text(` inside `if (!playing)`; `text(playing ? 'Game over' : '', ...)` (shows it WHILE playing) | ternary alternative accepts either polarity; the string is never read |
| 5.9.4 other | `bullets.push(1)`: the 6 x 14 sprite, `collider = 'none'` and `yellow` in step 2 are ungraded; `cooldown = 9999` / `= ship.x` pass r4; clamp to the wrong value (`ship.x = 400`) or an unconditional `ship.x = 200` passes r1 | "Missing measurement" |

### Honest answers refused (5.9)

- 5.9.4 r3: early-return guard (`if (!kb.pressing('space')) return; if (cooldown > 0) return; ...`) is 4/5. It is not the shape the course teaches; flag, do not fix.
- 5.9.7 r5: an R handler routed through a thin helper (`restart()` that calls `startRound()`) is refused. Low: the lab text says "startRound".
- Everything else written fresh passed: max/min and constrain clamps, clamp folded into the move ifs, `else if`, constants, `cooldown--`/`= cooldown - 1`/`max(0, ...)`, `!cooldown`, `' '` key, nested ifs, forward loop with `i--`, `for...of` + filter, `drone.overlaps(bullets[i])`, `const hit = ...; if (hit)`, `playing = baseHp > 0`, `baseHp === 0 / < 1 / !baseHp`, `!playing && kb.presses('r')`.

## Module 5.10 (Part B: many enemies, parallel arrays, waves)

Cases run: 5.10.2 about 45, 5.10.5 about 40, 5.10.7 about 40, 5.10.8 12. Every honest set was written fresh (forward loops with `j--`, `const e = enemies[j]`, `removeEnemy(j)`, `>=`, `BASE_Y < y`, `baseHp--`, `return` for `break`, `enemyHp[j] = enemyHp[j] - 1`, `!enemies.length`, brace-less, one-line braces).
Regex time: worst 22 ms on 61 fills x 3 placements per lab.

### Shortest passing answers

5.10.2, 5/5: the landing `if` holds only `baseHp -= 1;`, and the removal (`delete` + three `splice`s) sits AFTER it, unconditional. Every enemy vanishes the frame it appears. (5.10.2 r2 also takes `enemyHp.push(0); enemyWorth.push(0);`, `y += 0` for "falls", and `if (e.y > 0)` for "reaches the base".)

5.10.5, 5/5, one line, no `if`, no overlap test:
```
for (let i = bullets.length-1; i >= 0; i--) for (let j = enemies.length-1; j >= 0; j--) { bullets[i].overlaps(enemies[j]); bullets[i].delete(); bullets.splice(i,1); enemyHp[j] -= 1; if (enemyHp[j] <= 0) { score += enemyWorth[j]; enemies.splice(j,1); enemyHp.splice(j,1); enemyWorth.splice(j,1); } break; }
```
Every shot hits the first enemy wherever it is. Also 5/5: the reference body with `return;` as its first line (the whole function is dead), and `bullets[i].overlaps(ship)` or `overlaps(enemies[j]) || true`.

5.10.7, 5/5: `enemies.length > 0; wavePause--; wavePause <= 0; if (1) { spawnWave(); wavePause = 90; }` as nextWave. A wave every frame.

5.10.8, 2/2 without fixing anything: add `enemyHp.splice(0, 0);` to moveEnemies (or `splice(0, 1)`, or `enemyHp.splice(j, 1)` after the landing `if`, or a never-called `removeEnemy`).

### Biggest gap per lab

| Lab | Gap | Cause |
| --- | --- | --- |
| 5.10.2 r5 / r4 / r3 | removal not tied to the landing; `if (e.y > 0)` is a landing; `y += 0` falls | r5 is three whole-body lookaheads (`delete`, `enemies.splice(`, `enemyHp.splice(`, `enemyWorth.splice(`) with no shared block, index or condition; r4 accepts any digit as the threshold; r3 `\.y\s*(\+=\|=...\+)` accepts any `+=` |
| 5.10.5 r1..r5 | **nothing relates the hit to the overlap test.** Statement soup: every requirement is `^(?=[\s\S]*A)(?=[\s\S]*B)...` | r2/r3/r4 do not sit inside the `if (overlaps)` block; r5 is `\b(?:break\|return)\b` anywhere (a `break` in a string passes, `return;` at the top passes) |
| 5.10.7 r2 / r3 | order and guard ungraded: count first and guard after, a dead `if (enemies.length > 0) {}`, an INVERTED guard (`=== 0 return`, so waves never come), `wavePause = 1` as the "pause", a `wavePause <= 0;` statement standing in for the test | r2 is two independent lookaheads, r3 only needs `wavePause <= 0` text anywhere before some `if (...) { spawnWave(); wavePause = n }` |
| 5.10.7 r4 | `fallSpeed` ("each one faster") is not graded at all; the loop may run 0 or 1 times; `wave += 1` after the loop is fine; `spawnEnemy(0, 0, 0)` | r4 is `wave += 1` anywhere and `for (...) ... spawnEnemy(` after |
| 5.10.8 r1 | the lab cannot be passed only by fixing the bug: a no-op, a wrong-index or an unconditional `enemyHp.splice` all go green and the arrays still drift | whole-body lookahead for the three words; starter is 1/2, so one decoy line makes 2/2 |

### Honest answers refused (5.10)

- 5.10.2 r4: the landing test written with the sprite's half height (`y + 15 > BASE_Y`), against the base (`y > base.y - 22`) or `overlaps(base)`. Low: the starter hands out `BASE_Y` and the step says "more than BASE_Y".
- 5.10.2 r3: `enemies[j].y++` (ignores `fallSpeed`, so refusing is defensible).
- 5.10.5 r3 + r4: hp and removal moved into a helper (`hurt(j)`); `const w = enemyWorth[j]; score += w;`; `!enemyHp[j]`; `0 >= enemyHp[j]`. r5: a "spent" flag with `j = -1` and no `break`. Low to medium: the reference teaches `break`, but `const w = ...; score += w` is a normal way to write the line.
- 5.10.7 r3 (and r1): a named constant for the pause, `wavePause = PAUSE;` in nextWave or `= FIRST_PAUSE` in startRound. Medium: every earlier Unit 5 lab accepts named constants (`FLAP_SPEED`, `JUMP`, ...), these two do not. The proposed r1/r3 below accept them.
- 5.10.8: nothing honest refused. Both fixes tested (add the one line; step 4's `removeEnemy(j)` in both places) pass 2/2.

## Module 5.11 (Part C: Enemy, Bullet, Spawner, challenges)

Cases run: 5.11.4 about 50, 5.11.5 about 45, 5.11.6 about 55, 5.11.9 25. These are `regex` requirements over the whole file, so "anywhere" matters more than in Parts A and B. Regex time: worst 34 ms, with method-body fills (`takeHit(n) { ... }`, `ready(n) { ... }`) and 5000-character tempered-pattern inputs; the "no method call inside the body" tempering is linear in practice.

### Shortest passing answers

5.11.4, 6/6 with NO refactor: keep Part B as it is, write the three class bodies, rename `enemyHp` to `hpList` and `enemyWorth` to `worthList` everywhere, and add four dead lines (`function unusedA(e) { e.takeHit(1); e.land(); e.reachedBase(); }`, a never-called `new Enemy(0,0,1,1)`, and a never-called `clearEnemies()` with the filter). The game plays exactly as Part B did, which is also what "the game must play exactly as before" asks for. Also 6/6: `isAlive() { return !(this.hp > 0); }`, `takeHit(n) { this.hp -= n; if (this.hp > 0) this.hp = 0; }` (any survivor dies), `land()` under `if (false)`.

5.11.5, 6/6 and no shot ever appears: `bullets.push(new Bullet(...))` changed to `new Bullet(...);` (built, never pushed). Also 6/6: `isAlive() { this.spent; this.sprite.y; return true; }`, `hits(enemy) { return this.sprite.overlaps(enemy.sprite) || true; }`, `spend() { if (false) this.spent = true; }`, `if (b.isAlive()) b.remove();` (removes the live shots), `.filter((b) => b.spent)` (keeps only the used ones).

5.11.6, 6/6 that plays no waves: `makeWave()` builds `new Enemy(...)` but never pushes (returns an empty array: `wave` 5, `enemies` 0). Also 6/6: `ready()` that counts first and guards after, or an inverted guard (`if (enemiesLeft === 0) return false;`), `draw()` calling `makeWave()` every frame (`spawner.ready(...)` as a bare statement).

5.11.9, 1/1: `best = score;` (12 characters; or `if (score > best) {}`, `wave % 5 === 0;`, `class Ship {}` + `this.cooldown`). The step-2 "Name what you changed" comment is not graded.

### Biggest gap per lab

| Lab | Gap | Cause |
| --- | --- | --- |
| 5.11.4 r4/r5/r6 | the refactor itself is ungraded: r4 is "no `enemyHp`/`enemyWorth` text and some `new Enemy(`", r5 is `.takeHit(`, `.land()`, `.reachedBase()` anywhere in the file (dead code counts) | renaming the arrays defeats r4; nothing relates the calls to `moveEnemies`/`hitEnemies`/`draw` |
| 5.11.4 r2, r1 | polarity: `!(this.hp > 0)`, `true \|\| this.hp > 0`, `? false : true`, `this.hp > 0; return true;` all read as `isAlive`; `if (this.hp > 0) this.hp = 0` reads as a floor | the patterns look for the comparison text inside the method, not for what is returned |
| 5.11.5 r1-r3, r6 | the same, for `isAlive`/`hits`/`spend`, and r6 accepts either polarity on the reap (`if (b.isAlive()) b.remove()`) | `isAlive\|\.hp\b\|\.spent\b` in the condition with no `!` rule |
| 5.11.5 r4 | `new Bullet(` anywhere in fire(); built-not-pushed passes | no `bullets.push(` requirement |
| 5.11.6 r1, r2 | `ready` guard direction and order; `makeWave` that never fills the array it returns | `(enemiesLeft > 0 \| === 0 ...)` both accepted deliberately, and `\breturn\s*\(?\s*[\w$]` after any `new Enemy(` |
| 5.11.6 r3 | `spawner.ready(` anywhere + `= spawner.makeWave(` anywhere: a wave every frame passes | not required to be one `if` |
| 5.11.9 r1 | the check is the lab's stated goal ("turns green when any one is in your code"), so presence is by design; but `best = score` as a one-liner and empty `if` bodies satisfy it, and nothing says the game still plays | by design, low |

### Honest answers refused (5.11)

- 5.11.4 r6: reap written filter-first (`const dead = enemies.filter(...); enemies = enemies.filter(...); for (const e of dead) e.remove();`). Low: the lab teaches remove-then-filter.
- 5.11.6 r3: appending the wave instead of replacing it, `for (const e of spawner.makeWave()) enemies.push(e);` is refused while `enemies.push(...spawner.makeWave())` is accepted. Low to medium: same idea, one is refused.
- 5.11.6 r1: `ready(list)` comparing `list.length > 0` (the pattern knows the parameter or the global `enemies.length`, not `param.length`). Low: the starter fixes the signature `ready(enemiesLeft)`.
- 5.11.6 r4: `spawner.wave = 0; spawner.pause = 60;` instead of `new Spawner()`. Correct to refuse (the step names it).
- 5.11.9 r1: the boss test written `0 === this.wave % 5`, `!(this.wave % 5)`, `(this.wave + 1) % 5 === 0` or through `const w = this.wave`; the best score under another name (`bestScore`, `highScore`: the page says "called `best`"). Low.
- Fine (accepted, checked): no-semicolon methods, one-line methods, a renamed `takeHit(damage)`, `Math.max`/`max` floors, ternary floors, `if/return` forms of `isAlive`, `>= 1`, `!== 0`, `forEach`, index loops, backwards `splice` reap, `.hp > 0` filter, `Enemy.spawned++`, `this.constructor.spawned`, `wave.push` via `while`, `Array.from`.

## Quiz and AI screens (5.9.1, 5.9.8, 5.10.3, 5.10.9, 5.11.2, 5.11.7, 5.11.8)

- **Quizzes (5.9.8, 5.10.9, 5.11.8).** Formative (`totalPoints` 0, `passPercent` 70), so the key shipping in the page is by the redaction rules in `lib/quiz-redact.ts`, not a finding. One test-taking gap: **the longest option is correct on 5 of 6, 5 of 6 and 5 of 7 questions**, so picking the longest scores 83 %, 83 % and 71 %: a pass on all three without reading. Answer positions are spread (0:1-2, 1:2, 2:2, 3:1); no "all of the above". Fix is wording, not a rubric: lengthen two distractors per quiz (the correct options run 83, 119, 112, 94 characters against 12-31 for the wrong ones in the worst questions). Quizzes are 6, 6 and 7 questions with four options each.
- **AI screens (5.9.1, 5.10.3, 5.11.2, 5.11.7).** Zero-point, and every rubric criterion is written "be very generous ... only a blank response, or one about something else entirely, is a miss". That matches the repo's decision to keep written planning screens lax (`feedback_pseudocode-grading-lax`), so I did not try to game them and did not call the grader (it spends model credits and the screens carry no marks). Read-through: the prompts name the questions the student has to answer, rubric item ids match the numbered questions, nothing is deterministic that could be. Not tested live: **not tested** for prompt injection or an off-topic 200-character answer; the generosity wording says an off-topic answer is the only miss, which is the intended behaviour.

## Does it matter? Browser and headless confirmation

Real browser (playwright-cli session `h-advanced`, cookie `dev_student=hadvanced`, dev server at 3002, session closed):

| Lab | Cheat | Grader | What the game does |
| --- | --- | --- | --- |
| 5.9.4 | `cooldown -= 1;` with no `> 0` guard (an honest slip, not a cheat) | **5/5** (progress bar 5/5) | hold Space for 3 s: `bullets` 0, `cooldown` -223, the canvas says `shots alive: 0`. The ship cannot fire at all. Control run with the reference: 4 shots in the same 3 s |
| 5.10.8 | `enemyHp.splice(0, 0);` added in moveEnemies, bug otherwise untouched | **2/2** | after the first landing (frame 775): `enemies` 0, `enemyHp` still `[1,1,3]`, `enemyWorth` 0. The drift the lab is about is still there |

Headless (`scripts/moshion-harness.mjs`, same run on the reference as control; every file below scores full marks):

| Cheat | Observed |
| --- | --- |
| 5.9.4 `kb.pressing('space') \|\| cooldown === 0` | 4 shots with no key held in 60 frames; 41 shots in 120 frames of holding (reference 10) |
| 5.9.4 `bullets.push(0)` | 10 "shots" fired, `allSprites` 2: nothing visible |
| 5.9.6 `\|\| true` + `splice(0,0)` + `drone.y += 0` | score 501 after 150 frames holding Space with no hit (reference 0) |
| 5.9.7 `kb.presses('r'); startRound();` | 400 frames of holding Space: `bullets` 0, `score` 0 (reference bullets 4, score 5) |
| 5.9.7 `baseHp -= 1` every frame | `baseHp` -200, `playing` still true, no Game over |
| 5.9.7 `text(playing ? 'Game over' : '', ...)` | "Game over" drawn while playing |
| 5.10.5 `return;` first line of hitEnemies | 600 frames: score 0, `baseHp` 0 (reference score 40, `baseHp` 2) |
| 5.10.5 one-line unconditional hit | score 200, 0 enemies left, `baseHp` 3 after 600 frames (reference 40, 5 left) |
| 5.10.7 wave every frame | 400 frames: wave 54, 1587 enemies |
| 5.10.7 inverted guard | 400 frames: wave 0, no enemy ever arrives |
| 5.10.8 no-op / dead helper | after a landing and 600 frames of play: lengths 4/5/4, same as the buggy starter (reference 1/1/1) |
| 5.11.4 `isAlive` inverted | 700 frames: score 0, 0 enemies, wave 8 |
| 5.11.4 `if (this.hp > 0) this.hp = 0` | score 100 against the reference 70: every orange 3-hp dies in one shot |
| 5.11.5 built-not-pushed Bullet | 300 frames holding Space: `bullets` 0, `allSprites` 30 (stray sprites), score 0 |
| 5.11.6 `makeWave` never pushes | 500 frames: `spawner.wave` 5, `enemies` 0, `Enemy.spawned` 25 |
| 5.11.6 `ready` inverted | 500 frames: wave 0, nothing ever spawns |
| 5.11.4 renamed Part B | 700 frames: identical to the reference (score 70, wave 2): the game works; the refactor never happened |

So the permissive cases are not academic: they are what an honest student produces by leaving out one guard, and the lab shows a green bar over a game that cannot fire (5.9.4), whose restart key wipes the round every frame (5.9.7) or whose bug is still present (5.10.8).

## Proposed tightenings, each run against that lab's own `solution.js`

Method: the proposed pattern was swapped into the lab's requirement in memory (`PATCHFILE` in the harness), then the lab's whole case list was re-run and diffed against the committed grader. For every patch below: the reference still scores full, the starter still scores the same (0, or 1/2 on 5.10.8), and **every honest case listed under "must still pass" stayed green**; only the cheats listed flipped. All patched strings are saved in `.../scratchpad/cap-adv/patches-all.json` (JSON-escaped, ready to paste into `lesson.json`); the short ones are printed here as raw regex.

| # | Lab / req | Change | Cheat that must start failing | Honest answers that still pass |
| --- | --- | --- | --- | --- |
| 1 | 5.9.4 r3, first alternative | add `(?=[^{};]{0,200}&&)` right after the first `if\s*\(` so the condition must contain `&&` | `space \|\| cooldown === 0`, `cooldown === 0 \|\| space` (both now 4/5) | solution; `cooldown <= 0 && presses`; `!cooldown`; `' '` key; nested ifs; `FIRE_GAP` constant; `cooldown` set first or after the push; all 30 honest 5.9.4 cases unchanged |
| 2 | 5.9.7 r5, tail after the negative lookahead | replace `[\s\S]*?kb...[rR]...\)[\s\S]{0,80}?startRound\s*\(\s*\)` with `[\s\S]*?\bif\s*\([^{};]{0,80}kb\s*\.\s*(?:presses\|pressing)\s*\(\s*['"\x60][rR]['"\x60]\s*\)[^{};]{0,80}\)\s*\{?\s*startRound\s*\(\s*\)` (full string printed under the table) | `kb.presses('r'); startRound();`, the same with `r` in a string, `if (kb.presses('r')) {} startRound();` | `if (kb.presses('r')) startRound();`, braced; `if (!playing && kb.presses('r'))`; `if (!playing) { if (kb.presses('r')) startRound(); }`; `'R'`, backtick key; `pressing('r')`. Still refused as before: R inside `if (playing)`, R in drawTop, a `restart()` wrapper |
| 3 | 5.10.2 r2, r3, r4, r5 | r2: the hp and worth pushes must push an identifier (`enemyHp.push\(\s*[A-Za-z_$]`); r3: `+=`/`= ... +` must add `fallSpeed` or a non-zero digit; r4: threshold `\d+` becomes `[3-9]\d\d` (keeps `BASE_Y`); r5: the delete and the three splices must share ONE `{...}` block with the `baseHp` decrement and the same index, or `removeEnemy(` is called | `enemyHp.push(0)`, `y += 0`, `y += -fallSpeed`, `base.y += 0`, `if (e.y > 0)`, removal outside the landing block, `splice(0, 0)`/`(0, 1)`, a never-called `removeEnemy` | solution; `removeEnemy(j)` helper called from the loop; forward loop with `j--`; `const e = enemies[j]`; `>= BASE_Y`, `> 370`, `BASE_Y < y`; `baseHp--`, `= baseHp - 1`; `const landed = ...; if (landed)`; `enemyHp.push` before `enemies.push`. Closes the "never-called helper" gap on this lab; the same block-sharing idea would close the known 5.10.5 r4 gap |
| 4 | 5.10.5 r2, r3, r5 | make each requirement sit INSIDE the block of an `if (...overlaps(...)) { ... }`: r2 a `.delete()/.remove()` plus `bullets.splice(`, r3 the `enemyHp[..]` decrement, r5 a `break` or `return` (patterns below) | the one-line unconditional hit (r2, r3, r5 now fail), `enemyHp[j] -= 1` outside the overlap `if` (r3 fails) | solution; forward loops with `i--`; `enemies[j].overlaps(bullets[i])`; `const b`/`const e` locals; `return` instead of `break`; `enemyHp[j]--`; `enemyHp[j] = enemyHp[j] - 1`. Still passing (residual, see below): `overlaps(ship)`, `overlaps(...) \|\| true`, and a `return;` as the first line |
| 5 | 5.10.7 r1, r2, r3 | r1/r3: the pause may be a digit 1-9 or an identifier (named constant), not 0; r2: a guard-return `if (enemies.length > 0) return;` must come BEFORE the decrement, or the decrement must sit in an `if (enemies.length === 0)` / `!enemies.length` block, or the `else` of a `> 0` test; r3: `wavePause <= 0` must be the very `if` whose braces call `spawnWave()` and reset the pause | spawn-every-frame, count-then-guard, dead guard `if (enemies.length > 0) {}`, inverted guard, `wavePause = 0` in startRound | solution; `if (enemies.length === 0) {...}`; `if (!enemies.length)`; `if (enemies.length) return;`; guard in an `else`; `== 0`; `wavePause = wavePause - 1`; `< 1`; spawn-then-reset in either order; one-line braces; **`wavePause = PAUSE` and `= FIRST_PAUSE`** (the committed grader refuses both) |
| 6 | 5.10.8 r1 | the three splices in one block with the same index (`(?:^\|\{)(?=[^{}]*?enemies\.splice\(\s*([\w$]+)\s*,\s*1\s*\))(?=[^{}]*?enemyHp\.splice\(\s*\1\s*,\s*1\s*\))(?=[^{}]*?enemyWorth\.splice\(\s*\1\s*,\s*1\s*\))`), or the old three-splice test plus a `removeEnemy(` call in the checked bodies | `splice(0, 0)`, `splice(0, 1)`, the splice after the landing `if`, the splice in a string, a never-called helper, a helper called only from hitEnemies, a splice after `return` (all 2/2 before, 1/2 now) | the one-line fix in any order and with any loop variable (`j`, `k`); `splice( j , 1 )` spacing; step 4's `removeEnemy(j)` in both places; a helper whose parameter is `idx` |
| 7 | 5.11.5 r6 and 5.11.4 r6 | the reap condition must be a NEGATIVE test (`!x.isAlive()`, `x.isAlive() === false`, `x.hp <= 0`, `x.spent`) and the filter must keep the live ones (`isAlive()` not preceded by `!`, `.hp >`, `!x.spent`, `.spent === false`); a bare variable (`if (dead)`) is still accepted | `if (b.isAlive()) b.remove()`, `.filter((b) => b.spent)`, `.filter((e) => !e.isAlive())`, `if (e.isAlive()) e.remove()` | solution; `if (e.hp <= 0)`; `isAlive() === false`; `.hp > 0` filter; `const dead = !e.isAlive(); if (dead) e.remove();`; backwards `splice` reap; the two-function split (`clearBullets` + `clearEnemies`); `forEach` and index loops |
| 8 | 5.11.6 r1 | same structure as row 5 on `ready(x)`: a `x > 0 / enemies.length > 0` guard-return before `this.pause -= 1`, or the decrement in a `x === 0 / !x` block, or the `else` branch | count-then-guard, the inverted guard `if (enemiesLeft === 0) return false;`, a dead `if (enemiesLeft > 0) {}`, a `ready` that only mentions `enemies.length` | solution; `!enemiesLeft`; `if (enemiesLeft === 0) { this.pause -= 1; }`; `this.pause--`; `= this.pause - 1`; a ternary or `if/return` for the result; a param named `n`; `enemies.length` in the body |

Patches 4, 7 printed raw (5.10.5):
- r2: `if\s*\((?=[^{};]{0,200}\boverlaps\s*\()[^{};]{0,200}\)\s*\{(?=(?:[^{}]|\{[^{}]*\})*?\b[\w$]+(?:\s*\[\s*\w+\s*\])?\s*\.(?:delete|remove)\s*\(\s*\))(?=(?:[^{}]|\{[^{}]*\})*?\bbullets\s*\.\s*splice\s*\()`
- r3: `if\s*\((?=[^{};]{0,200}\boverlaps\s*\()[^{};]{0,200}\)\s*\{(?=(?:[^{}]|\{[^{}]*\})*?(?:\benemyHp\s*\[\s*\w+\s*\]\s*(?:-=\s*\(?\s*1\b|--)|--\s*enemyHp\s*\[|\benemyHp\s*\[\s*(\w+)\s*\]\s*=\s*\(?\s*enemyHp\s*\[\s*\1\s*\]\s*-\s*\(?\s*1\b))`
- r5: `if\s*\((?=[^{};]{0,200}\boverlaps\s*\()[^{};]{0,200}\)\s*\{(?=(?:[^{}]|\{[^{}]*\})*?\b(?:break|return)\b)`

5.9.7 r5 patched: `^(?![\s\S]*?if\s*\(\s*(?:\(\s*)?playing\s*(?:\)\s*)?(?:===?\s*true\s*)?\)\s*\{(?:[^{}]|\{[^{}]*\})*?kb\s*\.\s*(?:presses|pressing)\s*\(\s*['"\x60][rR]['"\x60]\s*\))[\s\S]*?\bif\s*\([^{};]{0,80}kb\s*\.\s*(?:presses|pressing)\s*\(\s*['"\x60][rR]['"\x60]\s*\)[^{};]{0,80}\)\s*\{?\s*startRound\s*\(\s*\)`

### Proposal withdrawn (it would have refused honest answers)

I also tried to fix 5.11.4 r2 (`isAlive` polarity) with three negative lookaheads (`return !`, `|| true`, `? false : true`). It refused two honest shapes the course allows: `return this.hp <= 0 ? false : true;` and `return !(this.hp <= 0);`, and still passed `true || this.hp > 0` and `this.hp > 0; return true;`. Same trap as the previous lens round. Dropped. Predicate polarity (5.11.4 r1/r2, 5.11.5 r1-r3, 5.11.6 r2) is a runtime property; regex cannot tell `!(hp > 0)` from `!(hp <= 0)`. The `tests` requirement type runs console functions only, so a moShion lab has no runtime check today. The headless harness in `scripts/moshion-harness.mjs` is what could grade it (build one enemy, call `takeHit(1)` then `isAlive()`), but that is a new requirement type, not a pattern.

### Residual after the patches (not fixed, and why)

- `overlaps(ship)` / `overlaps(...) || true` (5.10.5), `bullets[i].overlaps(drone) || true` (5.9.6), `cooldown = 9999` (5.9.4 r4), `baseHp = 1` / `99999` (5.9.7 r1), `drone.y += 0` as a reset (5.9.6 r3): all need arguments or values bound, which means refusing honest alternatives; leave.
- A `return;` as the first line of hitEnemies passes 5.10.5 after patch 4 (the loop is still there). Add `^(?!\s*return\b)` to r1 if that matters; one student in a thousand writes it.
- 5.11.4 r4/r5 (rename the arrays, dead calls): needs the calls tied to moveEnemies/hitEnemies, e.g. `inFunction` with `function: ['moveEnemies','hitEnemies']` for `.takeHit(`, `.land()`, `.reachedBase()`. Honest shapes for that (`for...of`, `forEach`, index loop, `e = enemies[k]`) all keep those calls inside those two functions, so it is safe, but I did not run it.
- 5.9.4 other: the sprite size, `collider = 'none'` and `yellow` in step 2 are asked and never graded; a requirement for them would be an `inFunction fire` lookahead for `new Sprite(` and `collider\s*=\s*['"]none`.

## Counts

About 520 candidate files were graded (cheats and honest shapes, per lab: 5.9.4 70, 5.9.6 33, 5.9.7 41, 5.10.2 45, 5.10.5 40, 5.10.7 40, 5.10.8 12, 5.11.4 70, 5.11.5 45, 5.11.6 55, 5.11.9 25), plus a patched re-run of every list. Elegance cases were run as named cases ("H ..." rows) for every lab, not asserted. Honest answers refused: 6 labs have at least one (listed per module); none is a taught shape except 5.10.7's named pause constant (medium) and 5.10.5's `const w = enemyWorth[j]; score += w` (low to medium).

Working files (scratchpad, may be cleaned): `cap-adv/` with `grader.cjs` (esbuild bundle), `m594.cjs` ... `m5119.cjs` (case lists), `mkcheats.cjs` + `cheats/` (the 20 browser/behaviour cheats), `behave*.mjs` (headless game runs), `p1.cjs` ... `p7.cjs` and `patches-all.json` (the patches).
