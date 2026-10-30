# Advanced lens, round 5 verification (commit 0d039346)

Run 2026-10-30. Scope: only the graders changed in 0d039346. Real grader (`gradeWithTests`, lib/run-tests-node.ts bundled with esbuild). Honest shapes written fresh. Results appended below as they come in.

## Harness

Bundle: `npx esbuild lib/run-tests-node.ts --bundle --platform=node --format=cjs` from the committed tree (0d039346). Scratch harnesses: `.../scratchpad/r6/` (round-4 cheat files `t*.cjs` re-run unchanged against the new patterns, plus new `h*.cjs` honest-shape files and `c*.cjs` fresh cheats).

## (a) Round-4 cheats and (c) starter / solution

Every round-4 cheat in the re-run files still fails the card it targeted, and every starter is 0, every `solution.js` full.

| Lab | Starter | Solution | Round-4 cheats re-run | Result |
| --- | --- | --- | --- | --- |
| 5.5.6 r2 | 0/4 | 4/4 | pop alone, splice alone, pop then delete head, pop then food.delete, delete another var | all 3/4 (r2) |
| 5.3.8 r3 | 0/3 | 3/3 | level-triggered `if (touching)`, wasTouching = junk, empty edge if then unconditional score, edge if closed then `if (touching)`, assignment-only | all 2/3 (r3) |
| 5.4.4 r1-r3 | 0/3 | 3/3 | empty press then flap, flap every frame, press in other if, wrap test empty, wrap unconditional, FLAP const unconditional | all 2/3 |
| 5.4.6 r1/r2 | 0/3 | 3/3 | push every frame (after empty beat / log / unrelated if / nested closed), no beat at all | 2/3 (r2) or 1/3 |
| 5.4.6 r3 | | | remove all, no-if, `if(true)`, `y < 9999`, empty if then removal, delete only, splice only, split ifs | all 2/3 (r3) |
| 5.4.7 r3 | 0/3 | 3/3 | empty if then score+flag, flag first then test, `const t = ...` then unguarded score, log-only if | all 2/3 (r3) |
| 5.2.10 r3 | 0/4 | 4/4 | `&& true` with colliding elsewhere, `&& frameCount > 0` with empty colliding if, onGround declared but unused, empty-if shells | all 3/4 (r3) |
| 5.2.18 r4 | 0/4 | 4/4 | empty press then reposition, press with log, comparison-only, vel-only | all 3/4 (r4) |

Still passing, deliberately (unchanged from round 4): `if (pipes[i].x < 9999)` removal (an x test is present, junk threshold), 5.2.10 `vel.y = JUMP` (named constant).

## Summary

- 451 candidate answers run through the real grader. No round-4 cheat survives. Starters 0, solutions full, on all nine graders.
- No honest taught shape is refused on 5.5.6, 5.3.8, 5.4.6 (r1-r3), 5.4.7, 5.2.18 or 5.2.7/5.2.8 beyond the shapes the course does not teach (listed under "Not taught, not flagged").
- Three things to act on, all low-medium, each with a verified patch below:
  1. **5.2.10 r3** still passes a bare expression with no `if`: `kb.presses(' ') && player.colliding(ground);` then an unconditional `player.vel.y = -7;` is 4/4 and the player jumps every frame, in mid-air. This is the only concept-skip left.
  2. **5.4.4 r1/r3** now refuse a flap or a reset that sits one `if` deeper (`if (kb.presses(' ')) { if (bird.y > 0) { bird.vel.y = -4; } }` is 2/3, r1). The old pattern accepted it, so this is a regression from the brace fix. 5.4.6 already allows one nested level; r1/r3 should copy it.
  3. **5.2.7 / 5.2.8 r1 was not changed**, only the prose. The prose now says "end with a number other than 10", but `world.gravity.y = 10` with no semicolon, `10.0;`, `(10)`, and `20;` followed by `10;` all score 1/1. `.5` is refused (an honest value). 5.2.8 also now says "write one sentence per value as a comment" and nothing grades it.
- Backtracking: nothing exponential. The new nested-brace patterns are **cubic** on brace-free repetition (see Backtracking), up to 6.5 s on 10 000 characters of `bird.y > 400 )` repeated. No honest file comes near it (real files and near-misses of 40 KB run under 1 ms). A one-token bound makes it quadratic (44 ms at 5000).

## (b) Honest shapes written fresh

All run against the real grader with each lab's own `lesson.json`. Counts are shapes that scored full / shapes written. Shapes that are not in the course are listed separately.

| Lab | Honest taught shapes that pass | Refused (not a taught shape) |
| --- | --- | --- |
| 5.5.6 r2 | 14/14 | tail by index then `pop` then `delete` (F9); `splice(-1, 1)[0]` (F14) |
| 5.3.8 r3 | 12/12 | `else`-reset form (F9); read-old-value-first `const was = b.wasTouching` (F10) |
| 5.4.4 r1-r3 | 21/21 after patch (20/21 as committed) | `constrain()`; nested flap, see finding 2 |
| 5.4.6 r1-r3 | 20/20 | `shift()` instead of `splice` (R7); 3-deep nested remove (R12); `!(frameCount % 90)` (F10) |
| 5.4.7 r1-r3 | 14/14 | `continue` guard clause (F14, F16); score guarded by an inner `if` with the flag after it (F15) |
| 5.2.10 r3/r4 | 16/16 | nested ifs (by design, title says `&&`); helper `isOnGround()`; no-semicolon declaration; `let g = false; g = player.colliding(ground)` (F10) |
| 5.2.18 r4 | 15/15 | `resetBall()` helper defined outside `draw` (F11); 3-deep nest (F7) |
| 5.2.7 / 5.2.8 r1 | 14/14 gravity values | `.5` (leading dot) |

Shapes covered per lab include both quotes, `++` / `+= 1` / `= x + 1` / `++x`, braces and brace-less, named constants (`FLAP_SPEED`, `START_Y`, `SPACING`, `JUMP`, `START_X`), index loop, `for...of`, `forEach`, reversed loop, `const p = pipes[i]`, extra statements and `else` branches around the key lines, comments between.

## Findings

### 1. 5.2.10 r3: the && can sit in a statement that gates nothing
Minimum passing input (4/4, prints nothing, jumps every frame):
```
kb.presses(' ') && player.colliding(ground);
player.vel.y = -7;
```
Also 4/4: `const onGround = player.colliding(ground); kb.presses(' ') && onGround; player.vel.y = -7;`, and `while (...)` in place of `if`. Cause: alt 1 and 2 of r3 match `presses ... && ... colliding` anywhere, with no `if (` or declaration in front.
The r4 fix of round 5 (declaration must feed the same condition) closed the dummy-variable cheats but not this one.

Patch (JSON string for `r3` of `lessons/5-2-5-lab-add-a-jump/lesson.json`; saved at `.../scratchpad/r6/p525.json`):
```
(?:\b(?:if|while)\s*\(|(?:const|let|var)\s+\w+\s*=)[^{};]*?(?:kb\.presses\s*\([^)]*\)\s*\)?\s*&&[^{};]*?\.colliding\s*\(|\.colliding\s*\([^)]*\)\s*\)?\s*&&[^{};]*?kb\.presses\s*\()|(?:(?:const|let|var)\s+)?(\w+)\s*=[^;{}]*?\.colliding\s*\([^;{}]*;[\s\S]{0,200}?\b(?:if|while)\s*\([^{};]*?(?:kb\.presses\s*\([^)]*\)\s*\)?\s*&&[^{};]*?\b\1\b|\b\1\b[^{};]*?&&\s*\(?\s*kb\.presses\s*\()
```
Verified with the patch (real grader, 77 cases for this lab):
- Must start failing: the bare-expression cheat, the declared-then-bare `&&` cheat. Both 3/4 (r3).
- Must keep passing: solution 4/4; `const onGround = player.colliding(ground)` then `if (kb.presses(' ') && onGround)` and the swapped order; `onGround` declared at the top of `draw` with the A/D block in between (with and without comments); `onGround` declared as a global and assigned in `draw` (this one the committed pattern **refuses**, patch fixes it); `let onGround = false; onGround = player.colliding(ground);` (also fixed); `const go = presses && colliding; if (go)`; brace-less; `JUMP` constants; `'space'` and `'up'`; three-way `&&`; parenthesised forms.
- Starter 0/4 unchanged.
- Cost: the short-circuit form `presses && colliding && (player.vel.y = -7);` becomes 3/4. The course teaches `if`, so this is accepted. Remaining accepted: `&& (true || player.colliding(ground))`, a string containing `player.colliding(ground)` (both need a deliberate dummy).

### 2. 5.4.4 r1 and r3: one nested `if` under the key press or the range test is refused
`if (kb.presses(' ')) { if (bird.y > 0) { bird.vel.y = -4; } }` is 2/3 (r1 fails). The pre-round-5 pattern accepted it. 5.4.6 r2 already allows the same nesting.

Patch (`p44b.json`; also bounds the leading `[^{};]*` to 200 characters, see Backtracking):
- r1: `kb\.presses\s*\(\s*(['"])(?: |space)\1\s*\)[^{};]{0,200}?\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?(?:\{(?:[^{}]|\{[^{}]*\})*?)?|[^{};]*?)bird\.vel\.y\s*=\s*(?:-\s*[\w.(]|[A-Za-z_$][\w$]*\s*[;\n}])`
- r3: `bird\.(?:pos\.)?y\s*(?:>=?|<=?)\s*(?:\d+|height)[^{};]{0,200}\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?(?:\{(?:[^{}]|\{[^{}]*\})*?)?|[^{};]*?)bird\.(?:pos\.)?y\s*=\s*(?:\d+|height\s*\/\s*2|[A-Za-z_$][\w$]*\s*[;\n}])`

Verified (92 cases for this lab): must keep failing, all 2/3 or worse: empty press then unconditional flap, flap every frame, `kb.presses(' ')` in a different `if`, `{ } else { flap }`, closed `if` then `if (true) { flap }`, nested empty `if` then flap outside, wrap test empty then reset, wrap `{ } else { reset }`, nested empty then reset outside, comment-only body, `FLAP` and `START_Y` unconditional. Must keep passing: solution 3/3; `FLAP_SPEED`, `flapPower`, `START_Y`, `MID` constants; `-4.5`; no semicolon; `&& bird.y > 10`; else branch; else-if wrap chain; the nested-flap case above; starter 0/3.

### 3. 5.2.7 / 5.2.8 r1: pattern unchanged, retyping 10 still passes
Committed pattern `world\.gravity\.y\s*=\s*(?!10\s*;)[-\d(]`. Scores 1/1 for `= 10` (no semicolon), `= 10.0;`, `= 10.00;`, `= (10);`, `= 010;`, `= 1e1;`, `= 5 + 5;`, and for `= 20;` followed by `= 10;` (ends at 10). Refused: `= .5;`, a named `G`, `+= 5`.
Severity low: 5.2.7 is a worked example and 5.2.8 is a feel-it lab, and ending at 10 needs a deliberate second line. But the new prose promises a check the pattern does not make.

Patch for both lessons (`p527.json`): `world\.gravity\.y\s*=\s*(?!\(?\s*10(?:\.0*)?\s*\)?\s*(?:;|\r?\n|$))[-\d(.]`
Verified on both lessons (34 cases each): now failing: `= 10;`, no semicolon, `10.0;`, `10.00;`, `(10)`, `10 ;`, `10 // same`. Still passing: `20`, `0`, `5`, `-10`, `9.8`, `100`, `11` no semicolon, `0.5`, `.5` (fixed), `(20)`, `2 * 10`, no spaces, `20; // falls fast`, `10;` then `20;`. Starter 0/1. Left open on purpose: `010`, `1e1`, `5 + 5`, `10 * 1`, and `20` then `10` (a computed or reverted 10 is not worth a parser).
5.2.8 comment sentences: nothing grades them. The lab is a reflective one and the rubric is one card; either say "non-graded" in the description (the old wording) or add a manual requirement. Missing measurement, low.

### 4. Residuals found in this pass (all low, not blocking)
| Lab | Input | Score | Why it is low |
| --- | --- | --- | --- |
| 5.4.7 r3 | `if (p.x < bird.x && !p.passed) score++;` newline `p.passed = true;` (brace-less, flag unguarded) | 3/3 | The student sees the score stay at 0, so it self-corrects |
| 5.4.7 r2 | `const early = p.x < bird.x && !p.passed;` as a dead declaration, then `if (!p.passed) { score += 1; p.passed = true; }` | 3/3 | Needs a deliberate dummy; same class as "declare and never use" accepted elsewhere |
| 5.4.7 r3 | `... && !p.passed \|\| true) { score += 1; p.passed = true; }` | 3/3 | Deliberate |
| 5.3.8 r3 | `if (b.wasTouching = ball.colliding(b)) { score += b.worth; }` (assignment inside the condition, level-triggered) | 3/3 | The only natural-looking one: the score races while touching. Also `touching \|\| !b.wasTouching`, `!b.wasTouching \|\| true`, and `b.wasTouching = touching` placed before the test (never scores) all pass r3. The behaviour is visibly wrong in play. Fixable by requiring `!` or `=== false` in front of `.wasTouching` inside the `if (`; I did not run that against the reference |
| 5.4.4 r1 | `if (!kb.presses(' ')) { bird.vel.y = -4; }` and `bird.vel.y = bird;` | 3/3 | The price of allowing a named constant; both break the game |
| 5.4.6 r3 | `if (pipes[i].x < 9999)` removal | 3/3 | Unchanged, deliberate (an x test is present) |
| 5.4.6 | `pipes[0]`-only x test around removal of `pipes[i]` | 3/3 | Contrived |

## Not taught, not flagged
Refused but not shapes the course teaches, so by owner policy not defects: `splice(-1, 1)` and tail-by-index-then-pop (5.5.5 teaches `const tail = segments.pop(); tail.delete();`); `else`-reset and read-old-value-first for `wasTouching` (5.3.5 teaches `touching && !wasTouching` then `wasTouching = touching`); `shift()` (r3 title says spliced); `continue` guard clauses; a helper outside `draw` for the R key; `constrain()`; `!(frameCount % 90)`.
Worth a look only if the owner wants the 5.2.18 and 5.5.6 reference to be the only accepted reset shape: `resetBall()` defined outside `draw` is refused on 5.2.18 (r4 is `inFunction draw`), while the 5.5.6 reference itself uses a `startRound()` helper for the same key.
Unchanged from round 4 and not in this pass: 5.2.18 `ball.bounciness = BOUNCE` and `world.gravity.y = G` named constants are 3/4.

## Backtracking
Method: every changed pattern run against 5000-character inputs built from 33 trigger fragments (the pattern's own opening tokens, `if (`, `{`, `}`, `(`) repeated alone, followed by 15 filler kinds (`x`, `{x}`, `{{x}}`, spaces, `;`, brackets, braces, newlines, `if (`, `score += 1;`), and repeated as a unit. 14 patterns, about 1500 inputs each.

| Pattern | Worst on 5000 chars | Growth 5000 to 10000 | Pre-round-5 pattern, same input |
| --- | --- | --- | --- |
| 5.4.4 r3 | 765-823 ms (`bird.y > 400 )` repeated) | 6545 ms, cubic | 1 ms |
| 5.4.4 r1 | 314-365 ms (`kb.presses(' ')` + newline repeated) | 2597 ms | 0 ms |
| 5.2.18 r4 | 347-523 ms (`kb.presses(' ') )` repeated) | 1931 ms | 0-1 ms |
| 5.3.8 r3 | 77 ms (`if (x.wasTouching )` repeated) | 487 ms | 0 ms |
| 5.4.6 r2, r3 | 22 ms, 3 ms (r3: 252 ms on one mixed input) | about 8x | same as before |
| 5.4.7 r2, r3 | 152 ms (r2, a mixed input), 41 ms | polynomial | same as before |
| 5.5.6 r2, r4 | 1.5 ms, 58 ms | flat | same as before |
| 5.2.10 r3 | 47 ms | flat | |
| 5.2.7/8 r1 | 0.1 ms | | |

Verdict: **no catastrophic (exponential) backtracking.** The four patterns that cross a brace are cubic in the length of a brace-free, semicolon-free stretch that repeats the trigger, because the lazy `[^{};]*?\)` start, the closing `)` candidate and the body scan multiply. The old patterns were bounded (`{0,80}`). It needs a pasted wall of hundreds of copies of the trigger with no `{`, `}` or `;`, so no honest submission reaches it. Each lab's own solution repeated 40 times (up to 77 KB), and 40 copies of a near-miss that cannot match, ran under 1 ms per card.
One-token fix, verified: replace the leading `[^{};]*\)` / `[^{};]*?\)` after the trigger with `[^{};]{0,200}\)` / `{0,200}?\)`. On the three patterns (5.4.4 r1/r3, 5.2.18 r4, 5.3.8 r3) this makes growth quadratic: 5000 chars 44 / 17 / 38 / 6 ms, 20 000 chars 886 / 383 / 398 / 104 ms. Every accept and reject result above is identical with the bound (patches `p44b`, `p513b`, `p38b`; the only differences in outcomes across the three are nil). A student condition longer than 200 characters before its closing parenthesis is the only thing the bound could refuse.

Patched 5.2.18 r4 for the bound: `kb\.presses\s*\([^)]*\)[^{};]{0,200}\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?(?:\{(?:[^{}]|\{[^{}]*\})*?)?|[^{};]*?)(?<!\bvel)\.(?:y|x)\s*=(?!=)`
Patched 5.3.8 r3 for the bound: `\.wasTouching\b[^{};]{0,200}\)\s*(?:\{(?:[^{}]|\{[^{}]*\})*?(?:\{(?:[^{}]|\{[^{}]*\})*?)?|[^{};]*?)score\s*(?:\+=|=\s*score\s*\+)\s*\w+(?:\[\s*\w+\s*\])?\.worth`

## Files
Scratch only: `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/r6/` (`t*.cjs` round-4 cheats re-run, `h*.cjs` honest shapes, `c*.cjs` fresh cheats, `bt.cjs` `sc.cjs` `sc2.cjs` `real*.cjs` timing, `p*.json` patches, `out/run-tests-node.js` the bundle). No repo file other than this report was edited. Dev server on :3002 untouched.
