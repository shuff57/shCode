# Advanced lens, final pass (commit 51139eb7)

Run 2026-10-30. Scope: the round 6-7 grader patches and the three 5.8-era labs that no lens has seen. Real grader (`gradeWithTests`, `lib/run-tests-node.ts` bundled with esbuild from the committed tree). Earlier cheats re-run unchanged; honest shapes written fresh. Appended as results come in.

Policy applied: labs lax. Flagged only: concept-skipping cheats that score full, and refused honest taught answers.

Harness (all in the session scratchpad, not the repo): `esbuild lib/run-tests-node.ts --bundle` from the committed tree, then `.../scratchpad/f/` holds copies of the earlier r4 to r8 cheat and honest files re-pointed at the new bundle (`f/r4` .. `f/r8`) and the fresh per-lab files `f/fin/n*.cjs` (every case is also run with the clarifying-parentheses mutation from `scripts/audit-grader-tolerance.mjs`, "P" twins). About 2,600 case-runs in total.

## Verdict in four lines

- **Earlier cheats: none got through.** Every cheat that failed in rounds 4 to 7 still fails on the committed graders. Starters score 0 and every `solution.js` scores full on all 15 graders. The 5.8 labs (5.8.8, 5.8.16, 5.8.18) re-run their 134 round-8 cases with 0 deviations.
- **Honest taught shapes: 4 refusals found, each with a verified one-line patch** (5.2.4 ternary flip, 5.4.8 flag after the freeze loop, 5.8.18 two-step filter, 5.2.18 named constant or parenthesised number).
- **Concept-skipping cheats: 6 still score full**, all the same family (a required construct is present but empty, unused or unrelated). Each has a verified patch below that fixes the cheat and breaks none of ~1,400 honest and cheat cases.
- **Backtracking: nothing exponential.** Two patterns are super-linear, 5.4.7 r3 (1.9 s on 5000 characters) and 5.4.4 r3 (0.5 s). Both drop to under 50 ms with the same one-token bound.

## (1a) Earlier cheats re-run against the real grader

| Check | Result |
| --- | --- |
| Round-7 harness (7 scripts, 428 cases incl. paren twins: 5.2.4, 5.3.7 x2, 5.3.10, 5.4.7, 5.4.8, 5.5.8) vs the recorded post-round-7 run | **0 cases changed.** Same pass/fail set per requirement. |
| Same 428 cases vs the recorded pre-round-7 (post-round-6) run | **1 case changed**: `if ((touching) && (!wasTouching))` on 5.3.7 now passes r2. That is the intended paren widening, not a loosened cheat. |
| Round-5/6 proposals (5.3.8 r3, 5.4.4 r1/r3, 5.2.18 r4, 5.2.10 r3, 5.4.6, 5.4.7, 5.5.6; 9 script/patch pairs) vs the committed graders | **Identical output** on all 9. The committed round-6 patterns behave exactly as the ones I verified. |
| Round-8 harness for 5.8.8, 5.8.16, 5.8.18 (134 cases) | **0 deviations** |

Cheats that were accepted before and are still accepted (known residuals, unchanged; not new): 5.3.8 `||` / assignment-in-condition / `|| true` / memory-before-test (the lab's graded point is `worth`, r3); 5.2.10 `|| true`, negated ground, ground test only in a string, declared-but-unused guard variable; 5.3.7 unused `touching`; 5.3.10 `if (playing) {;}`, `ball.y > 0`, flag started false by the reset line; 5.4.8 `crashed = true` while the gate reads `playing`; 5.2.7/5.2.8 `10 + 0`, `5 + 5`, the value in a string.

One new wrinkle in the round-7 paren work: **5.2.4 r5 was not widened.** `if ((on)) { if (frameCount === 70) ...` passes r5, while the plain nested form fails it, so the untouched starter with doubled parentheses scores 1/5 there (it is the only requirement on any starter that a mutation moves off zero). Nobody types `if ((on))`, so it is low, but it is the one pattern in the list that did not get the `(?:\(\s*){0,3}` treatment. A verified patch is in the table below ("5.2.4 r5 parens").

### Whole-history check (21b0f12b to HEAD)

To make "none got through" cover rounds 5, 6 and 7 together and not only the last run, I extracted the lessons as they were at 21b0f12b (the round 3-4 commit) with `git archive` and ran every r4 to r8 script plus the fresh files on both trees: 1,268 case-runs each, same order.

- 813 identical; 423 where some requirement went from failing to passing; 32 where one got stricter.
- Of the 423, every plain (non-paren) case that flipped is an honest-labelled shape, apart from one cheat that fails fewer requirements but still fails (5.8.8 "compare-only, no assignment of the subtraction": r1,r2 then r1).
- The 35 cheat cases that flipped to full are all paren twins ("P ..."), and in 33 of 35 the plain twin already scored full at 21b0f12b and still does, so the mutation now behaves like its plain form. The two exceptions are the 5.2.4 r5 gap above.
- The 19 plain cheats that got stricter include the round-6 target list: 5.2.10 bare `&&` statement, 5.4.4 empty key test then flap, 5.4.4 empty reset if, 5.4.7 five empty-if or flag-before-test shells, 5.3.8 empty if then score, 5.2.18 reset by velocity only, 5.8.16 increment in draw or takeHit, 5.8.8 floor written in `isAlive`.

## (1b) Fresh honest shapes, 8 or more per lab

Each lab got both quotes, `++` / `+= 1` / `= x + 1`, braces and brace-less, named constants, extra parentheses, index and `for...of`, `forEach`, nested ifs, reordered operands, comments and logs between the key lines. "Passed" counts shapes that scored full.

| Lab (display number) | Honest shapes passed / written | Refused |
| --- | --- | --- |
| 5.2.4 beat and one-shot | 13/14 | **ternary flip `on = on ? false : true`** (2.1.22 teaches `?`) |
| 5.2.7 Falling block, 5.2.8 Tune gravity | 21/21 each (values 20, 0, -5, 9.8, .5, 100, 10.5, (20) ...) | none |
| 5.2.10 Add a jump | 12/12 | none |
| 5.2.18 Pinball scene | 19/27 | gravity or bounciness as a named constant, `(10)` / `(0.9)`; statics built in a loop, a helper, or `.collider = 'static'` (see below) |
| 5.3.7 Score per touch | 9/10 | `++score` (pre-increment) |
| 5.3.8 Three bumpers | 11/14 | `while` over the array; redundant parentheses round a plain value (`score += (b.worth)`) |
| 5.3.10 Lose and start again | 15/16 | `ball.position.y > 410` |
| 5.4.4 Make it flap | 17/18 | `kb.presses('up')` (the lab says space; not a finding) |
| 5.4.7 Score a gap | 13/16 | `p.x + 30 < bird.x`, `!== true`, `bird.x - p.x > 0` (none taught) |
| 5.4.8 Crash and restart | 18/20 | **flag set after the freeze loop** (`for (const q of pipes) {...}` first, `playing = false` last) |
| 5.5.8 Don't bite yourself | 13/15 | `segments.some(...)`, `while (true) { ... break }` (neither taught) |
| 5.8.8 takeHit floor | 10/12 | local `let result = this.hp - n; if (result < 0) result = 0; this.hp = result;`; subtracting in a loop |
| 5.8.16 Count spawns | 9/9 | none |
| 5.8.18 Build a wave | 13/14 | **`const alive = enemies.filter(...); enemies = alive;`** |

### Honest answers refused (taught shapes), with verified patches

1. **5.2.4 r2: `on = on ? false : true`.** `?` is taught at 2.1.22. Patch below (adds `on\s*\)?\s*\?` beside `!on|true|false`).
2. **5.4.8 r2: flag set after the freeze loop.** The step order in the file is flag, then freeze, but the reverse is natural. Cause is the 160-character cap between `bird.colliding(` and `playing = false`; the loop pushes it to about 190. Patch raises the cap to 320.
3. **5.8.18 r4: two-step filter.** `const alive = enemies.filter((e) => e.isAlive()); enemies = alive;` is refused because r4 wants `enemies = enemies.filter`. Patch adds the two-step form.
4. **5.2.18 r1/r3: a named constant or `(10)`.** Every other graded number in this unit (5.4.4, 5.2.10) accepts a named constant. Patch loosens r1/r3 the same way. (A named constant holding 0 passes r1; that is lax by policy.)
5. Not patched, low: 5.2.18 r2 refuses statics made in a loop or helper (a regex cannot count loop runs); 5.3.8 r1 `while` over the array; 5.3.7 `++score`; 5.8.8 local-variable form. Say if you want any of these opened up.

## (1c) Concept-skipping cheats that still score full

Same family each time: the graded construct is present but empty, unused, or unrelated to the thing it should gate.

| # | Lab | Minimum passing input | Prints / does | Score | Cause |
| --- | --- | --- | --- | --- | --- |
| A | 5.2.10 r3 | `if (kb.presses(' ') && player.colliding(ground)) { }` then an unconditional `player.vel.y = -7;` | player rockets upward every frame | 4/4 | r3 only checks that the guard text exists, not that it has a body |
| B | 5.3.7 r3 | `if (touching && !wasTouching) { score += 1; wasTouching = touching; }` (memory update inside the `if`) | scores once ever; pressing R never scores again | 3/3 | This is the exact wrong shape 5.3.5's "Try this" tells the student to avoid. r3 accepts the assignment anywhere. |
| C | 5.3.8 r1 | `for (const b of bumpers) { }` then explicit logic on `bumpers[0]` | only the first bumper scores | 3/3 | empty loop shell satisfies r1 |
| D | 5.5.8 r1 | `function isBody(col,row){ for (const s of segments) { } return true; }` or `for (const s of segments) { return true; }` | every cell counts as body; snake dies on the first step | 3/3 | r1 only needs `for (... segments ...)` then `return true` within 200 characters |
| D2 | 5.5.8 r3 | `while (isBody(col, row)) { }` (empty) or `{ break; }` | food may still spawn on the snake (or the page hangs on the empty one if the cell is body) | 3/3 | r3 matches the `while` header only |
| E | 5.8.8 r2 | `this.hp -= n; const z = Math.max(0, n);` | hp goes negative | 2/2 | the `max(0, ...)` alternative is not tied to `this.hp` |
| F | 5.8.18 r1/r2 | `if (enemies.length === 0 && frameCount % 90 === 0) { }` then an unconditional `enemies.push(new Enemy(90, 100));` | a new enemy every frame | 4/4 | r1 and r2 are presence checks; nothing ties the test to the push |

Calibration: C, D2 and F are low (a student who writes them sees the game misbehave). A, B and E are the ones where a student can walk past the exercise with the lab's own words; B is the most pointed because the course names the shape as wrong and the grader passes it.

## Patches (all verified)

Each patch was run over every case in this pass (about 1,400 case-runs including paren twins) and over the round 4 to 8 harness files for the same lessons. **The only cases whose result changed are the ones listed after it.** Untouched starters stay at 0 and every `solution.js` stays full, because those are cases in each file. Patches file for scripted apply: `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/f/fin/patches.json` (same strings, JSON-escaped; keyed by lesson directory then requirement id).

| Patch | Starts failing (the cheat) | Starts passing (the honest answer) | Must still pass (kept) |
| --- | --- | --- | --- |
| 5.2.10 r3 non-empty guard body | A: empty body then unconditional jump (also the "jump every frame, guard in unrelated if" variant) | n/a | solution; swapped operands; `w`/`up` keys; brace-less; `const onGround = ...` then `&&`; named `JUMP`; 3-term `&&`; extra `else` |
| 5.3.7 r3 memory not in the scoring braces | B | n/a | solution; brace-less `if (...) score += 1;` then `wasTouching = touching;`; nested ifs; `score++`; `=== false`; any memory name; `let`; parenthesised |
| 5.3.8 r1 non-empty loop body | C | n/a | solution; index loop; `const b = bumpers[i]`; `forEach`; brace-less compound; `for...of` with other names |
| 5.5.8 r1/r3 | D, D2 (empty loop, `return true` with no `if`, empty while, break-only while) | n/a | solution; index loop; `found` flag with and without `break`; nested ifs; swapped operands; `==`; separate ifs in `step`; `isBody(...) === true`; `do...while` (still passes through r3's `while` header) |
| 5.8.8 r2 `max` feeds `this.hp` | E | n/a | solution; `Math.max(0, hp - n)`, `Math.max(hp - n, 0)`, p5 `max`, `-=` then `Math.max(this.hp, 0)`, `constrain`, ternary forms, if/else forms, `!isAlive` guard |
| 5.8.18 r1/r2 test inside an `if` with a body (or a variable) | F | n/a | solution; nested ifs; `== 0`; `!enemies.length`; `< 1`; `(frameCount % 90) === 0`; named `WAVE_GAP`; three-argument push |
| 5.8.18 r4 two-step filter | n/a | `const alive = enemies.filter(...); enemies = alive;` | solution; `function (e)` form; `e => e.hp > 0`; block-body arrow; `=== true` |
| 5.2.4 r2 ternary | n/a | `on = on ? false : true` | solution; if/else true/false; brace-less; `on === true` form; `==`; `(frameCount % 30) === 0`; named `BEAT` |
| 5.4.8 r2 cap 160 to 320 | n/a | flag set after the freeze loop | solution; early return; if/else gate; `p.colliding(bird)`; both-orders `||`; two separate ifs; `gameOver`/`running` flags |
| 5.2.18 r1/r3 | n/a | named constant and `(10)` / `(0.9)` | solution; `9.8`, `.5`, `-10`; bounciness `1`, `.85`; gravity `0` and bounciness `0.5` still fail |
| 5.2.4 r5 parens | `if ((on)) { if (frameCount === 70) ...` (starter, doubled parentheses) goes 1/5 to 0/5 | n/a | plain nested and `&&` cheats still fail r5; solution, `==`, moved or removed Almost line pass |
| 5.4.7 r3 / 5.4.4 r1, r3 bound `[^{};]*` to `{0,200}` | n/a | n/a | no case changes; timing only (next section) |

The 5.3.7 patch uses a variable-length lookbehind (`(?<!\bif\s*\([^{}]*\)\s*\{[^{}]*\bscore\b[^{}]*)`), which the grader's JavaScript engine supports; the browser grader runs the same V8/JS regexp engine, but it is the one patch worth a browser spot-check before merging.

Patterns (unescaped, as they go into the `pattern` field after JSON-escaping):

#### 5-2-5-lab-add-a-jump r3

```
\b(?:if|while)\s*\([^{};]*?(?:kb\.presses\s*\([^)]*\)\s*\)?\s*&&[^{};]*?\.colliding\s*\(|\.colliding\s*\([^)]*\)\s*\)?\s*&&[^{};]*?kb\.presses\s*\()(?=[^{};]*\)\s*(?:\{\s*[^}\s]|[^{\s;)]))|(?:const|let|var)\s+\w+\s*=[^{};]*?(?:kb\.presses\s*\([^)]*\)\s*\)?\s*&&[^{};]*?\.colliding\s*\(|\.colliding\s*\([^)]*\)\s*\)?\s*&&[^{};]*?kb\.presses\s*\()|(?:(?:const|let|var)\s+)?(\w+)\s*=[^;{}]*?\.colliding\s*\([^;{}]*;[\s\S]{0,200}?\b(?:if|while)\s*\([^{};]*?(?:kb\.presses\s*\([^)]*\)\s*\)?\s*&&[^{};]*?\b\1\b|\b\1\b[^{};]*?&&\s*\(?\s*kb\.presses\s*\()
```

#### 5-3-pinball-6-lab-score-one-point-per-touch r3

```
(?:const|let|var)\s+(\w+)\s*=\s*(?:ball\.colliding\s*\(\s*goal|goal\.colliding\s*\(\s*ball)\s*\)[\s\S]*?!\s*(?:\(\s*)?(\w+)[\s\S]*?(?<!\bif\s*\([^{}]*\)\s*\{[^{}]*\bscore\b[^{}]*)\b\2\s*=\s*\1\b(?!\s*[=(.])|(?:const|let|var)\s+(\w+)\s*=\s*(?:ball\.colliding\s*\(\s*goal|goal\.colliding\s*\(\s*ball)\s*\)[\s\S]*?\b(\w+)\s*===?\s*false[\s\S]*?(?<!\bif\s*\([^{}]*\)\s*\{[^{}]*\bscore\b[^{}]*)\b\4\s*=\s*\3\b(?!\s*[=(.])
```

#### 5-3-pinball-7-lab-three-bumpers-three-values r1

```
for\s*\(\s*(?:const|let|var)\s+\w+\s+of\s+bumpers\s*\)\s*(?:\{\s*[^}\s]|[^{\s;])|for\s*\([^;]*;\s*\w+\s*<=?\s*bumpers\.length[^{}]{0,40}?\)\s*(?:\{\s*[^}\s]|[^{\s;)])|bumpers\.forEach\s*\(
```

#### 5-5-snake-8-lab-dont-bite-yourself r1

```
for\s*\([^)]*\bsegments\b[^)]*\)[\s\S]{0,200}?\bif\s*\([^{};]*\)[^;]{0,120}?return\s+true|for\s*\([^)]*\bsegments\b[^)]*\)[\s\S]{0,200}?\bif\s*\([^{};]*\)[^;]{0,120}?(?<![\w.$])(\w+)\s*=\s*true\b[\s\S]{0,200}?return\s+\1\b
```

#### 5-5-snake-8-lab-dont-bite-yourself r3

```
while\s*\(\s*(?:\(\s*){0,3}isBody\s*\([^)]*\)[^{]*?(?:\{[^}]*?|[^{;]*?)(?<![\w$.=!<>])\w+\s*=(?!=)
```

#### 5-5-8-lab-takehit-floor r2

```
takeHit\s*\([^)]*\)\s*\{(?:(?!\b(?!(?:if|while|for|switch|catch|function|return)\b)[A-Za-z_$][\w$]*\s*\([^()]*\)\s*\{)[\s\S])*?(?:(?:this\.hp\b[^;{}=]*?[<>]|[<>]=?\s*\(?\s*this\.hp\b|!\s*\(?\s*this\.isAlive\b|this\.isAlive\s*\(\s*\)\s*\)?\s*===?\s*false)(?:(?!\b(?!(?:if|while|for|switch|catch|function|return)\b)[A-Za-z_$][\w$]*\s*\([^()]*\)\s*\{)[\s\S])*?this\.hp\s*=\s*\(?\s*0(?![\w.])|this\.hp\s*=(?!=)[^;{}?]*\?\s*(?:\(?\s*0\s*\)?\s*:|[^;{}:]*:\s*\(?\s*0(?![\w.]))|this\.hp\s*=(?!=)[^;{}]*?\b(?:max|constrain)\s*\(\s*(?:0\s*,|[^;]*?,\s*\(?\s*0\s*\)?\s*[,)]))
```

#### 5-4-flappy-7-lab-crash-and-start-again r2

```
(?:bird\.colliding\s*\(|\.colliding\s*\(\s*bird\b)[\s\S]{0,320}?(?<![\w.$])\w+\s*=\s*(?:false|true)\b
```

#### 5-2-random-4-lab-beat-and-one-shot r2

```
frameCount\s*%\s*(?:\d+|[A-Za-z_$][\w$]*)\s*\)?\s*===?\s*0\s*\)(?:\s*\)){0,3}\s*(?:\{(?:[^{}]|\{[^{}]*\})*?\bon\s*=\s*\(?\s*(?:!\s*\(?\s*on|true|false|on\s*\)?\s*\?)|\{\s*if\s*\([^)]*\)(?:\s*\)){0,3}\s*\{?[^{}]*?\bon\s*=\s*\(?\s*(?:!\s*\(?\s*on|true|false|on\s*\)?\s*\?)|[^{};]*?\bon\s*=\s*\(?\s*(?:!\s*\(?\s*on|true|false|on\s*\)?\s*\?))
```

#### 5-2-random-4-lab-beat-and-one-shot r5

```
^(?![\s\S]*(?:if\s*\(\s*(?:\(\s*){0,3}on\s*(?:===?\s*true\s*)?(?:\)\s*){1,4}\{[^}]*frameCount\s*===?\s*70|\bon\s*\)?\s*&&\s*\(?\s*frameCount\s*===?\s*70|frameCount\s*===?\s*70\s*\)?\s*&&\s*\(?\s*on\b))[\s\S]*frameCount\s*===?\s*70
```

#### 5-4-flappy-6-lab-score-a-gap r3

```
\bif\s*\((?=[^{};]{0,200}\.passed\b)[^{};]{0,200}\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?(?:\{(?:[^{}]|\{[^{}]*\})*?)?|[^{};]{0,200}?)(?:(?:score\s*(?:\+=\s*1\b|\+\+|=\s*score\s*\+\s*1\b)|\+\+\s*score)[^{}]{0,60}?\w+(?:\[\w+\])?\.passed\s*=\s*true|\w+(?:\[\w+\])?\.passed\s*=\s*true[^{}]{0,60}?(?:score\s*(?:\+=\s*1\b|\+\+|=\s*score\s*\+\s*1\b)|\+\+\s*score))
```

#### 5-4-flappy-3-lab-make-it-flap r3

```
bird\.(?:pos\.)?y\s*(?:>=?|<=?)\s*(?:\d+|height)[^{};]{0,200}\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?(?:\{(?:[^{}]|\{[^{}]*\})*?)?|[^{};]{0,200}?)bird\.(?:pos\.)?y\s*=\s*(?:\d+|height\s*\/\s*2|[A-Za-z_$][\w$]*\s*[;\n}])
```

#### 5-4-flappy-3-lab-make-it-flap r1

```
kb\.presses\s*\(\s*(['"])(?: |space)\1\s*\)[^{};]{0,200}?\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?(?:\{(?:[^{}]|\{[^{}]*\})*?)?|[^{};]{0,200}?)bird\.vel\.y\s*=\s*(?:-\s*[\w.(]|[A-Za-z_$][\w$]*\s*[;\n}])
```

#### 5-5-18-lab-wave-spawner r1

```
\bif\s*\([^{};]*?(?:frameCount\s*%\s*\(?\s*(?:\d+|[A-Za-z_$][\w$]*)\s*\)?\s*\)?\s*===?\s*0(?![\w.])|(?<![\w.])0\s*===?\s*\(?\s*frameCount\s*%)(?=[^{};]*\)\s*(?:\{\s*[^}\s]|[^{\s;)]))|(?:const|let|var)\s+\w+\s*=[^;{}]*?(?:frameCount\s*%\s*\(?\s*(?:\d+|[A-Za-z_$][\w$]*)\s*\)?\s*\)?\s*===?\s*0(?![\w.])|(?<![\w.])0\s*===?\s*\(?\s*frameCount\s*%)
```

#### 5-5-18-lab-wave-spawner r2

```
\bif\s*\([^{};]*?(?:enemies\.length\s*\)?\s*(?:===?\s*0(?![\w.])|<\s*1(?![\w.])|<=\s*0(?![\w.]))|(?<![\w.])0\s*===?\s*\(?\s*enemies\.length\b|!\s*\(?\s*enemies\.length\b)(?=[^{};]*\)\s*(?:\{\s*[^}\s]|[^{\s;)]))|(?:const|let|var)\s+\w+\s*=[^;{}]*?(?:enemies\.length\s*\)?\s*(?:===?\s*0(?![\w.])|<\s*1(?![\w.])|<=\s*0(?![\w.]))|(?<![\w.])0\s*===?\s*\(?\s*enemies\.length\b|!\s*\(?\s*enemies\.length\b)
```

#### 5-5-18-lab-wave-spawner r4

```
enemies\s*=\s*enemies\s*\.\s*filter\s*\([\s\S]{0,120}?(?:isAlive\s*\(\s*\)|\bhp\s*\)?\s*(?:>\s*0(?![\w.])|>=\s*1(?![\w.])|!==?\s*0(?![\w.]))|(?<![\w.])0\s*(?:<|!==?)\s*\(?\s*(?:\w+\.)?hp\b)|(?:const|let|var)\s+(\w+)\s*=\s*enemies\s*\.\s*filter\s*\([\s\S]{0,120}?(?:isAlive\s*\(\s*\)|\bhp\s*\)?\s*(?:>\s*0(?![\w.])|>=\s*1(?![\w.])|!==?\s*0(?![\w.]))|(?<![\w.])0\s*(?:<|!==?)\s*\(?\s*(?:\w+\.)?hp\b)[\s\S]{0,200}?\benemies\s*=\s*\1\b
```

#### 5-2-13-a5-2-1-pinball-scene r1

```
world\.gravity\.y\s*=\s*(?:\(\s*)?(?:-?(?:[1-9]|0?\.\d*[1-9])|[A-Za-z_$][\w$]*\s*[;\n)])
```

#### 5-2-13-a5-2-1-pinball-scene r3

```
\.bounciness\s*=\s*(?:\(\s*)?(?:1(?:\.0+)?\b|0?\.[89]|[A-Za-z_$][\w$]*\s*[;\n)])
```


## (2) Backtracking on 5000-character adversarial input

Method: for every graded requirement of the 15 graders (the round 6 and 7 patterns plus the three 5.8 labs; 15 lessons, 52 requirements), build 5000-character inputs from the lesson's own tokens: each of up to 90 code windows from the solution and starter (`if (`, `bird.colliding(...)`, `kb.presses(' ')`, `this.hp -= n`, ...) crossed with 14 junk fillers (`) `, `{ `, `} `, `&& `, `|| `, `) ) `, newline plus indent, ...), three ways each (repeated, once then filler, opened `if (` then filler), plus 30 x 30 window pairs. That is 450 to 3,600 inputs per lesson, each timed per requirement through `gradeWithTests`. Then scaling runs at 2,500, 5,000 and 10,000 characters on the slow ones.

| Pattern | Worst on 5000 chars (committed) | Growth | After the bound patch |
| --- | --- | --- | --- |
| 5.4.7 r3 (`score` and `passed` in an `if`) | **1.9 s** on `if (p.x < bird.x && !p.passed)` plus `) ) ) ...` | polynomial: 85 ms at 2,500, 0.5 s at 5,000, 1.2 s at 10,000 (single `if`), worse with many `if`s | 34 ms |
| 5.4.4 r3 (reset in an `if`) | 476 ms on the reset `if` plus `) ) )` | polynomial, 64 ms at 10,000 for the single-`if` shape | 42 ms |
| 5.2.4 r2 (beat flips `on`) | 226 ms at 5,000 (`if (frameCount % 30 === 0)` plus newlines) | about cubic: 49 ms, 226 ms, 1.7 s at 2,500, 5,000, 10,000 | not patched; under 60 ms on every input in the main sweep |
| every other requirement | under 110 ms (typical 5 to 60 ms) | no growth seen | n/a |

No input hung and nothing is exponential. The two slow patterns have unbounded `[^{};]*` gaps stacked behind another unbounded gap; the patch is the same one-token bound 5.4.4 r1 already uses (`[^{};]{0,200}`). The patched patterns are in the table above (rows "5.4.7 r3 / 5.4.4 r1, r3"); no honest or cheat case changes result. Real student files are 1 to 4 KB with a handful of `if`s, so none of this is reachable in normal use; it matters only if the grader runs on the page's main thread and someone pastes a large file.

## (3) AI rubrics

Skipped as instructed. I saw no reason to re-run them: this pass touched no AI screen, and `ai-graders-live.md` already holds the live prompt-injection and off-topic runs.

## Housekeeping

- No repo edits except this file.
- I opened no browser session. `playwright-cli list` shows `codehs` and `f-beginner` open, which belong to other lenses, so I left them alone.
- Everything the numbers came from is re-runnable from `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/f/` (`fin/n*.cjs` fresh files, `fin/patches.cjs` and `patches.json`, `fin/time3.cjs`, `cmpall.cjs`, `hist_old.jsonl` / `hist_new.jsonl`).
