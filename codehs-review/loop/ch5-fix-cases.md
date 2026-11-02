# Chapter 5 fix round 1: case table and declared leftovers

Date 2026-11-01, branch `codehs-inspiration` (HEAD 57e7af4b, not committed). Scope: 5.1, 5.6-5.8, 5.9-5.11.
Inputs: `ch5-moderate.md`, `ch5-advanced.md` + `ch5-advanced-patterns.json`, `ch5-beginner.md`, `ch5-editors.md`. The `ch5-known-fixes.md` changes (5.2.20 r3, 5.2.9 sentence) were left as they were.

Grading is `lib/grader.ts` bundled with esbuild, each lab's own `lesson.json`. Every case below was graded twice: with HEAD's requirements (`git show HEAD:...`) and with the working tree's.
A card string reads one letter per requirement in order (P passed, F failed). **149 cases, 0 not as expected**: 100 honest shapes all full now (43 of them were refused at HEAD); 49 cheats each fail the card they target (39 of them passed it at HEAD).

## What changed

**Grader (42 lesson.json files).** The advanced lens's 118 entries applied: `ignoreStrings: true` on all 118 and the replacement patterns, each widened where an honest shape was refused, plus one new requirement (5.1.19 r3). No pattern this round writes or rewrites contains a lookbehind (the JSON's 5.8.13 r2 had one; rewritten). Widenings on top of the JSON:
- 5.7.3 and 5.8.3 share one `tick()` pattern: `+=`, `++`, `++this.n`, `this.n = this.n + ...`, `this.n = 1 + this.n`, the named-local round trip (`let n = this.n; n += 1 | n++ | ++n | n = n + 1; this.n = n;`) and a named next value (`const next = this.n + 1; this.n = next;`).
- 5.7.5 r1: the JSON's shapes plus the inverted if (`if (this.n <= 10) return false;`) and a named local (`const high = this.n > 10; return high;`), which HEAD accepted and the JSON would have refused.
- 5.8.4 r2/r3: `this.points = this.step + this.points`, a parenthesised `(this.step)`, and a named local of `this.step`.
- 5.8.9 r1: the 5.11.4 r2 family scoped to `isAlive()`: `return (this.hp > 0)`, `>= 1`, `!== 0`, `0 < this.hp`, `!(this.hp <= 0)`, ternary, if/return true/false either way round, a named local.
- 5.8.13 r1/r2: the two-step must name the same local in both lines; the test must sit inside `filter(...)`'s own parentheses (a character window reached the `e.isAlive()` in the loop below and passed `filter((e) => true)`); `[^\w.]0 <` replaces the lookbehind.
- `.pos.x` family: 5.7.9 r1 (JSON), 5.9.4 r1 (`ship.pos.x` wherever `ship.x`), 5.9.6 r3 (`drone.pos.y` reset), 5.11.5 r1 (`this.sprite.pos.y`). The lookbehinds in 5.9.4 r1 and 5.9.6 r3 were replaced by equivalent consuming forms while those patterns were open.
- 5.7.14 r1: `render(` must be in the loop's own body (it may sit under an `if` there); the JSON still let `for (let e of enemies) { }` plus `enemies[0].render()` through.
- 5.6.16 r1-r3: the parameter list is bounded (`[^)]{0,120}`), which took an unclosed `constructor(` from 62 ms to under 13 ms.
- 5.11.5 r2: a negative lookahead refuses a `hits(...)` whose own body calls `.takeHit(` (5.8.12's `hit(other)` copied in, two hp per shot in s4's loop).

**Text.** 5.1.19 (starter ships WORKING with both else lines; s1/s4, description, starter, reference; r3 "A speed of your own" is the new end state so the starter stays below full), 5.8.13 (six presses, hint and Help to 3.7.20), 5.6.14 (circle form taught in s3, `.stroke`/`.strokeWeight` taught in s4, Help r2 to 5.1.6, r3/r5 to steps 3/4), 5.6.8 (Try this), 5.7.19 s1, 5.10.3 (the nested-loops plan named by its title), 5.7.4/5.7.5 (driver, truthy), 5.1.24 and 5.7.22 s4 (challenge list in the step; 5.1.24's list uses only kb.pressing, sin/cos/frameCount and text(); starter comments renumbered), 5.11.9 s1, stale numbers (5.6.6, 5.7.11, 5.7.16, 5.7.20 prompt's "A12.1", 5.7.21 content + description + "labs 5.7.3-e", 5.8.17, 5.8.20), Help pointers (5.1.24 r3, 5.6.10 r2, 5.6.14, 5.7.13, 5.7.14, 5.7.19, 5.7.22 r1-r3).

**From `ch5-editors.md`.** G4 (same as 5.1.19 above). G2: the 5.1.14 live block now tests `'left'` before `'a'` and `'right'` before `'d'`, so each key really shows its own colour (moSHion's `'left'` is also true for `a`; the lower line wins). 5.9.5 Try 2: "about 4" to "about 5". G5 is partly covered by the 5.1.24 rewrite (no FPS line, "arrow keys or WASD").

**Tooling.** `scripts/audit-grader-tolerance.mjs`, axis "increment written as x = x + 1", keeps the member path (`this.n += 1` -> `this.n = this.n + 1`) and leaves a path that starts after `.`/`]` alone. On 5.1/5.3/5.5/5.9-5.11 the old axis reported 4 false hits (5.7.3, 5.8.3, 5.8.16, 5.11.6 r2/r5); the fixed one reaches the same 21 lessons and reports 0.

## Case table
| Lab | Kind | Card | HEAD | Now | Case |
|---|---|---|---|---|---|
| 5.1.19 | honest | all | PP | PPP | reference with speed 5 |
| 5.1.19 | honest | all | PP | PPP | braces around each else |
| 5.1.19 | honest | all | PP | PPP | speed in a variable |
| 5.1.19 | honest | all | PP | PPP | only the x speed changed |
| 5.1.19 | cheat | r1 | FF | FFP | else lines deleted (step 2 state) |
| 5.1.19 | cheat | r1 | PP | FPP | else to 0.5 (drift kept) |
| 5.1.19 | cheat | r3 | PP | PPF | starter untouched: speed still 4 |
| 5.1.19 | cheat | r3 | PP | PPF | speed only in a string |
| 5.1.20 | honest | all | PPPPPPP | PPPPPPP | reference, braces |
| 5.1.20 | honest | all | PPPPPPP | PPPPPPP | arrow keys |
| 5.1.20 | cheat | r5 | PPPPPPP | PPPPFPP | == for = on vel.x |
| 5.1.20 | cheat | r6 | PPPPPPP | PPPPPFP | == for = on vel.y |
| 5.1.20 | cheat | r1 | PPPPPPP | FPPPPPP | canvas only in a string |
| 5.1.22 | honest | all | PPPPPPPP | PPPPPPPP | mover via pos.x |
| 5.1.22 | honest | all | PPPPPPPP | PPPPPPPP | else in braces |
| 5.1.22 | cheat | r5 | PPPPPPPP | PPPPFPPP | else to 0.5 on both axes |
| 5.1.22 | cheat | r7 | PPPPPPPP | PPPPPPFP | text() only in a string |
| 5.1.24 | honest | all | PPPP | PPPP | challenge 3 only (text) |
| 5.1.24 | honest | all | PPPP | PPPP | challenge 5 only (sin) |
| 5.1.24 | honest | all | PPPP | PPPP | reference |
| 5.1.24 | cheat | r4 | PPPP | PPPF | advanced feature only in a string |
| 5.6.9 | honest | all | P | P | labels |
| 5.6.9 | cheat | r1 | P | F | logs only in a string |
| 5.6.10 | honest | all | PP | PP | one colour, no array |
| 5.6.10 | honest | all | PP | PP | stored press |
| 5.6.10 | honest | all | PP | PP | kb.presses(' ') |
| 5.6.10 | cheat | r1 | PP | FP | == for = on b.color |
| 5.6.10 | cheat | r2 | PP | PF | bare kb.presses call, colour every frame |
| 5.6.11 | honest | all | PP | PP | double quotes |
| 5.6.11 | cheat | r2 | PP | PF | == for = on b1.color |
| 5.6.11 | cheat | r2 | PP | PF | b2.color reassigned too |
| 5.6.14 | honest | all | PPPPP | PPPPP | stroke on the circle |
| 5.6.14 | cheat | r5 | PPPPP | PPPPF | stroke only in a string |
| 5.6.16 | honest | all | PPPPP | PPPPP | reference |
| 5.6.16 | honest | all | FPPPP | PPPPP | parens around the parameter |
| 5.6.16 | cheat | r1 | PPPPP | FPPPP | constructor body empty, assignments in a string |
| 5.7.3 | honest | all | P | P | this.n++ |
| 5.7.3 | honest | all | F | P | ++this.n |
| 5.7.3 | honest | all | P | P | this.n = this.n + 1 |
| 5.7.3 | honest | all | F | P | this.n = 1 + this.n |
| 5.7.3 | honest | all | F | P | named local round trip |
| 5.7.3 | honest | all | F | P | named next value |
| 5.7.3 | honest | all | P | P | tick() before the constructor |
| 5.7.3 | cheat | r1 | P | F | empty tick(), increment in another method |
| 5.7.3 | cheat | r1 | P | F | method only in a string |
| 5.7.4 | honest | all | PF | PP | this.n = n + this.n |
| 5.7.4 | honest | all | PF | PP | += Number(n) |
| 5.7.4 | honest | all | PF | PP | this.n = this.n + (n) |
| 5.7.4 | honest | all | PP | PP | renamed parameter |
| 5.7.4 | cheat | r2 | PP | PF | empty addBy, work in another method |
| 5.7.5 | honest | all | P | P | return (this.n > 10); |
| 5.7.5 | honest | all | F | P | return this.n >= 11; |
| 5.7.5 | honest | all | P | P | return 10 < this.n; |
| 5.7.5 | honest | all | F | P | return !(this.n <= 10); |
| 5.7.5 | honest | all | P | P | if (this.n > 10) { return true; } else { return false; } |
| 5.7.5 | honest | all | P | P | if (this.n > 10) return true; return false; |
| 5.7.5 | honest | all | F | P | if (this.n <= 10) return false; return true; |
| 5.7.5 | honest | all | P | P | const high = this.n > 10; return high; |
| 5.7.5 | honest | all | P | P | return this.n > 10 ? true : false; |
| 5.7.5 | cheat | r1 | P | F | comparison unused, return true |
| 5.7.5 | cheat | r1 | P | F | empty isHigh, comparison in another method |
| 5.7.6 | honest | all | F | P | named result |
| 5.7.6 | honest | all | F | P | addBy(2 + 3) |
| 5.7.6 | honest | all | F | P | parenthesised return |
| 5.7.6 | cheat | r1 | P | F | calls only in dead method |
| 5.7.9 | honest | all | F | P | this.sprite.pos.x += dx |
| 5.7.9 | honest | all | F | P | x = dx + x |
| 5.7.9 | honest | all | P | P | x = x + dx |
| 5.7.9 | cheat | r1 | P | F | empty moveRight, move in another method |
| 5.7.10 | honest | all | F | P | this.sprite.remove() |
| 5.7.10 | cheat | r1 | P | F | empty pop, delete in another method |
| 5.7.10 | cheat | r1 | P | F | popcorn() is not pop() |
| 5.7.13 | honest | all | F | P | for loop with a named local |
| 5.7.13 | honest | all | P | P | for loop pushing new Enemy |
| 5.7.13 | cheat | r1 | P | F | empty loop, then one push |
| 5.7.14 | honest | all | PP | PP | index for loop |
| 5.7.14 | honest | all | PP | PP | one-line for...of |
| 5.7.14 | honest | all | PP | PP | render under an if in the body |
| 5.7.14 | cheat | r1 | PP | FP | empty loop, first enemy only |
| 5.7.14 | cheat | r1 | PP | FP | loop over another array |
| 5.7.19 | honest | all | PPPPP | PPPPP | remove() instead of delete() |
| 5.7.19 | cheat | r3 | PPPPP | PPFPP | collect body only in a string |
| 5.7.22 | honest | all | PPPP | PPPP | reference |
| 5.7.22 | cheat | r1 | PPPP | FFFF | class only in a string |
| 5.8.3 | honest | all | F | P | one-token edit of the starter (let n = this.n) |
| 5.8.3 | honest | all | F | P | ++this.n |
| 5.8.3 | honest | all | F | P | this.n = 1 + this.n |
| 5.8.3 | honest | all | F | P | const next = this.n + 1 |
| 5.8.3 | honest | all | F | P | local with ++n |
| 5.8.3 | cheat | r1 | F | F | starter untouched |
| 5.8.3 | cheat | r1 | P | F | local round trip, increment in another method |
| 5.8.4 | honest | all | PFP | PPP | points = step + points |
| 5.8.4 | honest | all | PPF | PPP | parenthesised step |
| 5.8.4 | honest | all | PFP | PPP | named local of this.step |
| 5.8.4 | cheat | r1 | PPP | FPP | == for = on this.step |
| 5.8.4 | cheat | r2 | PPP | PFP | empty add, add and undo both in undo |
| 5.8.9 | honest | all | FP | PP | return (this.hp > 0); |
| 5.8.9 | honest | all | FP | PP | return this.hp >= 1; |
| 5.8.9 | honest | all | FP | PP | return 0 < this.hp; |
| 5.8.9 | honest | all | FP | PP | return this.hp !== 0; |
| 5.8.9 | honest | all | FP | PP | if (this.hp > 0) { return true; } else { return false; } |
| 5.8.9 | honest | all | FP | PP | if (this.hp > 0) return true; return false; |
| 5.8.9 | honest | all | FP | PP | if (this.hp <= 0) { return false; } return true; |
| 5.8.9 | honest | all | FP | PP | const alive = this.hp > 0; return alive; |
| 5.8.9 | honest | all | PP | PP | return this.hp > 0 ? true : false; |
| 5.8.9 | honest | all | FP | PP | return !(this.hp <= 0); |
| 5.8.9 | cheat | r1 | PP | FP | empty isAlive, comparison in another method |
| 5.8.9 | cheat | r1 | FP | FP | named local but returns true |
| 5.8.9 | cheat | r2 | PP | PF | bare e.isAlive() and the old checks kept |
| 5.8.12 | honest | all | PF | PP | named local of power |
| 5.8.12 | honest | all | PP | PP | renamed parameter |
| 5.8.12 | cheat | r1 | PP | FF | empty hit, call in another method |
| 5.8.13 | honest | all | FF | PP | const alive = enemies.filter((e) => e.isAlive()); enemies = alive; |
| 5.8.13 | honest | all | PP | PP | enemies = enemies.filter((e) => e.hp > 0); |
| 5.8.13 | honest | all | PF | PP | enemies = enemies.filter((e) => e.hp >= 1); |
| 5.8.13 | honest | all | PF | PP | enemies = enemies.filter((e) => e.hp !== 0); |
| 5.8.13 | honest | all | PF | PP | enemies = enemies.filter((e) => 0 < e.hp); |
| 5.8.13 | honest | all | PP | PP | enemies = enemies.filter(function (e) { return e.isAlive(); }); |
| 5.8.13 | cheat | r1 | FF | FF | filter result thrown away |
| 5.8.13 | cheat | r1 | PP | FF | filter only in a string |
| 5.8.13 | honest | all | PP | PP | extra parentheses in the test |
| 5.8.13 | honest | all | PP | PP | block-body arrow |
| 5.8.13 | cheat | r2 | PF | PF | filter keeps everything (isAlive only in the loop below) |
| 5.8.13 | cheat | r2 | PF | PF | 1.0 < e.hp is not 0 < e.hp |
| 5.9.4 | honest | all | FPPPP | PPPPP | clamp written with ship.pos.x |
| 5.9.4 | honest | all | PPPPP | PPPPP | clamp written 20 > ship.x |
| 5.9.4 | honest | all | PPPPP | PPPPP | reference |
| 5.9.4 | cheat | r1 | FPPPP | FPPPP | no clamp at all |
| 5.9.6 | honest | all | PPF | PPP | drone.pos.y reset inline |
| 5.9.6 | honest | all | PPP | PPP | drone.y reset inline |
| 5.9.6 | honest | all | PPP | PPP | stored overlap then if (hit) |
| 5.9.6 | cheat | r3 | PPF | PPF | score outside the if |
| 5.10.5 | honest | all | PPPPP | PPPPP | alias inside the block |
| 5.10.5 | honest | all | PPPPP | PPPPP | alias declared above the if |
| 5.10.5 | honest | all | PPPPP | PPPPP | splice(...)[0].delete() |
| 5.10.5 | honest | all | PPPPP | PPPPP | .remove() |
| 5.10.5 | cheat | r2 | PPPPP | PFPPP | delete+splice before the overlap if |
| 5.11.5 | honest | all | FPPPPP | PPPPPP | isAlive reads this.sprite.pos.y |
| 5.11.5 | honest | all | PPPPPP | PPPPPP | hits() as if/return |
| 5.11.5 | honest | all | PPPPPP | PPPPPP | hits() last method of Bullet |
| 5.11.5 | honest | all | PPPPPP | PPPPPP | overlap asked from the enemy side |
| 5.11.5 | honest | all | PPPPPP | PPPPPP | hits() with a named answer |
| 5.11.5 | cheat | r2 | PPPPPP | PFPPPP | hits() calls takeHit on the enemy before returning the overlap |
| 5.11.5 | cheat | r2 | PPPPPP | PFPPPP | hits() copies 5.8.12 and calls takeHit (double damage) |
| 5.11.9 | honest | all | PPP | PPP | if (this.hp === 0) boom |
| 5.11.9 | honest | all | PPP | PPP | if (this.hp <= 0) { boom } |
| 5.11.9 | honest | all | PPP | PPP | guard return then play |
| 5.11.9 | honest | all | PPP | PPP | boom in hitEnemies under !isAlive |
| 5.11.9 | cheat | r3 | PPP | PPF | unconditional boom in takeHit |

## Chapter sweep (every graded script lab in scope)
Reference and starter graded now; "starter + reference in a string" is the untouched starter with the whole reference appended inside a template literal (the 1.1 string hole). What still passes on that row is a string-content requirement (declared below) or a card the starter already passes. Eight mechanical restyles of every reference (CRLF, Allman braces, `var`, no semicolons, double quotes, tabs, spaced parens, block comments) were graded with HEAD and now: **0 regressions**. Starters above zero are by design: 5.1.24 (r3 `background(`), 5.10.8 (r2), and 5.1.19 (r1/r2: the starter now ships working; r3 is what is left to do).

| Lab | Reference now (HEAD) | Starter now | Starter + reference in a string: HEAD -> now |
|---|---|---|---|
| 5.1.7 | PPP (PPP) | FFF | PPP -> FFP |
| 5.1.11 | PPPP (PPPP) | FFFF | PPPF -> FFFF |
| 5.1.19 | PPP (PP) | PPF | PP -> PPF |
| 5.1.20 | PPPPPPP (PPPPPPP) | FFFFFFF | PPFFFFF -> FFFFFFF |
| 5.1.22 | PPPPPPPP (PPPPPPPP) | FFFFFFFF | PPFFFFFF -> FFFFFFFF |
| 5.1.24 | PPPP (PPPP) | FFPF | PPPF -> FFPF |
| 5.6.9 | P (P) | F | F -> F |
| 5.6.10 | PP (PP) | FF | FF -> FF |
| 5.6.11 | PP (PP) | FF | PP -> FF |
| 5.6.14 | PPPPP (PPPPP) | FFFFF | FPPPP -> FFFFF |
| 5.6.16 | PPPPP (PPPPP) | FFFFF | PPPPP -> FFFFF |
| 5.7.3 | P (P) | F | P -> F |
| 5.7.4 | PP (PP) | FF | PP -> FF |
| 5.7.5 | P (P) | F | P -> F |
| 5.7.6 | P (P) | F | P -> F |
| 5.7.9 | P (P) | F | P -> F |
| 5.7.10 | P (P) | F | P -> F |
| 5.7.12 | PPPP (PPPP) | FFFF | PPPP -> FFFF |
| 5.7.13 | P (P) | F | P -> F |
| 5.7.14 | PP (PP) | FF | FF -> FF |
| 5.7.19 | PPPPP (PPPPP) | FFFFF | PPPPF -> FFFFF |
| 5.7.22 | PPPP (PPPP) | FFFF | PPPP -> FFFF |
| 5.8.3 | P (P) | F | P -> F |
| 5.8.4 | PPP (PPP) | FFF | PPP -> FFF |
| 5.8.8 | PP (PP) | FF | PP -> FF |
| 5.8.9 | PP (PP) | FF | PP -> FF |
| 5.8.12 | PP (PP) | FF | PP -> FF |
| 5.8.13 | PP (PP) | FF | PP -> FF |
| 5.8.16 | PP (PP) | FF | PP -> FF |
| 5.8.18 | PPPP (PPPP) | FFFF | PPPP -> FFFF |
| 5.9.4 | PPPPP (PPPPP) | FFFFF | FFFFF -> FFFFF |
| 5.9.6 | PPP (PPP) | FFF | FFF -> FFF |
| 5.9.7 | PPPPP (PPPPP) | FFFFF | FFPFP -> FFFFP |
| 5.10.2 | PPPPP (PPPPP) | FFFFF | FFFFF -> FFFFF |
| 5.10.5 | PPPPP (PPPPP) | FFFFF | FFFFF -> FFFFF |
| 5.10.7 | PPPP (PPPP) | FFFF | FFFF -> FFFF |
| 5.10.8 | PP (PP) | FP | FP -> FP |
| 5.11.4 | PPPPPP (PPPPPP) | FFFFFF | PPPFPP -> FFFFFF |
| 5.11.5 | PPPPPP (PPPPPP) | FFFFFF | PPPFFP -> FFFFFF |
| 5.11.6 | PPPPPP (PPPPPP) | FFFFFF | FPPFPF -> FFFFFF |
| 5.11.9 | PPP (PPP) | FFF | PFF -> PFF |
| 5.11.10 | P (P) | F | P -> F |

## Timing
Every Chapter 5 requirement (not only the changed ones) against 42 adversarial 5,000-character inputs plus six reference-derived ones (truncated at 20/40/60/80 % and padded with its own last 40 characters, every `}` removed, the reference repeated): **6,510 calls, slowest 12.7 ms** (5.6.9 r1 on `if (a.y > b ` x 500). Inputs aimed at this round's patterns include `tick() { ` x 600, `let n = this.n; ` x 320, `isAlive() { const alive = this.hp > 0; ` x 120, `if (this.hp <= 0 ` x 300, `enemies = enemies.filter(` + `(` x 4970 / `(a)` x 1650 / `(a` x 2480, `for (let e of enemies) {` + `{` x 4970, `hits(e) { ` x 500, `ship.pos.x < ` x 380. The one slow spot found (5.6.16 r3, 62 ms on an unclosed `constructor(x, y, word` x 200) was fixed by bounding the parameter list.

## Gates
Dev server on :3002 stopped by pid (19209 `npm run dev`, 19221 `server.js`) before regenerating. Generators: generate-module-docs, generate-lessons-manifest, generate-ai-graders, generate-quiz-keys, generate-solutions, generate-lesson-starters (all exit 0). Checks: check-lesson-numbers, check-lesson-groups, check-prompt-pointers (ALL PASS), check-help-pointer-titles (the 10 known mismatches, none in Chapter 5, none added), check-lesson-citations (every number resolves; 0 stale), check-hints, check-live-blocks (491 match), check-starters (every reference full, every starter below full), check-solution-leak, test-quiz (ALL PASS), test-grader-tolerance (334 OK), audit-grader-tolerance --gate (0 hits), `tsc --noEmit` (exit 0). Full `npm test` not run.

## Declared leftovers (not fixed, by policy or by brief)
- **Empty-if / empty-loop bodies.** `if (this.hp > 0) { } return true;` (5.8.9 r1), `for (let i = 0; i < 0; i++) enemies.push(new Enemy(...))` (5.7.13), the 1.4 list in `ch5-advanced.md` (5.9.4 r1, 5.9.7 r5, 5.10.5 r1, 5.10.7 r4, 5.11.6 r2, 5.7.22).
- **Wrong-value semantics.** `this.n += 100`, `+= n * 2`, `-= dx`, `> 100`, `takeHit(50)`, a 5.1.19 speed of 40, `filter((e) => !e.isAlive())`, guard before the subtraction (5.8.8, 5.11.4 r1), `1.0 < e.hp` passes 5.8.13 r1 (r2 refuses it).
- **Uncalled code.** A method defined and never called (5.11.4 r6 `clearEnemies`, 5.11.4 r4, 5.11.6 r3), dead arrow functions.
- **Hand-crafted lexer tricks.** Anything built to confuse comment/string blanking (`enemy['takeHit'](1)` inside `hits()`, regex literals holding code).
- **The nine string-content requirements** keep the one-line-string hole: 5.1.7 r3, 5.1.20 r3/r4, 5.1.22 r3/r4, 5.9.4 r3, 5.9.7 r5, 5.10.2 r1, 5.11.9 r1 (visible in the sweep's string column: 5.1.7, 5.9.7, 5.11.9).
- **5.9.4 / 5.9.6 splice-without-delete.** 5.9.6 does not regrade the off-top removal in `moveBullets()` that 5.9.4 graded; removing that `delete()` in 5.9.6 is not seen. Within `hitDrone()` the omission is refused (PFP). Not trivial.
- **5.11.6** "a method that builds and returns a list" is still not modelled before it is asked; ask not reworded (not trivial).
- **5.1.19 r3 is a speed check.** A student who skips the delete/restore experiment and only changes a speed passes; the experiment itself cannot be graded from the final file.
- **Not taught, still refused:** `other?.takeHit(this.power)` (5.8.12; optional chaining), bare `e.hp` as a filter test (5.8.13), `forEach` in 5.7.14 (the step says `for...of`), named `const e = new Enemy(); enemies.push(e)` five times outside a loop in 5.7.13 (moderate L3; a loop with a named local is accepted).
- **Low items from the lenses not in this round's brief:** 5.7.9 `const s = this.sprite; s.x += dx` (L4), 5.7.4 calling `this.tick()` n times (L6), 5.6.11 both boxes `new Box('red')` (L9), 5.10.5 r5 inner-loop `break` placement and 5.10.2 forward loop (L11), 5.7.19 "despawns" not tied to `delete()`, 5.7.17 captions "Figure 5.3.1 / 5.3.2", 5.8.18 step 2 ungraded.

## From `ch5-editors.md`, reported, not fixed
- **G1 (major): world gravity 9.8 drops every default sprite in 5.1 and 5.6-5.8 off the canvas in about 1.5 s** (22 live blocks blank, 8 lab references blank at 2.4 s). A runner default or a taught `collider = 'static'` is a design call. It also changes 5.1.19's experiment: with the else lines deleted, `vel.y` is never reset and the sprite falls even before a key is tapped.
- **G3:** five starters with an empty `setup()` answer Run with only "Script error." (the real message reaches only the page console). Runner change.
- **G5 (rest):** the 5.1.24 reference still cycles colour on WASD taps with `kb.presses` (teacher-facing; its header now says it is a stretch past challenge 1).
- **G6:** 5.1.22 `content.md` "Starter code" differs from the shipped `script.js`; `content.md` is not rendered in a moSHion lab.
- **G7:** 5.11.5 step 2 hint code overflows the 319 px Steps drawer by 23 px at 1440 px (layout).
