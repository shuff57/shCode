# Module 5.1 labs, round 2: strong-student lens (cs-student-advanced)

Date 2026-11-03, branch `codehs-inspiration`, after 2b4d2d34 (graders) and 5c45931f (runner). No repo file edited except this report.
Method: real `gradeWithTests` on each lab's current `lesson.json` (~110 named cases, per-card pass/fail recorded) plus browser spot checks (`w51a2`, headless, dev 3002, closed). Dev has no AI, so Check = pattern fallback; where I needed the AI path I mocked `POST /api/grade-written` (stated below). `npm run test:tolerance` was NOT run (server load average was 65-70; my own tsc build of `lib/run-tests-node.ts` stood in).
Policy applied: grading is lax on purpose. Only (1) meaningless-card passes and (2) honest shapes still refused are reported.
Numbering: 5.1.7, 5.1.11, 5.1.19 (`5-1-18`), 5.1.20, 5.1.23 Playground (`5-1-21`), 5.1.25 Challenges (`5-1-23`), 5.1.26 Math grid (`5-1-25`).
Baselines: all seven references full; starters 0/3, 0/4, 2/3 (ships working), 0/7, 0/8, 1/4 (`background(` is in the starter), 0/4.

## Round-1 items

| Round-1 item | Status | Evidence |
| --- | --- | --- |
| 1. Playground r6: frameCount label with the mover line deleted passes | **Fixed** for the accident and the named smuggles | 7/8 for: label shows frameCount and no mover line; `let t = frameCount; mover.x = 80;`; `player.rotation = frameCount`; line deleted. Intermediate variable, `% 500`, `+= 2`, `x++`, `.speed`, `.rotationSpeed`, cos/sin orbit, helper called from draw: all 8/8 |
| 2. 5.1.20 bare `kb.pressing('a'); ... vel.x = 4; vel.y = 4` 7/7 | **Fixed** (5/7: r5, r6 red). Browser-run not repeated, grader only | Also 5/7: the honest drift (keys read, no else). Reset-first, braced, `(d - a) * 4`, `!a && !d`, const-held keys, SPEED constant, arrow names, helper called from draw: all 7/7 |
| 3. 5.1.25 Challenges r4 `sin(0);` | **Not fixed, accepted**. Still 4/4 | also `frameCount;`, `text();`; and now `let s = "text(";` (see N5) |
| 4. rgba trail refused; trail text orphaned | **Fixed** | easy rgba, double quotes, template literal, `background(0,0,0,25)`, array + circle, ghost + lerp: all 4/4. Browser: 4/4, Submit lit. The trail sentence is now in the Steps text (4 steps), so a student can see it |
| 5. 5.1.7 negative/decimal refused | **Fixed** | `-20, -30, 140, 30` and `60.5, 60, 140.5, 30` 3/3. `new Sprite(180.0,180.0,60.0,60.0)` correctly 1/3. Backtick colour still 2/3 (5.1.6 teaches single quotes only; not a finding) |
| 6. 5.1.19 reset-first and nested ternary refused | **Fixed** (3/3 both); the 5.1.19/5.1.20/Playground inconsistency is gone | `-2*2`, `4.0`, `41` still pass r3 (speed-4 variants), accepted |
| 7. 5.1.11 all presence checks | **Unchanged, acceptable** | min whole-file 4/4; `new Canvas(` in draw 4/4 |
| 8. 5.1.26 y variable, helper | **Partly** | `y` variable, `25 * 2`, `h / 2`, `x` variable, `50.5`, negative x: 4/4 (fixed). `showGrid`/`showMouse` in a helper that draw() calls: still **2/4** (r1, r4 are `inFunction draw`). Browser: y variable 4/4, Submit lit |
| Orphaned: keys never connected to velocity (r3-r6) | **Partly** | see N2 |
| Missing measurement: sign of `vel.y` | **Not fixed** | up-positive (`'w'` -> `vel.y = 4`) still 7/7 in 5.1.20 |

## New findings, ranked

### N1. HIGH (new Submit rule): Check does NOT keep Submit shut when the AI path answers green
Pattern fallback holds. Measured (Submit sampled every 20 ms for 4 to 8 s after a click on Check, code typed 600 ms earlier):
- Cold load, `nope();` as first line of `setup()`: Submit stays disabled, red "ReferenceError", bar "Run your code again".
- Cold load, `nope()` in `draw()` frame 1: disabled.
- Slow load (runner.html delayed 4 s by route): clean sketch lights Submit only at 4.4 s after Check; throwing sketch never. Gate holds.
- Syntax error, `while(true){}` in setup, `while(true){}` in draw: Submit stays disabled (no error text or bar for the two loops: the student gets no reason).
- Editing after a clean run drops Submit at once.

**The break.** The AI success path (`runAiCheck`, `components/LessonWorkspace.tsx` ~l.799-835) never calls `runQ5()`; only `fallBackToPatternCheck` does. With `/api/grade-written` mocked to return `{ok:true, criteria:[r1..r3 met]}` (1.5 s delay), on a cold page, code = the 5.1.19 reference with `nope();` first in `setup()`: **Submit lit 2.2 s after Check, no preview frame was ever mounted** (`#preview` absent), no error anywhere. Same for `nope()` in `draw()`. Pressing Run then disables it. Production Check normally takes the AI path, so this is the common route, and the AI reads text, it does not execute it.
Fix direction: `runAiCheck` success should start a run (`runQ5()`) and `runLetsSubmit` should wait for it, or Submit should require "the current code's run came up". Must still pass: Run clean then Check (AI green) lights Submit; `expectsRuntimeError` labs; fallback path unchanged.

### N2. LOW-MED: helper-function widening means a helper that is never called satisfies every key/mover/label card
Cause: r3-r6 (5.1.20), r3-r5, r7 (Playground) and r4 (Challenges) accept any non-`setup` function.
- 5.1.20: `function unused(){ ...whole WASD if/else chain... } function draw(){ background('#222'); }` = **7/7**. The sprite never moves.
- Playground: `function unused(){ keys; mover.x = 80 + Math.sin(frameCount * 0.05) * 60; text(...) } function draw(){ background('#222'); }` = **8/8**.
- Challenges: `function unused(){ player.y = 200 + sin(frameCount*0.05)*80; }` = 4/4.
- The helper-called shapes (`moveKeys()`, `steer(p)` with ternary, `moveMover()`, `readKeys()` + `label()`) all pass, which is the point of the change. I did not write a "called from draw" tightening: it is a guess until run against every reference and called-before-declared and called-from-helper shapes. Lax policy says leave it, but record that "the card is green" no longer means "draw() uses it".

### N3. LOW-MED: 5.1.20 r5/r6 still pass without keys driving velocity (reset-first alternative is not tied to a key)
`kb.pressing('a'); kb.pressing('w'); player.vel.x = 0; player.vel.y = 0; player.vel.x = 4; player.vel.y = 4;` = **7/7**, sprite drifts diagonally (the exact bug 5.1.18/5.1.19 teach). The alternative "vel.x = 0 earlier, then a later nonzero assignment" has no `kb` link. Also 7/7: `player.vel.x = kb.pressing('a'); player.vel.y = kb.pressing('w');` (works as a one-way 0/1 push, never left or up; not wrong enough to chase). The unconditional `vel = 4` shape from round 1 is now correctly 5/7.
Tighten (not run): the later nonzero assignment must sit after `kb.pressing(` within the same function. Must still pass: the reference, reset-first with four ifs, braced/ternary/`(d - a) * 4`. I have not run it; do so before shipping.

### N4. LOW: Playground r6 "moves on its own" accepts these (all 8/8)
- `mover.x = start;` (a variable) plus any `frameCount` (a label) in the same draw: a static sprite. Same for `mover.x += 0.0` and `mover.x += speed` with `speed = 0`.
- **A mover that moves only when keys are held**: `if (kb.pressing('a')) { player.vel.x = -4; mover.vel.x = -4; } ...` = 8/8. The card text says "with no key held". This is the one an honest "second sprite that copies the first" student writes. The `kd` exclusion only sees the first sprite names inside the same `kb` statement.
- `mover.vel.x = 1; mover.vel.x = 0;` 8/8 (unchanged from round 1).
- Sprites created inside `draw()` (`player = new Sprite(...)` each frame, mover `x = 80 + frameCount`): **8/8, no card catches it**, and it runs: browser Submit lit 2.3 s after Check, no error. Same for `new Canvas(` inside `draw()` on 5.1.11 (4/4) and `new Sprite(` in draw on 5.1.11 (4/4). Nothing in the module grades creation-in-setup. Lax policy: acceptable; the sketch visibly misbehaves.

### N5. LOW: Challenges r4 lost `ignoreStrings` when the rgba alternative was added
`ignoreStrings: false` was needed so `'rgba(` is visible. Side effect: `let s = "text(";` in draw() is **4/4**. Cost is nil beside `sin(0);`, but it removed the last string-blanking guard on that card.

### N6. LOW: honest own-idea answers refused by Challenges r4 (3/4)
`player.w += 1` (grow) and `player.x += Math.random() * 4 - 2` (wander) both 3/4. The card text says "your own idea such as a spin or a trail". Accepted own-ideas: rotation, trail, timer `frameCount`, `kb.pressing` plus `.color`, `lerp`, `circle`, `Math.sin`. Add `\.\s*(?:w|h|width|height|scale|opacity|diameter)\s*[-+]?=` and `Math\.random\s*\(` if you want these in. Verified against: the starter and keys-only answer must stay 3/4 or lower. Not run against the reference (reference already matches via `sin(`).

### N7. LOW: Submit lights briefly or permanently before a late error
Measured (clean first frame, then error): `if (frameCount > 30) nope();` Submit lit 1146 to 1376 ms (230 ms); `frameCount > 120` lit 1.7 s; `setTimeout(() => nope(), 1500)` in setup lit 1.2 s; `if (kb.pressing('a')) player.vel.x = -spedd;` (typo inside an unpressed branch) stays **lit** until the key is pressed. Inherent to run-time detection. Reported for completeness, no change proposed.

### N8. LOW: 5.1.26 helper refusal, inconsistent with the rest
r1 and r4 are `inFunction draw`, so `function overlay(){ showGrid(50); showMouse(); }` called from draw() scores 2/4 while every other lab now accepts helpers. Optional 0-point lab: acceptable. `new Sprite(100, Math.abs(-50), ...)` (call in y) also refused (r3). Below-centre y (-50) is refused on purpose.

### Unchanged and accepted
- 5.1.20 r3/r4 have no `ignoreStrings`: `let k = "kb.pressing('a') kb.pressing('w')"` still satisfies them (7/7 with the reset-first alternative).
- 5.1.26 origin after the sprite: 4/4 on cards, browser run error keeps Submit shut (verified round 1).
- 5.1.7 point is ungraded by design (0 points).

## Elegance tests, run and recorded (round 2)
| Lab | Answer | Result |
| --- | --- | --- |
| 5.1.7 | negative x,y; decimal x and w; hex colour; Tomato | 3/3 |
| 5.1.7 | backtick colour | 2/3 (not taught) |
| 5.1.19 | reset-first; nested ternary; `else {}`; decimal speed | 3/3 |
| 5.1.20 | braced if/else; ternary; `(d - a) * 4`; `!a && !d`; const-held keys; SPEED const; arrows; reset-first; helper called from draw | 7/7 |
| 5.1.23 Playground | helper called; template label; `x++`; `x = x + 2`; `.speed`; `.rotationSpeed`; `dx` variable; cos/sin; other names | 8/8 |
| 5.1.25 Challenges | 11 honest shapes incl. rgba, lerp, helper-called `sin`, timer colour | 4/4 |
| 5.1.26 | y variable; `25 * 2`; `h / 2`; no spacing | 4/4 |

## Not tested
- The AI Check's own verdicts (mocked only to prove the gate path in N1).
- `npm run test:tolerance` with the new patterns, and any proposed tightening in N3 or N6 against the references.
- 5.1.20 / Playground browser runs for the drift shapes (grader-only).

Files: `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/adv51b/` (`cases2.cjs`, `run2.cjs`, `drive.sh`, `fresh.sh`, `t_*.js`).
