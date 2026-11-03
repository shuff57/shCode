# Chapter 5 labs (5.1, 5.6-5.8, 5.9-5.11), strong-student lens (cs-student-advanced)

Date 2026-11-01, branch `codehs-inspiration`, HEAD 57e7af4b. No lesson file touched. Out of scope and not re-run: 5.2-5.5 (`advanced-final.md`).
Grading is `lib/grader.ts` bundled with esbuild (`gradeWithTests` from `lib/run-tests-node.ts`), each lab's own `lesson.json` requirements, no mocks.
The harness (`h.cjs`, `run.cjs`, `c1..c10.cjs`, `mk.cjs`, `mut.cjs`, `timing.cjs`) lives in the session scratchpad, not the repo.
Tested fixes: `codehs-review/loop/ch5-advanced-patterns.json` (keyed lesson directory, then requirement id; a value is `{ignoreStrings:true}`, `{pattern}`, or both).

**Verdict: GAP LIST (not clean).** 44 graded lessons, 118 requirements checked in this pass (5.1: 6 lessons, 5.6: 5, 5.7: 11, 5.8: 9, 5.9: 3, 5.10: 4, 5.11: 5, plus 5.7.7 and 5.8.19 README cards).
Baseline held: all 44 references score full, 42 of 44 starters score 0 (the two exceptions are by design, section 4).
5.9-5.11 are well hardened (loop-aware, helper-aware, empty-if and break/return aware); what gets through there is the string hole (1.1), one untied removal (5.10.5 r2) and one untied sound (5.11.9 r3).
The 5.7/5.8 class labs and the 5.1/5.6 openers are where both directions break: statements are not tied to their own method, and several honest shapes are refused that a neighbouring lab accepts.

Run: **515 named cases** (cheats and honest shapes, each with a recorded result) + 264 "reference wrapped in a string / comment / empty" runs + **378 mechanical restyles** of the references (CRLF, Allman braces, `var`, no semicolons, double quotes, tabs, spaced parens, block comments; compared HEAD vs patched, 0 regressions, 0 gains) + 2,386 timing calls.
With the patch file, the 515 cases move from 99 gaming passes / 82 refusals to 61 / 50; **no case got worse in either direction**, references stay full, starters stay at HEAD's score. What remains is in sections 1.4 and 3.

---

## 1. GAMEABLE (cheapest first)

### 1.1 One appended line of text scores full on most labs (string literal read as code)
Every requirement without `ignoreStrings` reads text inside a string. Appending ONE line to the **untouched starter** (the lab not done at all):

| Lab | Line appended | HEAD | patched |
| --- | --- | --- | --- |
| 5.7.3 tick() | `let t = "tick() { this.n += 1; }";` | 1/1 | 0/1 |
| 5.7.10 pop() | `let t = "pop() { this.sprite.delete() }";` | 1/1 | 0/1 |
| 5.8.9 isAlive | `let t = "isAlive() { return this.hp > 0 } function draw(){ e.isAlive() }";` | 2/2 | 0/2 |
| 5.8.12 hit(other) | `let t = "hit(o) { o.takeHit(this.power) }";` | 2/2 | 0/2 |
| 5.8.13 reap | `let t = "enemies = enemies.filter(e => e.isAlive())";` | 2/2 | 0/2 |
| 5.8.16 spawns | `let t = "static spawned = 0; constructor() { Enemy.spawned += 1; }";` | 2/2 | 0/2 |
| 5.6.9 (inside draw) | `let q = 'console.log(b.color) console.log(b.size)';` | 1/1 | 0/1 |

Scale: the reference solution wrapped in a template literal (or `JSON.stringify`) scores full on **37 of 42** script labs, and 126 of 135 requirements pass on it.
Cause: `ignoreStrings` is opt-in (`lib/js-source-clean.ts`), and only the 5.10.5/5.10.7/5.10.8/5.11.6/5.11.9 cards use it.
**Fix:** `ignoreStrings: true` on **118 requirements** (the whole list is in the JSON: 87 are flag-only entries, the other 31 also carry a replacement pattern from 1.2 / 1.3 / 3.1). The reference still passes each one and the wrapped reference now fails each one.
Checked: 0 honest case newly refused (515-case replay), 0 regressions over the 378 restyles.
**Not flaggable (9 requirements read string content, no flag-only fix):** 5.1.7 r3 (`(?!tomato['"])` reads the blanked text and would let the starter pass, 1/3, verified), 5.1.20 r3/r4 and 5.1.22 r3/r4 (key names), 5.9.4 r3 (`'space'`), 5.9.7 r5 (`'r'`), 5.10.2 r1 (`'none'`), 5.11.9 r1 (the sound path). These keep the hole for a one-line string. The 6.11 round-2 line-start prefix fix closes a one-line string but not a multi-line template literal, so it is not shipped here.

### 1.2 The 5.7/5.8 method cards are not tied to their method (`name[\s\S]*?statement`)
An empty target method plus the required statement in ANOTHER method scores full. Seven cards:

```js
tick() { }                  reset() { this.n += 1; }          // 5.7.3 r1: 1/1
addBy(n) { }                extra(n) { this.n += n; }          // 5.7.4 r2: 2/2
moveRight(dx) { }           other() { this.sprite.x += 1; }    // 5.7.9 r1: 1/1
pop() { }                   later() { this.sprite.delete(); }  // 5.7.10 r1: 1/1 (also `popcorn() {...}`, `pop` is a prefix)
isAlive() { }               other() { return this.hp > 0; }    // 5.8.9 r1: 2/2
hit(other) { }              zap(other) { other.takeHit(this.power); }   // 5.8.12: 2/2
add() { }  undo() { this.points -= this.step; this.points += this.step; } // 5.8.4 r2: 3/3
```
Same family: 5.8.3 r1 (`tick() {let n = this.n; n += 1;}` then `zap() { this.n += 1; }` 1/1), 5.7.5 r1 (`const x = this.n > 10; return true;` 1/1, and `return true; this.n > 10;` 1/1), 5.7.6 r1 (`bigStep() {}` with the two calls only in dead code, 1/1).
Cause: no brace scoping. 5.8.8 r1 and 5.11.4 already carry the right clause (`(?:(?!\b(?!(?:if|while|for|switch|catch|function|return)\b)[A-Za-z_$][\w$]*\s*\([^()]*\)\s*\{)[\s\S])*?`, "no other method header in between"); the earlier labs never got it.
**Fix:** the same clause on 5.7.3, .4, .5, .6, .9, .10 and 5.8.3, .4 (r2/r3), .9 (r1), .12 (r1/r2); a leading `\b` and `\s*\(` so `popcorn` is not `pop`. Every cheat above goes red.
Must still pass (all run, all pass patched): the reference of each; `this.n++`, `++this.n`, `this.n = this.n + 1`, `this.n = 1 + this.n`; `this.n = n + this.n`, `this.n += Number(n)`, `this.n = this.n + (n)`; `return (this.n > 10)`, `if/else` true/false, `>= 11`; `this.sprite.pos.x += dx`; method before constructor; one-line bodies.

### 1.3 Presence checks that are not wired to the thing they name
| Lab | Minimum passing input | Score | What the student has not done | Fix (in JSON) |
| --- | --- | --- | --- | --- |
| 5.6.10 r1 | `if (kb.presses('space')) { b.color == colors[i]; }` | 2/2 | the colour never changes (`==` for `=`) | `=(?!=)` |
| 5.6.11 r2 | `b1.color == colors[i];` | 2/2 | same | `=(?!=)` |
| 5.1.20 r5/r6 | `if (kb.pressing('a')) player.vel.x == -4;` (and `.vel.y`) | 7/7 | nothing moves | `=(?!=)` |
| 5.8.4 r1 | `this.step == 3;` (never stored) | 3/3 | `this.step` is undefined | `=(?!=)` |
| 5.6.10 r2 | `kb.presses('space'); b.color = 'lime';` (bare call, colour every frame) | 2/2 | the key does nothing | the call must be in an `if` head or an expression |
| 5.6.11 r2 | `b1.color = ...; b2.color = ...;` | 2/2 | title says "Only b1.color is reassigned" | forbid `b2.color =` |
| 5.8.9 r2 | `e.isAlive();` (bare) and the old `e.hp > 0` checks kept | 2/2 | the lab's whole point ("replace both checks") | call must be in a condition, `?:` or assignment |
| 5.7.14 r1 | `for (let e of enemies) { }` then `enemies[0].render();` (also `for (;;) { break; }`, or a loop over any other array) | 2/2 | only the first enemy is drawn | header must name `enemies`, `render(` after it |
| 5.7.13 r1 | `for (let i = 0; i < 0; i++) { }` then ONE `enemies.push(new Enemy(...))` | 1/1 | the lab asks for five | push must be in the loop body (or five pushes) |
| 5.1.19 r1/r2 | `else player.vel.x = 0.5;` | 2/2 | the drift the lab is about | `0(?![\w.])` (5.8.16 already has it) |
| 5.10.5 r2 | `bullets[i].delete(); bullets.splice(i, 1);` placed BEFORE the `if (...overlaps...)` | 5/5 | every shot is removed at once | delete+splice must sit in the overlap block |
| 5.11.9 r3 | `takeHit(n) { ...; boom.play(); }` (unconditional) | 3/3 | boom on every hit, lab says on the finishing hit | the takeHit alternative needs an `if (hp/isAlive)` guard or early return |

All are fixed in the JSON and each was run with its honest twins. 5.10.5 r2 honest twins that stay green: `const b = bullets[i]` alias inside the block OR declared above the `if` (the first draft of the fix refused the second; caught by the replay and fixed), `splice(...)[0].delete()`, `.remove()`. 5.11.9 r3: `if (this.hp === 0)`, `if (this.hp <= 0) { ... }`, `if (!this.isAlive())`, a play after an `if (this.hp > 0) return;`, and the play in `hitEnemies` inside `if (!e.isAlive()) { ...; boom.play(); }`.

### 1.4 Declared leftovers re-met (accepted by policy, listed for the record, not patched)
Wrong value: `this.n += 100` (5.7.3), `+= n * 2` (5.7.4), `-= dx` (5.7.9), `> 100` (5.7.5), `takeHit(50)` shapes, `wavePause = 0` (5.10.7), clamp to 0 and 400 (5.9.4), `ship.y < -20` for the bullet test (5.9.4 r5), `score += enemyWorth[j]` on every hit before the kill test (5.10.5), `if (this.hp > 99) boom.play()` (5.11.9).
Wrong direction: guard BEFORE the subtraction (5.8.8, 5.11.4 r1, both 2/2 and 6/6; the step says "after"), inverted filter `!e.isAlive()` (5.8.13, 5.11.4 r6), `undo` adding.
Empty-if / empty-loop shells: `if (ship.x < 20) { }` ahead of the movement lines (5.9.4 r1), `if (kb.presses('r')) { }` with `startRound()` within 80 chars (5.9.7 r5), `for (const e of enemies) { }` plus `enemies[0]` in the hit loop (5.10.5 r1), `for (let i = 0; i < 0; i++) { }` plus one `spawnEnemy` / one `new Enemy` (5.10.7 r4, 5.11.6 r2), `class A{constructor(){}} new A(); this.q;` (5.7.22, 4/4).
Uncalled code: `clearEnemies` never called (5.11.4 r6), `new Enemy` only in an unused function (5.11.4 r4), `spawner.ready(...)` as a bare statement with an unconditional `makeWave()` (5.11.6 r3), three arrays pushed with the third in a dead arrow function (5.10.2 r2), `return true; this.hp > 0;` and `const alive = this.hp > 0; return true;` in 5.11.4 r2 (6/6).
Unwired steps (nothing grades them): 5.8.18 "Space knocks one health off" (4/4 with the line deleted), 5.10.5 the `enemies[j].text = String(enemyHp[j])` label, 5.9.4 `b.collider = 'none'` / `b.color = 'yellow'`, 5.11.4 the `this.sprite.text` line in `takeHit`.
Open-ended challenge cards (by design, one line each): 5.7.22 above, 5.11.10 `best = score;` anywhere (1/1), 5.1.24 any `text(` (4/4).
Pseudocode/README cards (lax by policy, not tightened): 5.8.19 passes on `1. enemies - this` / `2. hp - each` / `3. static count` (4/4). 5.7.7 was only run wrapped/empty (0/6 empty, 6/6 reference).

---

## 2. Ungraded or partly graded steps (missing measurement)
- 5.8.18 step 2 (Space hits the first enemy; "do nothing if the list is empty"): no card. Needs `kb\.presses\s*\(\s*['"]space` near `enemies\[0\]\.takeHit`; not added (a lab-lax judgment).
- 5.10.5 step 2 label update, 5.9.4 bullet size/colour, 5.11.4 sprite text: see above. Low, they are display only.
- 5.8.8 the "guard after the subtraction" instruction (1.4).

## 3. WRONGLY REFUSED (honest, taught-style answers)

### 3.1 Fixed in the JSON (each also in a lab that already accepts it somewhere else)
| Lab | Honest answer refused | HEAD | Neighbour that accepts it |
| --- | --- | --- | --- |
| 5.8.9 r1 | `return (this.hp > 0);` `return 0 < this.hp;` `return this.hp >= 1;` `!== 0`, `if (this.hp > 0) { return true; } else { return false; }`, `if (this.hp > 0) return true; return false;` | 1/2 each | 5.7.5 accepts if/else; 5.11.4 r2 accepts all six |
| 5.8.3 r1 | `let n = this.n; n += 1; this.n = n;` (a ONE-token edit of the shipped starter, which is `let n = 0; n += 1; this.n = n;`), `++this.n`, `this.n = 1 + this.n` | 0/1 | 5.8.16 accepts `1 + x` |
| 5.8.13 r1/r2 | `const alive = enemies.filter((e) => e.isAlive()); enemies = alive;`, `e.hp >= 1`, `e.hp !== 0`, `e.hp` | 0-1/2 | 5.8.18 r4 accepts the two-step (that patch never reached its neighbour); r2 now reuses 5.8.18 r4 |
| 5.7.5 r1 | `return this.n >= 11;` named threshold `this.n > HIGH`, `return !(this.n <= 10);` | 0/1 | n/a |
| 5.7.6 r1 | `const r = this.isHigh(); return r;`, `return (this.isHigh());`, `this.addBy(2 + 3)`, `this.addBy(STEP)` | 0/1 | n/a |
| 5.7.3 | `++this.n`, `this.n = 1 + this.n` | 0/1 | n/a |
| 5.7.4 r2 | `this.n = n + this.n`, `this.n += Number(n)`, `this.n = this.n + (n)` | 1/2 | n/a |
| 5.7.9 r1 | `this.sprite.x = dx + this.sprite.x`, `this.sprite.pos.x += dx` | 0/1 | n/a |
| 5.7.10 r1 | `this.sprite.remove()` | 0/1 | 5.7.19 r3 and 5.9.4 accept `.remove` |
| 5.8.12 r2 | `const p = this.power; other.takeHit(p);` | 1/2 | n/a |
| 5.7.13 r1 | `for (...) { let e = new Enemy(...); enemies.push(e); }`, a `while` loop that pushes | 0/1 | n/a |

Every one passes patched; the full list of "must still fail" is in 1.2 and 1.3.

### 3.2 Not fixed (low, or no safe pattern)
- 5.10.2 r1: `new Sprite(x, y, 30, 30, 'none')` 4/5 (the 5-argument form builds `base` in the same file); needs string content, so no flag; add an alternative `new\s+Sprite\s*\([^)]*,\s*['"]none['"]\s*\)`.
- 5.10.2 r3: `enemies[j].vel.y = fallSpeed` 4/5.
- 5.9.4 r1: clamp by ternary 4/5; 5.9.7 r4: the "Game over" text in a helper called from `drawTop()` 4/5; 5.9.6: `overlapping()` / `dist()` 0/3 (the step names `overlaps`; not counted).
- 5.8.18 r1: a counter variable as the timer (`timer += 1; if (timer >= 90)`) 3/4. The step only says "on a timer"; `frameCount % N` is the one accepted shape. No pattern tells `timer >= 90` from any other comparison.
- 5.8.8 r2: floor in a `clamp()` helper 1/2; 5.8.16 r1 `static spawned = 0.0`; 5.8.4 `get step() { return 3; }` 2/3; 5.6.16 renamed constructor parameters (`this.x = a`) 2/5, now accepted only as far as the scoped fix reaches (it accepts any stored parameter); 5.11.4 r3 `land()` via `this.takeHit(99)` or a flag 5/6; 5.11.6 r4 reusing the spawner by resetting fields.
- 5.1 labs (all presence checks by design): a `movePlayer()` helper called from `draw()` scores 3/7 on 5.1.20 (and `frameCount` in a helper 7/8 on 5.1.22); `player.x += 4` instead of velocity 5/7; reset-first `vel = 0` then ifs 0/2 on 5.1.19 (the lab names `else`) and 7/8 on 5.1.22; coordinates from variables 1/3 on 5.1.7.
- Lowercase class names (`class enemy`, 3/4) and class expressions (`const A = class {}`, 3/4) on 5.7.22.
- Not findings: `forEach` / `while` where the step says `for...of` (5.7.14), array literal where the step says "push five times" (5.7.13), `dist()` where the step says `overlaps`.

### 3.3 Elegance half, run as named tests (not asserted)
Ternary: `isAlive` and `takeHit` ternaries accepted, 5.9.4 clamp ternary refused (4/5). Parentheses: `return (this.hp > 0)` refused only on 5.8.9; extra parentheses elsewhere accepted (mutation `spaced`, 0 regressions). `let`/`const`/`var`: all pass (mutation). `==` for comparisons: accepted where tested. Aliases (`const b = bullets[i]`, `const hit = b.hits(e)`, `const w = enemyWorth[j]`): accepted on 5.9/5.10/5.11, refused on 5.8.12 (power) and 5.7.14 spacing only. Member order: 5.7.3 `tick()` before `constructor()` passes. Getters: 5.8.4 refused (not taught). Static: `static spawned = 0` with/without `;`, `Enemy.spawned++` / `++Enemy.spawned` / `= Enemy.spawned + 1` / `this.constructor.spawned`, all accepted.

## 4. Starters above 0 (not defects)
5.1.24 Challenges 1/4 (r3 `background(` is already in the starter's `draw`); 5.10.8 Debugging 1/2 (r2, the shot-down splice, is correct in the starter; the bug is the landing).

## 5. Tooling note: false positives in the tolerance audit
`scripts/audit-grader-tolerance.mjs`, axis "increment written as x = x + 1", rewrites `this.n += 1` to `this.n = n + 1` (only the last identifier is kept), so its hits on 5.7.3, 5.8.3, 5.8.16 and 5.11.6 r2/r5 are artefacts. Run by hand, `this.n = this.n + 1`, `Enemy.spawned = Enemy.spawned + 1`, `this.wave = this.wave + 1` and `this.pause = this.pause - 1` all pass. The axis should keep the member path (`/\b([A-Za-z_$][\w$.]*)\s*(?:\+\+|\+=\s*1\b)/`).

## 6. Timing
118 requirements x about 20 adversarial 5,000-character inputs each (repeated `if (a.y > b `, 2,500 `{` then 2,500 `}`, 5,000 `(`, `function f(){` plus 5,000 spaces, `bullets[i].overlaps(enemies[j]) && ` x 140, `enemyHp.splice(j, 1); ` x 230, the reference truncated at six cut points and padded with its own last 40 characters, the reference with every `}` removed, ...): **2,386 calls, slowest 7.4 ms** (5.7.7 r4, `if (` x 1000), none near 100 ms. With the patch file the same sweep tops out at 1.7 ms, and thirteen extra inputs aimed at the new patterns (`tick() { ` x 600, `isAlive() { return ` x 300, `constructor(a, b, c) { ` x 250, `const b = bullets[i]; ` x 230, ...) top out at 4.5 ms.

## 7. Apply notes
- Apply per entry: set `ignoreStrings` and/or replace `pattern` on `lessons/<dir>/lesson.json` requirement `<rid>`. 5.7.3 r1 also sets `flags` to `""` (the old pattern carried flag `s`; the new one uses `[\s\S]` and needs none).
- Reference + starter check run with the patches: all 44 references full, starters at HEAD's score (0 everywhere except the two in section 4).
- One honest shape the patches newly refuse: `other?.takeHit(this.power)` (5.8.12; optional chaining is not taught; it was already refused by r1).
