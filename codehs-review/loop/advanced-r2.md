# Advanced lens, round 2 (shortest passing answer), modules 5.2 to 5.5

Run 2026-10-30 against commit 96c86674 (branch codehs-inspiration). Method: ~190 candidate answers run through the real grader (`gradeWithTests` from `lib/run-tests-node.ts`, compiled to a scratch dir; every lesson's own `lesson.json` requirements, `orTest` and `inFunction` included). Candidates were built by mutating each lab's `solution.js` / `script.js`, so the "must still pass" side is the course's own shapes, not an invented one. Browser confirmation (playwright-cli session `r2-advanced`, cookie dev_student=r2advanced, session closed) on four of them. Owner policy applied: regex labs lax, AI screens super lax; flagged only where the looseness lets a student skip the concept, or where a taught shape is refused.

Gate: untouched starters, all graded labs in 5.2-5.5: every starter is below full. The only starter that still passes a requirement is 5.2.20 (5-2-15) r1 (`new Canvas(`, 1/4), which is fine: the starter is a runnable scene.
Every `solution.js` scores full (all rows of the sweep).

---------------------------------------------------------------------
## Round-1 findings: BLOCKED / STILL OPEN

| Round-1 finding | Result now | Evidence |
| --- | --- | --- |
| 5.2.4 empty-block flip (`if (frameCount % 30 === 0) { }` then `on = !on;`) | BLOCKED | 4/5, r2 fails. Also blocked: a `console.log` in the block then flip outside, and an empty nested `if` then flip outside. |
| 5.2.4 honest flips | PASS | braceless `if (...) on = !on;`, nested `if (on) {on=false} else {on=true}`, double quotes, no semicolons, other statement before the flip: all 5/5 |
| 5.2.3 r3/r4 two-arg forms (`floor(random(1, 6 + 1))`, `floor(random(0, colors.length))`) | BLOCKED (now accepted) | 5/5 |
| 5.2.3 coin teleports every frame | BLOCKED by design | the beat `if (frameCount % 60 === 0)` is now in the starter; a student can still delete it, low |
| 5.2.16 `distanceTo` / `if (goal && dist(...) < 25)` refused | BLOCKED (now accepted) | 4/4 for `goal && dist(...)`, `goal && player.distanceTo(goal)`, `goal !== null`, `Math.hypot`, `** 0.5`, brace-less |
| 5.2.16 goal deleted on frame 1 (`if (goal) { Math.sqrt(1); goal.delete(); goal = null; }`) | STILL OPEN (medium) | 4/4. Also `dist(1,2,3,4)` and `if (true)` wrappers. r2 is satisfied by a distance CALL anywhere, nothing ties it to a comparison. |
| 5.2.20 four lines of nothing | PARTLY BLOCKED | the empty starter is now the real one-goal scene, so r1 passes untouched (1/4). `new Sprite(); let n=0; n++; console.log('All goals collected!');` appended to the starter is still 4/4. Optional, 0-point lab: low. |
| 5.2.12 Bouncy Ball sticky ball (`ball.bounciness = 0; ball.friction = 100;`) | STILL OPEN (low) | lesson untouched since round 1; r3/r4 are `\.bounciness\s*=` / `\.friction\s*=`, any value. Steps 1, 2 (4 walls), 6, 7 ungraded. |
| 5.2.14 downward wind (`applyForce(0, 3)`) | STILL OPEN (low) | 2/2; `applyForce(0, 0)` also passes. The zone gating is real (unconditional force fails r2). |
| 5.3.4 `world.gravity.y = 0` passes "turn gravity on" | BLOCKED | 3/4, r1 fails. `= 10`, `= 0.5`, `= 9.8`, `= -10` pass. |
| 5.3.7 lookalike (`if (t && !x) {...} touching = x;`) | BLOCKED | 2/3 (r3 fails), also with `wasTouching = touching2` and `wasTouching = wasTouching` |
| 5.3.7 honest shapes refused | BLOCKED (now accepted) | 3/3 for: brace-less, swapped `!wasTouching && touching`, `=== false`, `score++`, `score = score + 1`, a memory variable named anything (`hit`/`last`), no semicolons, `let` instead of `const`, nested ifs, `goal.colliding(ball)`. |
| 5.3.10 unused flag (`let a = true; if (ball.y > 400) a = false;` and `score = 0` on R) | STILL OPEN (medium) | 3/3. The flag is declared and set, never read. Lesson step 3 says "when the flag is false, draw Game over", nothing grades that. Fix below. |
| 5.3.10 refused `>=`, `height`, `"r"` | BLOCKED (now accepted) | 3/3 for `ball.y >= 400`, `ball.y > height`, `kb.presses("r")`, no semicolons, brace-less |
| 5.3.12 / 5.4.11 / 5.5.11 "pick one" needs all three | BLOCKED | each is now ONE card (`r1`), 0/1 on the untouched starter, 1/1 on the reference. Browser: 5.5.11 with an honest `let beat = 8; ... beat -= 1;` shows 1/1 and Submit is enabled. |
| challenge labs pass on one line of dead code | STILL OPEN (accepted trade-off) | `min(1,2); if (score > best) {} random(1); random(2);` is 1/1 on 5.3.12, 5.4.11 and 5.5.11 (`beat -= 1; if (score > best) {} turnX = 0;`). Comment-only text does NOT pass (0/1). Under the owner's lax policy for an optional, 0-point lab I would leave it; the honest student is no longer blocked, which was the inversion. |
| 5.4.8 two-line cheat (`p.passed = false` on collision + `pipes = []` on R) | BLOCKED | node 1/6 (only r3), browser 1/6, Submit disabled |
| 5.4.8 / 5.4.6 untouched starter passes a requirement | BLOCKED | both starters now score 0 on every requirement (5.4.6: 0/3, 5.4.8: 0/6) |
| 5.4.8 flag declared and never gates (`let playing...` set, text shown, but no gate) | BLOCKED, one residual | 5/6 when the gate is absent (r5 fails). Residual: an EMPTY `if (playing) { }` placed above `if (frameCount % 90 ...)` still passes r5, 6/6 (low; the freeze, game-over and restart still had to be written). |
| 5.4.8 honest shapes | PASS | early-return gate, `if/else` gate, `p.colliding(bird)`, `kb.presses("r")`, restart via function, `pipes.length = 0` |
| 5.4.7 `pipes[i]` loop refused (all three requirements) | BLOCKED (now accepted) | 3/3 for indexed loop, `score++`, `score = score + 1`, swapped operands, flipped `bird.x > p.x`, `<=`/`>=`, `=== false`/`== false`, nested ifs, brace-less, `forEach`, `for (let p of pipes)`, any loop variable name |
| 5.4.6 two-line `const p = makePipe(); pipes.push(p);` and `frameCount % gap` | BLOCKED (now accepted) | 3/3 |
| 5.4.4 `kb.presses('space')`, `>=`/`<=`, `height` | BLOCKED (now accepted) | 3/3 |
| 5.5.6 never-grows snake (`unshift` + `pop().delete()` always, `score += 1; food = makeFood()` always) | BLOCKED | 3/4, r4 fails; also with an empty `if` / `else` shell |
| 5.5.6 refused `score++`, `score = score + 1`, food before score, early `return` | BLOCKED (now accepted) | 4/4 |
| 5.5.4 only the up key graded | BLOCKED | `up` + junk guard is 1/3. All four keys required, all four guarded; nested guards, guard-first `&&`, `dy !== 1` style, double quotes pass 3/3. |
| 5.5.4 `col > 19`, `=== 20` | BLOCKED (now accepted) | 3/3 |

---------------------------------------------------------------------
## New findings

### Honest answers refused (taught shape, grader says no)

1. **5.5.6 r4 refuses the named-flag form.** The course teaches storing a check in a variable (5.3.7 `const touching = ball.colliding(goal)`), but this fails r4 (3/4):

       const ate = col === food.col && row === food.row;
       if (ate) { score += 1; food.delete(); food = makeFood(); } else { segments.pop().delete(); }

   Also refused: `if (ate) {...}` followed by `if (!ate) { pop }`, and a helper `if (eats(col, row)) ...`. r4 needs `food` inside the `if (...)` parentheses.
   Fix: append two alternatives to r4 (verified: ref passes, starter fails, never-grows and empty-shell still fail, `ate`/`!ate` forms pass, early-return / brace-less else / negated-condition forms keep passing):

       |(?:const|let)\s+(\w+)\s*=[^;]*\bfood\b[^;]*;[\s\S]{0,300}?if\s*\(\s*\1\s*\)\s*\{(?:[^{}]|\{[^{}]*\})*\}\s*else\s*\{?[^{}]*?segments\.(?:pop|splice)\s*\(
       |(?:const|let)\s+(\w+)\s*=[^;]*\bfood\b[^;]*;[\s\S]{0,400}?if\s*\(\s*!\s*\2\s*\)\s*\{?[^{}]*?segments\.(?:pop|splice)\s*\(

   (The second alternative's capture is group 2, so the old pattern must stay group-free as it is today.)

2. **5.5.11 r1 is case-sensitive and the starter's own name is `BEAT`.** The starter has `const BEAT = 8;`. A student changes it to `let BEAT = 8;` and writes `BEAT -= 1;` (or `BEAT--`): 0/1. Browser-confirmed (counter stays 0/1, Submit disabled). The lowercase `beat` passes. A variable renamed `speed` also fails (low, ignore).
   Fix: give r1 the flag `i` (the pattern is otherwise unchanged). Verified: starter no, solution yes, `BEAT -= 1` yes, `BEAT--` yes, `beat -= 1` yes, comment-only no.

3. **5.4.11 r1 refuses the simplest "harder as you go".** `const sp = 2 + score; top.vel.x = -sp;` and `top.vel.x = -2 - score;` fail: the score alternative accepts only `score * / % < >`, `min(`, `max(`, or two `random(`. `score / 5` and `score * 0.2` pass; `+ score` does not (and `+ score` cannot be added blindly, the starter's own `text('score: ' + score ...)` contains it).
   Fix: add `|\.vel\.[xy]\s*=[^;\n]*\bscore\b|\bconst\s+(?:speed|sp|gap\w*|half\w*)\s*=[^;\n]*\bscore\b`. Verified: starter no, solution yes, `2 + score` yes, `-2 - score` yes, `-(2 + score)` yes, comment-only no. Dead-code still passes (accepted above).

4. **5.5.8 (5-5-8) r1/r2 refuse the lesson's own named alternative.** The r2 description says "(a guard `if`, or `Math.max`)" but:
   - `this.hp = Math.max(0, this.hp - n);` fails r1 (r1 wants `-= n` or `= this.hp - n`), 1/2.
   - `this.hp -= n; this.hp = Math.max(this.hp, 0);` fails r2 (r2 wants `Math.max(0`), 1/2.
   - `if (this.hp > n) { this.hp -= n; } else { this.hp = 0; }` fails r2, 1/2.
   Fix r1: `takeHit\s*\(\s*(\w+)\s*\)\s*\{[\s\S]*?this\.hp\s*(?:-=\s*\1|=\s*(?:this\.hp\s*-\s*\1|Math\.max\s*\([^;]*?this\.hp\s*-\s*\1))`. Fix r2: append `|takeHit\s*\([^)]*\)\s*\{[\s\S]*?(?:Math\.max\s*\(\s*this\.hp\s*,\s*0|\}\s*else\s*\{\s*this\.hp\s*=\s*0)`. Verified: starter no, solution yes, all three cases yes, "no floor at all" still fails r2. (Step 2 says write the guard after the subtraction, so a `Math.max(0, this.hp - n)` one-liner is arguably off-script; the description is what makes the refusal a defect. Either reword the description or take the fix.)

5. **5.5.16 r2** refuses `Enemy.spawned = Enemy.spawned + 1;` (`+=`/`++` only); the course taught the long form from unit 1. Fix: `(?:\+=|\+\+|=\s*(?:Enemy|this\.constructor)\.spawned\s*\+)`. Verified: starter no, solution yes, long form yes, `++` yes.

6. **5.5.18 r1/r2 require `===`**; `enemies.length == 0` and `frameCount % 90 == 0` fail (2/4). Change `===` to `===?` in both. Low.

7. **5.3.12 r1 refuses `slider.x++`** (mover written with `++`; 2.1.14 teaches it). Add `|\b\w+\.[xy]\s*(?:\+\+|--)`. Starter has no such text. Low.

8. Low, noted only: 5.2.4 refuses `on = on ? false : true` and `frameCount % beat === 0` with `const beat = 30` (r1/r2 need digits); 5.4.4 refuses `const FLAP = -4; bird.vel.y = FLAP`; 5.4.6 r3 refuses `splice` before `delete` (the order is valid); 5.3.4 r3 refuses `bounciness = .75` (no leading zero); 5.5.8 refuses `.some(...)` and 5.3.8 `while` loops (not taught, fine).

### Gameable (skips the concept)

1. **5.3.10 (5-3-pinball-9): the flag is never read.** 3/3 for `let a = true; if (ball.y > 400) a = false;` plus `score = 0` on R. Nothing draws "Game over" or gates play, though step 3 asks for it. Add a fourth requirement (variable name taken from r1's own match, so any name works):

       (?<![\w.])(\w+)\s*=\s*true\b[\s\S]*?(?:\bif\s*\(\s*!?\s*\1\s*\)|\b\1\s*(?:\?|&&)|&&\s*!?\s*\1\b)

   Verified: starter no, solution yes, `if (!playing) ... else`, `playing && ...`, a renamed flag `gameOn` all yes, unused flag no, dead-assign no. Add `(?:\s*===?\s*(?:true|false))?` inside the `if (...)` if `if (playing === false)` should count. It does ask for something step 3 states, so it is not a new demand.

2. **5.2.4 r4 (the one-shot) crosses the block.** `if (frameCount === 300) { }` then an unconditional `message = 'Time is up!';` is 5/5 (r4's `[\s\S]{0,200}?` runs out of the empty block, the same flaw 5.2.4 r2 had). Fix r4: `frameCount\s*===?\s*(?:300|5\s*\*\s*60)\s*\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?|[^{};]*?)\bmessage\s*=\s*\S`. Verified: ref yes, starter no, unconditional no, brace-less `if (...) message = '...'` yes, `message` set after the log yes, double quotes / no semicolons yes.

3. **5.2.16 (5-2-11) r2**: see table (STILL OPEN). Fix r2, verified (ref, `goal && dist(...)`, `goal && player.distanceTo(goal)`, `Math.hypot`, `** 0.5`, brace-less all yes; `Math.sqrt(1)`, `dist(1,2,3,4)` called and discarded, `if (true)` all no; starter no):

       (?:Math\.(?:sqrt|hypot)\s*\([^;{}]*\)|\bdist\s*\([^;{}]*\)|\.distanceTo\s*\([^;{}]*\))\s*<=?\s*\d+|\b(\w+)\s*=\s*(?:Math\.(?:sqrt|hypot)\s*\(|dist\s*\(|[\w.]*\.distanceTo\s*\(|\()[^;]*;[\s\S]{0,200}?\b\1\s*<=?\s*\d+

   It does not stop `if (d < 0) {}` with any number; that is lax and fine.

4. **5.4.8 r5 (empty gate)**: `if (playing) { }` above the pipe code satisfies the "game runs only while the flag is true" requirement. Fix: `\bif\s*\(\s*\w+\s*(?:===?\s*true\s*)?\)\s*\{\s*[^}\s][\s\S]*?frameCount\s*%` for the first alternative (second alternative, the early-return form, unchanged). Verified: solution yes, early-return gate yes, starter no, empty gate no. Low.

5. Low and left alone (regex-lax by policy): 5.3.7 `if (touching && !wasTouching) { }` then `if (touching) { score += 1; }` and `wasTouching = touching && false` still 3/3 (only a deliberate lookalike); 5.3.8 loop that adds `b.worth` with no edge test; 5.4.7 `score += 1; p.passed = true;` after an EMPTY `if` 3/3; 5.4.6 `% 1` plus unconditional delete/splice with no `x < -30` test; 5.5.8 isBody with `return true` always or a thrown-away call; 5.5.18 `if (true) { enemies.length === 0; frameCount % 90 === 0; ...push }` 4/4 (bare comparisons satisfy r1/r2); 5.5.6 an extra unconditional `pop()` after a correct `if/else` still 4/4.

### Not tested, so not "none found"
- semicolon-free style on 5.2.x labs other than 5.2.4 and 5.2.3 (both pass); the 5.3.13-5.3.36 OOP labs and the 5.5.3/5.5.4/5.5.9/5.5.12/5.5.13 labs got a spot check only (5.5.9: `return this.hp >= 1`, `if/else return true/false`, `!(this.hp <= 0)` all fail r1, which wants `> 0`; low, the description says "above 0").
- AI-graded plan/playtest screens (lax by design, not attacked).

---------------------------------------------------------------------
## Verdict per module

- **5.2: clean except 5.2.16.** The 5.2.4 beat is now measured and the 5.2.3 two-argument forms pass. Biggest gap: 5.2.16 deletes the goal on frame 1 for 4/4 (r2 matches a distance call with no comparison). Runner-up: 5.2.4 r4 accepts an unconditional `message =` after an empty `if (frameCount === 300) { }`. Both fixes above are tested.
- **5.3: clean except 5.3.10.** The pinball lookalike and gravity-0 attacks are closed and every taught shape of 5.3.7 now passes. Biggest gap: 5.3.10 grades a flag that nothing reads (3/3 with a declared-and-never-read flag). Runner-up: 5.3.12 refuses `slider.x++`.
- **5.4: clean.** The two-line 5.4.8 cheat, both starter leaks and the indexed-loop refusals are closed; honest shapes pass. Biggest gap: 5.4.11 r1 refuses `speed = 2 + score` (the simplest "harder as you go"); residual gaming is only an empty `if (playing) { }` gate in 5.4.8.
- **5.5: biggest gap is an honest-answer refusal, not gaming.** The never-grows snake and the one-key steer are closed. 5.5.6 r4 refuses the named-boolean form (`const ate = ...; if (ate) ... else pop`) the course itself modelled in 5.3.7; 5.5.11 r1 refuses the starter's own `BEAT` name (`let BEAT; BEAT -= 1`), and 5.5.8 refuses `this.hp = Math.max(0, this.hp - n)` which its own description names.

Scripts / evidence: harness and 190 case files are in the scratchpad (`g.js`, `mut.py`, `pt.js`, `cases/`); no repo files other than this report were edited.
