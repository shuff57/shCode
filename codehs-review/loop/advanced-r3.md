# Advanced lens, round 3 (shortest passing answer), modules 5.2 to 5.5 Snake

Run 2026-10-30 against commit f5e53852 (branch codehs-inspiration), dev server on :3002 untouched. Method: ~330 candidate answers run through the real grader (`gradeWithTests` from `lib/run-tests-node.ts`, compiled to a scratch dir, each lesson's own `lesson.json` requirements). Candidates are mutations of each lab's own `solution.js` / `script.js`, so every "must still pass" is the course's own shape. Every proposed pattern below was run against (1) the cheap answer that must start failing, (2) the honest shapes that must keep passing, (3) the untouched starter, (4) the lesson's own `solution.js`. Browser confirmation: playwright-cli session `r3-advanced`, cookie `dev_student=r3advanced`, two cheats (5.4.8 and 5.5.6), session closed. No repo file other than this report was edited. 5.8-era lessons in `5-5-*` folders (takeHit, isAlive, static spawned, wave spawner) and the 5.7-era `5-3-10..36` OOP labs were skipped as instructed.

Owner policy applied: labs lax, AI screens super lax. Flagged only where the looseness lets a student skip the concept, or where an honest taught answer is refused.

Gate (re-checked): every graded starter in 5.2 to 5.5 scores 0 on every requirement, and every `solution.js` scores full (92 rows, `base.out`). No requirement passes on an untouched starter. The 5.4.8 r4 lookahead is the one place a starter line (`bird.vel.x = 0`) quietly satisfies half a requirement; see 5.4.8 below.

---------------------------------------------------------------------
## Round-2 items: BLOCKED / STILL OPEN

| Item | Result now | Evidence |
| --- | --- | --- |
| 5.2.16 `Math.sqrt(1)` discarded, `dist(1,2,3,4)` discarded, `if (true)` wrapper | BLOCKED | 3/4, r2 fails for all three, and for `const d = Math.sqrt(1); if (d < 25)` and `Math.sqrt(1) < 25` |
| 5.2.16 residual (new, see Gameable 1) | STILL OPEN, medium-low | `const dx = (player.x - goal.x); if (dx < 25)`, `const n = (frameCount); if (n < 25)`, `if (Math.sqrt(player.x) < 25)`, `dist(player.x, player.y, 0, 0) < 9999` are all 4/4 |
| 5.3.10 unread flag (`a = false` on loss, never read) | BLOCKED | 3/4, r4 fails |
| 5.3.10 residual (new, see Gameable 2) | STILL OPEN, low-medium | `if (playing) { }` (empty), `playing && playing;`, `playing ? 1 : 2;`, `console.log(playing && 1)` are all 4/4 |
| 5.4.8 spawn outside the gate | BLOCKED | spawn before the gate, after the gate, with a dummy gate before it, with a `frameCount %` in drawTop: all 5/6, r5 fails |
| 5.4.8 empty gate `if (playing) { }` above the pipe code | BLOCKED | 3/6, r5 fails |
| 5.4.8 two-line cheat (round 1) | still BLOCKED | 3/6 |
| 5.4.8 pipes not frozen / decoupled flag (new) | STILL OPEN, medium-low | 6/6, Submit enabled in the browser (Gameable 3) |
| 5.5.6 ate-variable honest answer (`const ate = col === food.col && ...; if (ate) {..} else {pop}` and the `if (!ate)` twin) | BLOCKED (accepted) | 4/4 both, one-line initialiser |
| 5.5.6 other honest shapes (new refusals, see Refused 1) | STILL OPEN, medium | `let ate = false; if (...) ate = true;` 3/4, `if ((col === food.col) && (row === food.row))` 3/4, `if (!(col === food.col && ...))` 3/4, a `const ate =` whose initialiser wraps onto a second line 3/4 |
| 5.5.6 gaming (new, see Gameable 4) | STILL OPEN, medium | `if (food) { score += 1; ... } else { pop }` 4/4, browser: score 9 and a 12-cell snake on a run that never eats |
| 5.5.11 `let BEAT = 8; BEAT -= 1;` / `BEAT--` / `--BEAT` / `BEAT = BEAT - 1` / `BEAT = max(3, BEAT - 1)` | BLOCKED (accepted) | 1/1 each (flag `i` landed) |
| 5.5.11 comment-only, untouched | still BLOCKED | 0/1 |
| 5.5.11 dead-code (`function x(){ let beat = 8; beat--; }`) | STILL OPEN (accepted trade-off) | 1/1; optional 0-point lab, leave |
| 5.4.11 `speed = 2 + score` shapes | BLOCKED (accepted) | 1/1 for `-(2 + score)`, `-2 - score`, `-2 - score / 5`, `const sp = 2 + score`, `sp = sp + score`, `min(2 + score, 6)`, helper `speedFor(score)`, gap narrowing via `65 - score * 2` |
| 5.4.11 new side effect of that fix (see Gameable 5) | STILL OPEN, low | refactoring `text('score: ' + score)` into `const label = 'score: ' + score;` scores 1/1 with no challenge done |
| 5.2.20 padding (`new Sprite(1,1,1,1); goal.delete(); goal.delete(); let n = 0; n++; if (n === 2) { console.log('All goals collected!'); }`) | STILL OPEN (accepted trade-off) | 4/4 for four padding variants, also in a never-called function. r4 now needs an `if (...)`, which a padder just adds. Optional stretch lab: leave. |
| 5.2.4 r4 (empty `if (frameCount === 300) { }` then unconditional `message =`) | BLOCKED | 4/5, r4 fails |
| 5.2.4 flip outside the beat, `frameCount === 70` wrapped in `if (on)` | BLOCKED | 4/5 each |
| 5.3.12 refused `slider.x++` | BLOCKED (accepted) | 1/1 for `slider.x++` and `slider.x += 2` |
| 5.4.6 `delete` then `splice` order | BLOCKED (accepted) | 3/3 both orders (but see Gameable 6) |
| 5.2.13 bounciness `0.8` or more | PASS | 0.8, .85, 1 pass; 0.7 fails |

---------------------------------------------------------------------
## New findings: gameable (a student skips the concept)

Each fix names its pass list. "Starter 0" means the untouched starter still scores 0 under the new pattern; "ref" means the lesson's own `solution.js` still scores full. All checked.

### 1. 5.2.16 (folder `5-2-11-lab-reaching-the-goal`) r2: the new `\(` branch compares anything
The round-2 pattern added `|\(` as an allowed start of a right-hand side so `const d = (dx*dx + dy*dy) ** 0.5` works. It also accepts any parenthesised assignment later compared with `<`.

    if (goal) { const dx = (player.x - goal.x); if (dx < 25) { console.log('You win!'); goal.delete(); goal = null; } }   // 4/4
    if (goal) { const n = (frameCount); if (n < 25) { ... } }                                                          // 4/4
    if (goal) { if (Math.sqrt(player.x) < 25) { ... } }                                                                // 4/4

The first is a one-axis test (fires from anywhere left of the goal), the second compares the frame counter. Neither is a distance. `Math.sqrt(1)` is blocked, but a variable standing in for 1 is not.

Fix r2: demand the shape of the formula in each call (sqrt needs a `*` or `pow(`, hypot needs a comma, dist needs four arguments with a name in them) and move `** 0.5` into its own branch.

    (?:Math\.sqrt\s*\([^;{}]*(?:\*|\bpow\s*\()[^;{}]*\)|Math\.hypot\s*\([^;{}]*,[^;{}]*\)|\bdist\s*\((?=[^;{}]*[A-Za-z_])[^;{}]*,[^;{}]*,[^;{}]*,[^;{}]*\)|[\w.]*\.distanceTo\s*\([^;{}]*[A-Za-z_][^;{}]*\))\s*<=?\s*[\w.]|\d\s*>=?\s*(?:Math\.sqrt\s*\([^;{}]*(?:\*|\bpow\s*\()[^;{}]*\)|Math\.hypot\s*\([^;{}]*,[^;{}]*\)|\bdist\s*\((?=[^;{}]*[A-Za-z_])[^;{}]*,[^;{}]*,[^;{}]*,[^;{}]*\)|[\w.]*\.distanceTo\s*\([^;{}]*[A-Za-z_][^;{}]*\))|\)\s*\*\*\s*0?\.5\s*<=?\s*[\w.]|\b(\w+)\s*=\s*(?:(?:Math\.sqrt\s*\([^;{}]*(?:\*|\bpow\s*\()[^;{}]*\)|Math\.hypot\s*\([^;{}]*,[^;{}]*\)|\bdist\s*\((?=[^;{}]*[A-Za-z_])[^;{}]*,[^;{}]*,[^;{}]*,[^;{}]*\)|[\w.]*\.distanceTo\s*\([^;{}]*[A-Za-z_][^;{}]*\))|\([^;\n]*\)\s*\*\*\s*0?\.5)[^;\n]*[;\n][\s\S]{0,300}?(?:\b\1\s*<=?\s*[\w.]|\d\s*>=?\s*\1\b)

Must start failing (all 3/4 now): `Math.sqrt(1)`, `dist(1,2,3,4)`, `(player.x - goal.x)` then `< 25`, `(frameCount)` then `< 25`, `Math.sqrt(player.x) < 25`. Must keep passing (4/4): ref (`const dist = Math.sqrt(dx*dx + dy*dy)`), inline `dist(player.x, player.y, goal.x, goal.y) < 25`, `player.distanceTo(goal) < 25`, `Math.hypot` var, `(dx*dx + dy*dy) ** 0.5` as var and inline, `dx ** 2 + dy ** 2`, `Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2))`, `25 > dist`, `<=`, no-semicolon style, any variable name, an extra line between the assignment and the test. Starter 0. Residual that no regex fixes: `dist(player.x, player.y, 0, 0) < 9999` (a name is present, the numbers are junk). Lax and fine.

### 2. 5.3.10 (`5-3-pinball-9-lab-lose-and-start-again`) r4: read the flag with an empty body
Round 2's r4 correctly fails a flag that is set but never read (3/4). The new test is satisfied by the cheapest possible read:

    if (ball.y > 400) playing = false;
    if (playing) { } else { }          // 4/4
    playing && playing;                // 4/4
    playing ? 1 : 2;                   // 4/4
    console.log(playing && 1);         // 4/4
    if (playing) { }  (above the loss test)   // 4/4

Nothing draws Game over or gates the round, and nothing else in the lesson checks that ("Game over" is ungraded in 5.3.10; 5.4.8 does grade it in r6). Fix r4: the `if` must have a non-empty body, and the `?` / `&&` forms must be followed by a call.

    (?:ball\.y\s*>=?\s*(?:\d+|height)|(?:\d+|height)\s*<=?\s*ball\.y)[\s\S]{0,80}?(?<![\w.])(\w+)\s*=\s*(?:true|false)\b[\s\S]*?(?:\bif\s*\(\s*!?\s*\1\s*(?:===?\s*(?:true|false)\s*)?\)\s*(?:\{\s*[^}\s]|[^{}\s])|\b\1\s*(?:\?|&&)\s*[^;]*\(|\bif\s*\([^)]*?(?:&&|\|\|)\s*!?\s*\1\b[^)]*\)\s*(?:\{\s*[^}\s]|[^{}\s]))|\bif\s*\(\s*!?\s*(\w+)\s*(?:===?\s*(?:true|false)\s*)?\)\s*(?:\{\s*[^}\s]|[^{}\s])[\s\S]*?(?:ball\.y\s*>=?\s*(?:\d+|height)|(?:\d+|height)\s*<=?\s*ball\.y)[\s\S]{0,80}?(?<![\w.])\2\s*=\s*(?:true|false)\b|\bif\s*\([^)]*?(?:&&|\|\|)\s*!?\s*(\w+)\s*\)\s*(?:\{\s*[^}\s]|[^{}\s])[\s\S]*?(?:ball\.y\s*>=?\s*(?:\d+|height)|(?:\d+|height)\s*<=?\s*ball\.y)[\s\S]{0,80}?(?<![\w.])\3\s*=\s*(?:true|false)\b

Must start failing (3/4): never read, empty `if/else`, `playing && playing`, `playing ? 1 : 2`, `console.log(playing && 1)`. Must keep passing (4/4): ref, `if (!playing) {over} else {play}`, flag test after the loss test, `if (ball.y > 400 && playing) {...}` then `if (!playing) {...}`, `gameOver` starting false then set true, ternary `playing ? a() : b()`, helper `drawGameOver()`, brace-less `if (!playing) text(...)`, brace-less else, a restart helper. Starter 0. Left alone: `if (playing) { score += 0; }` (a non-empty junk body; a deliberate cheat, lax). `playing && drawPlay();` placed BEFORE the loss test was refused before and still is (rare).

### 3. 5.4.8 (`5-4-flappy-7-lab-crash-and-start-again`): the freeze is half-graded, the flag need not be the gate's flag
Browser-confirmed: with the pipe-freeze loop deleted from the reference, r1 to r6 are green (6/6), Submit is enabled, and the run shows pipes still sliding after the crash.

    // reference minus:  for (const q of pipes) { q.vel.x = 0; q.mate.vel.x = 0; }      // 6/6

Cause: r4 is `^(?=...world.gravity.y = 0)(?=...\.vel\.x = 0)`, and the STARTER already contains `bird.vel.x = 0;` (the hold-the-bird line), so the second lookahead is free. Step 2 says freeze "gravity, bird, every pipe"; the pipes are ungraded.

Fix r4 (do not let the bird line count):

    ^(?=[\s\S]*world\.gravity\.y\s*=\s*0(?![\d.]))(?=[\s\S]*(?<!bird)\.vel\.x\s*=\s*0(?![\d.]))

Must start failing: the 6/6 cheat above (5/6, r4 fails). Must keep passing (6/6): ref, `pipes.forEach(q => { q.vel.x = 0; q.mate.vel.x = 0; })`, `allSprites.vel.x = 0`, `pipes[i].vel.x = 0` index loop. Starter 0.

Second hole, same lab: r2 accepts any `x = false/true` after the collision and r5 accepts any `if (name)` gate, nothing relates them. A crash that sets `crashed = true` while the gate reads `playing` (never false) is 6/6 and the game never freezes (also 6/6 under the r4 fix). Add a seventh requirement, tested (ref true, `gameOver` flag honest true, decoupled false, starter false):

    ^(?=[\s\S]*(?:bird\.colliding\s*\(|\.colliding\s*\(\s*bird\b)[\s\S]{0,160}?(?<![\w.$])(\w+)\s*=\s*(?:false|true)\b)[\s\S]*\bif\s*\(\s*!?\s*\1\s*(?:===?\s*(?:true|false)\s*)?\)

Low priority if the owner prefers fewer cards: the mis-wired game is visibly broken to the student.

### 4. 5.5.6 (`5-5-snake-6-lab-grow-and-eat`) r4: any mention of `food` is a comparison
Browser-confirmed. `if (col === food.col && row === food.row)` replaced by `if (food)` is 4/4, Submit enabled; the run showed score 9, a 12-segment snake and a food block that never moved, because the always-true branch scores and regrows every step. Same for `const ate = food; if (ate) {..} else {pop}` and `if (true || food)`.

    segments.unshift(makeSegment(col, row));
    if (food) { score += 1; food.delete(); food = makeFood(); } else { const tail = segments.pop(); tail.delete(); }   // 4/4

The condition has to compare against the food's cell. Fix r4 (one pattern that also fixes Refused 1 below):

    if\s*\((?=[^{};]*\bfood\.(?:col|row)\b)(?:[^()]|\([^()]*\))*\)\s*\{(?:[^{}]|\{[^{}]*\})*\}\s*else\s*\{?[^{}]*?(?:segments\.(?:pop|splice)\s*\()|if\s*\((?=[^{};]*\bfood\.(?:col|row)\b)(?:[^()]|\([^()]*\))*\)\s*\{(?:[^{}]|\{[^{}]*\})*?\breturn\b(?:[^{}]|\{[^{}]*\})*\}[\s\S]*?(?:segments\.(?:pop|splice)\s*\()|if\s*\((?=[^{};]*\bfood\.(?:col|row)\b)(?=[^{};]*(?:!==?|!\s*\())(?:[^()]|\([^()]*\))*\)\s*\{?[^{}]*?(?:segments\.(?:pop|splice)\s*\()|(?:const|let|var)\s+(\w+)\s*=[^;]*?\bfood\.(?:col|row)\b[^;]*;[\s\S]{0,300}?if\s*\(\s*\1\s*(?:===?\s*true\s*)?\)\s*\{(?:[^{}]|\{[^{}]*\})*\}\s*else\s*\{?[^{}]*?(?:segments\.(?:pop|splice)\s*\()|(?:const|let|var)\s+(\w+)\s*=[^;]*?\bfood\.(?:col|row)\b[^;]*;[\s\S]{0,400}?if\s*\(\s*(?:!\s*\2|\2\s*===?\s*false)\s*\)\s*\{?[^{}]*?(?:segments\.(?:pop|splice)\s*\()|(?:let|var)\s+(\w+)\s*=\s*false\s*;[\s\S]{0,300}?if\s*\((?=[^{};]*\bfood\.(?:col|row)\b)(?:[^()]|\([^()]*\))*\)\s*\{?[^{}]*?\b\3\s*=\s*true\b[\s\S]{0,300}?if\s*\(\s*(?:\3\s*\)\s*\{(?:[^{}]|\{[^{}]*\})*\}\s*else\s*\{?[^{}]*?(?:segments\.(?:pop|splice)\s*\()|!\s*\3\s*\)\s*\{?[^{}]*?(?:segments\.(?:pop|splice)\s*\())

Must start failing (3/4): `if (food)`, `const ate = food`, `if (true || food)`, round-1 never-grows (pop always, eat always), empty if/else shell, pop unconditional then `if (eat) {} else {}`. Must keep passing (4/4): ref, `const ate = ...; if (ate) {..} else {..}`, `if (ate) {..} if (!ate) {pop}`, `let ate = false; if (...) ate = true; if (ate) {..} else {pop}` (and the `if (!ate)` pop form), `((col === food.col) && (row === food.row))`, `!(col === food.col && row === food.row)`, `!==` with `||`, early `return`, brace-less `else`, `segments[0].col === food.col`, `const ate =\n col === ...`, `segments.splice(segments.length - 1, 1)`, a head variable. Starter 0. Residual: `if (food.col >= 0) {eat} else {pop}` (deliberate; lax).

### 5. 5.4.11 (`5-4-flappy-9-challenges-make-it-yours`) r1: the new alternative fires on a refactor
`(?<![\w$.])(?!score\b)NAME\s*=(?!=)[^;\n]*\bscore\b` matches `const label = 'score: ' + score;`. A student who only tidies the starter's `text('score: ' + score, ...)` gets 1/1 with no challenge written (and `let s = score;` unused also passes, accepted). It also refuses compound assignment: `sp += score` and `half -= score` are 0/1. Fix r1 (tested): exclude quotes and allow `+= -= *= /=`; only the last alternative changes:

    ...|(?<![\w$.])(?!score\b)[A-Za-z_$][\w$]*(?:\.[\w$]+)*\s*[-+*/]?=(?!=)[^;\n'"`]*\bscore\b

Must start failing: the `const label = 'score: ' + score` refactor. Must keep passing: ref, `top.vel.x = -(2 + score)`, `-2 - score`, `const sp = 2 + score`, `sp += score`, `half -= score`, `sp = sp + score`, `best = score > best ? score : best`, `best = Math.max(best, score)`, two `random(` calls, `if (score > best) best = score` in `endRound()`. Starter 0 (the starter has `text('score: ' + score ...)` and no assignment).

### 6. 5.4.6 (`5-4-flappy-5-lab-pipes-that-come-and-go`) r2/r3: both cross a closing brace
Same family as 5.2.4 r2/r4 before round 2. Both are 3/3:

    if (frameCount % 90 === 0) { }
    pipes.push(makePipe());                       // a pipe EVERY frame, 3/3

    if (true) { pipes[i].mate.delete(); pipes[i].delete(); pipes.splice(i, 1); }   // every pipe killed at once, no x test, 3/3
    (or the three lines with no `if` at all)

The lab's concept is "on the beat" and "off the left edge". Neither survives.

Fix r2 (push must be inside the beat's body; `&& extra` after the beat now allowed, which is also an honest-answer refusal today):

    frameCount\s*%\s*\w+\s*===?\s*0[^{};]*\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?|[^{};]*?)pipes\.push\s*\(

Fix r3 (the removal sits under an `if` that tests `.x`):

    \bif\s*\((?=[^{}]*(?:\.x\b[^{}]*<|>[^{}]*\.x\b))[^{}]*\)\s*\{?[\s\S]{0,250}?(?:\.delete\s*\(\s*\)[\s\S]{0,120}?pipes\.splice\s*\(|pipes\.splice\s*\([\s\S]{0,120}?\.delete\s*\(\s*\))

Must start failing: empty beat then push (2/3, r2), `if (true)` removal, no-test removal, `if (pipes[i].y < 9999)` removal (2/3, r3). Must keep passing (3/3): ref, `pipes.length < 4 && frameCount % 90 === 0`, `frameCount % 90 === 0 && pipes.length < 4` (today 2/3), brace-less push, two-line `const p = makePipe(); pipes.push(p)`, `frameCount % GAP === 0`, `pipes[i].x + 25 < 0`, `-30 > pipes[i].x`, `<= -30`, `const p = pipes[i]` form, forward loop with `i--`, splice-then-delete, Allman brace. Starter 0. Not covered by either: a helper `spawn()` that does the push (refused today, still refused; low). Step 3 of the lab (draw `pipes.length`) is ungraded.

### 7. 5.3.7 (`5-3-pinball-6-lab-score-one-point-per-touch`) r2: crosses the brace, so `score += 1` every frame passes
3/3:

    const touching = ball.colliding(goal);
    if (touching && !wasTouching) { }
    score += 1;                                  // climbs every frame the ball touches, and every frame regardless
    wasTouching = touching;

The lookalike `if (touching) { score += 1; }` after an empty edge test is 3/3 too (round 2 left it as deliberate-only). The lesson's whole point is the edge versus the level, so a flat `score += 1` scoring 3/3 is worth the one-line fix. Both of r2's alternatives get the same swap: replace `\{?[\s\S]{0,80}?score` with `(?:\{(?:[^{}]|\{[^{}]*\})*?|[^{};]*?)score`:

    if\s*\(\s*(?:[\w.]+(?:\([^()]*\))?(?:\s*===?\s*true)?\s*&&\s*(?:!\s*[\w.]+|[\w.]+\s*===?\s*false)|(?:!\s*[\w.]+|[\w.]+\s*===?\s*false)\s*&&\s*[\w.]+(?:\([^()]*\))?(?:\s*===?\s*true)?)\s*\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?|[^{};]*?)score\s*(?:\+=|\+\+|=\s*score\s*\+)|if\s*\(\s*(?:[\w.]+(?:\([^()]*\))?(?:\s*===?\s*true)?|(?:!\s*[\w.]+|[\w.]+\s*===?\s*false))\s*\)\s*\{?\s*if\s*\(\s*(?:(?:!\s*[\w.]+|[\w.]+\s*===?\s*false)|[\w.]+(?:\([^()]*\))?(?:\s*===?\s*true)?)\s*\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?|[^{};]*?)score\s*(?:\+=|\+\+|=\s*score\s*\+)

Must start failing (2/3): empty `if` then `score += 1`, empty `if` then `if (touching) { score += 1; }`. Must keep passing (3/3): ref, brace-less `score++`, swapped `!wasTouching && touching` with `score = score + 1`, nested `if (touching) { if (!wasTouching) {..} }`, `goal.colliding(ball)`, `ball.colliding(goal) > 0`, `wasTouching === false`. Starter 0.

### 8. 5.5.4 (`5-5-snake-4-lab-steer-it`) r2: two guards out of four pass
With `up` and `left` guarded and `down` and `right` unguarded, the lab scores 3/3. Round 2 recorded this as "all four guarded", but r2 checks one `dy` guard and one `dx` guard anywhere in the file, not per key. A snake that U-turns on down/right is the exact bug step 2 exists to prevent. Fix r2: four per-key lookaheads, one block per key, anchored at `^`. Block for `up` written out in full, repeat it for `down` (dy), `left` (dx), `right` (dx):

    ^(?=[\s\S]*(?:kb\.press\w*\s*\(\s*['"]up['"]\s*\)\s*&&\s*dy\s*(?:===?\s*0|!==?\s*-?\s*1)\b|kb\.press\w*\s*\(\s*['"]up['"]\s*\)\s*\)\s*\{\s*if\s*\(\s*dy\s*(?:===?\s*0|!==?\s*-?\s*1)\b|\bdy\s*(?:===?\s*0|!==?\s*-?\s*1)\b\s*&&\s*kb\.press\w*\s*\(\s*['"]up['"]\s*\)|\bif\s*\(\s*dy\s*===?\s*0\s*\)\s*\{?\s*(?:if\s*\(\s*)?kb\.press\w*\s*\(\s*['"]up['"]\s*\)))(?=...down/dy...)(?=...left/dx...)(?=...right/dx...)

Must start failing (2/3): only up+left guarded, only vertical guarded, none guarded. Must keep passing (3/3): ref, `dy !== 1` style, nested `if (kb.presses('up')) { if (dy === 0) {..} }` (3/3 under the fix, 2/3 today: honest refusal, see Refused 6), else-if chain, `pressing()`, guard written first, double quotes. Starter 0.

---------------------------------------------------------------------
## New findings: honest taught answers refused

1. **5.5.6 r4 (medium).** Refused today: `let ate = false; if (col === food.col && row === food.row) { ate = true; } if (ate) {..} else {pop}` (the 5.3.7 `wasTouching` pattern, flag set in an `if`), `if ((col === food.col) && (row === food.row)) {..}` (parenthesised comparisons), `if (!(col === food.col && row === food.row)) { pop } else {..}`, `const ate =\n col === food.col && ...;` (initialiser wrapped on a second line). All 3/4 now, 4/4 with the Gameable 4 pattern. The helper form `if (atFood(col, row))` is refused before and after (the condition never names `food`); low.
2. **5.2.14 wind zone r3 (new this round, low-medium).** `const lift = -3; ... player.applyForce(0, lift);` and `const WIND = -3` at the top are refused (2/3). Named constants are house style in 5.5 (`const CELL`, `BEAT`). Add one alternative (tested; downward `+3`, a named positive, untouched all stay failing; ref and `-0.5` still pass):

       ...|\b(\w+)\s*=\s*-\s*[\d.][^;\n]*[;\n][\s\S]*?\.applyForce\s*\(\s*[^,()]*,\s*\1\s*\)

   The same named-constant refusal appears in four other labs, all 1 or 2 cards: 5.4.4 (`const FLAP = -4; bird.vel.y = FLAP` is 1/3), 5.3.4 r3 (`const BOUNCE = 0.8; ball.bounciness = BOUNCE` is 3/4), 5.2.4 r1/r2 (`const BEAT = 30; frameCount % BEAT === 0`, 3/5), and 5.2.14 above. 5.4.6 `frameCount % GAP` passes because that pattern is `\w+`.
3. **5.2.16 r2.** `Math.pow(.., 0.5)`, p5 `sqrt()`, a squared-distance compare (`dx*dx + dy*dy < 625`) and a `Math.sqrt(` whose arguments wrap onto the next line are 3/4. None is taught in 5.2.16 except `Math.sqrt`, `** 0.5`, `hypot`, `dist`, `distanceTo`; the wrapped-line form is the only plausible one. Low. (`Math.pow(dx,2) + Math.pow(dy,2)` inside `Math.sqrt` passes under the proposed pattern.)
4. **5.5.11 r1 (low).** The lab names `beat`, `best`, `turnX`, `turnY`, and all taught forms pass, but `beat *= 0.9`, `beat = floor(beat * 0.9)`, `beat = 8 - score` (without `max`), `best = score > best ? score : best` (ternary) are 0/1, and a differently named variable (`speed`, `highScore`, `bestScore`) is 0/1. The names are in the instructions, so only the three arithmetic forms are worth adding: `\bbeat\s*\*=|\bbeat\s*=\s*(?:Math\.)?(?:floor|round|ceil)\s*\(` and `\bbest\s*=\s*score\s*>\s*best`. Optional, 0-point lab.
5. **5.4.8 r2 (low).** `if (hit) { endRound(); }` with the flag set inside a helper more than 160 characters away is 5/6. Not a taught shape until 5.4.11's starter, so leave.
6. **5.5.4 r2.** The nested `if (kb.presses('up')) { if (dy === 0) { .. } }` is refused today (2/3), the per-key pattern above accepts it. r1 refuses `kb.presses('w')` (WASD) and `'ArrowUp'`: the instruction says "arrow key", so not a defect.
7. **`5-2-5-lab-add-a-jump` r3 (low).** `const onGround = player.colliding(ground); if (kb.presses(' ') && onGround)` and nested `if (kb.presses(' ')) { if (player.colliding(ground)) {..} }` are 3/4; the description says "joined with `&&`", so the nested one is by-spec. Leave.
8. **5.3.4 r3 (low).** `bounciness = .75` (no leading zero) and `0.5` itself: the description says "above 0.5" yet `0.5` passes (`0\.[5-9]`). Cosmetic mismatch.
9. **5.2.3 (`5-2-random-3`) (low).** `int(random(1, 7))`, `ceil(random(6))`, `coin.pos = {x, y}` are refused; none is taught. Fine. Honest taught shapes all pass: `random(width)`, `random(colors)` (p5 array form), `Math.random() * 400`, `floor(Math.random() * colors.length)`, `coin.position.x`, `x`/`y` through a variable, `floor(random(0, colors.length))`.

---------------------------------------------------------------------
## Honest-answer sweeps re-run (no refusal found)

Each was run as named passing cases; "not found" below means the case passed.

- 5.2.4 beat and one-shot: brace-less `on = !on` / `message =`, `if (on) {on = false} else {on = true}`, nested flip, double quotes, no semicolons, `frameCount%30==0` spacing, `(frameCount % 30) === 0`, `5 * 60`, extra statements: 5/5. Refused (known, low): `const BEAT = 30` (3/5) and `on = on ? false : true` (4/5).
- 5.2.13 pinball scene bounciness 0.8, .85, 1: pass.
- 5.4.4 flap with `kb.presses('space')`: pass (named `FLAP` const refused, above).
- 5.4.8 honest shapes: early-return gate, `if (!playing) {} else {}` gate, `if (playing === true)`, flap outside the gate, `p.colliding(bird)`, `pipes.length = 0`, `reset()` function, game over drawn in `draw()` instead of `drawTop()`, `forEach` freeze: all 6/6.
- 5.5.8 (`5-5-snake-8-lab-dont-bite-yourself`): index loop, found-flag `isBody`, flag with `break`, isBody first in a long condition, separate `if (isBody)`, `do { } while (isBody(...))`: all 3/3. Refused: `endRound()` helper for `playing = false` (2/3, low). Gamed (low, deliberate): `isBody` that is an empty loop plus `return true` is 3/3.
- 5.4.7 (`5-4-flappy-6`): not re-swept beyond the reference and starter (both correct).

---------------------------------------------------------------------
## Not tested (so not "none found")

- AI-graded plan / playtest screens (lax by design, not attacked).
- 5.3.8 (`5-3-pinball-7`) only the reference and starter ran; round 2's looseness list for it stands.
- 5.2.11 (reading/quiz screens), 5.2.14 `vel vs applyForce` challenges, 5.2.20 beyond the padding cases, all semicolon-free style outside 5.2.4 and 5.2.16.
- The proposed patterns were verified in the Node grader. They were not re-run in the browser, and 5.3.10 / 5.5.4 / 5.4.6 / 5.3.7 cheats were node-only (the two browser confirmations are 5.4.8 pipes-not-frozen and 5.5.6 `if (food)`).
- `scripts/test-grader-tolerance.mjs` was not edited (read-only brief); the accept/reject cases above are ready to move in if the patterns are taken.

---------------------------------------------------------------------
## Verdict per module

- **5.2: clean, one real gap.** The 5.2.16 `Math.sqrt(1)` attack is blocked, but its fix opened a wider hole: any parenthesised assignment compared with `<` passes (`const n = (frameCount); if (n < 25)` is 4/4). Gap: 5.2.16 r2 (Gameable 1, tested fix). Smaller: the named-constant refusal (`const lift = -3`) in the wind zone, 5.2.20 padding left as accepted.
- **5.3: biggest gap is 5.3.7 r2** (`score += 1` every frame after an empty `if` is 3/3, the exact edge-versus-level mistake the lesson teaches against; Gameable 7, tested fix). 5.3.10's unread flag is blocked but an empty `if (playing) { }` still reads it (Gameable 2). 5.3.4 fine.
- **5.4: biggest gap is 5.4.8 r4**: the freeze of the pipes is never graded because the starter's `bird.vel.x = 0` satisfies the lookahead (browser-confirmed 6/6 with the pipes still moving; Gameable 3). Next: 5.4.6 r2/r3 cross a closing brace (a pipe every frame and a pipe deleted instantly are 3/3), 5.4.11 passes on a pure refactor. The spawn-outside-gate and empty-gate attacks are blocked.
- **5.5 Snake: biggest gap is 5.5.6 r4 in both directions.** `if (food) {..} else {pop}` is 4/4 (browser-confirmed, a snake that grows and scores every step), while four honest forms are refused (`let ate = false` set inside an `if`, parenthesised comparisons, `!(...)`, a wrapped initialiser). One pattern fixes both. 5.5.4 r2 accepts two guards of four. 5.5.11 `BEAT` is fixed.

Evidence: harness and case files are in the session scratchpad (`bat.js`, `lib.py`, `s*.py` attack/accept lists, `p*.py` the verified proposals), not in the repo. Every full pattern needed is inlined above. The browser session `r3-advanced` is closed.
