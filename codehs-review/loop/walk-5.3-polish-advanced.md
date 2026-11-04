# Pinball polish labs 5.3.17, 5.3.19, 5.3.21 and the 5.3.20 playtest: strong-student lens (cs-student-advanced)

Date 2026-11-03, branch `codehs-inspiration`. No repo file edited except this report.
Folders: 5.3.17 = `5-3-pinball-polish-3-lab-show-the-worth-pop-the-points`, 5.3.19 = `-5-lab-nudge-the-table`, 5.3.20 = `-6-playtest-and-polish`, 5.3.21 = `-7-challenges-polish-it-your-way`.

Method.
- Real `gradeWithTests` (my own tsc build of `lib/run-tests-node.ts`) on each lab's current `lesson.json`, about 190 named cases, per-card pass/fail recorded. Elegance and honest-shape cases were run as named tests, not assumed.
- Behaviour of the gaming answers and the references run headless in `scripts/moshion-harness.mjs` (score, sprite count, ball position, keys injected), so "passes the card" is paired with "what the game actually does".
- Browser (`w53a`, headless, dev 3002, closed): the three cheats below typed into the real editor, Run, Check.
- **Dev has no AI.** `POST /api/grade-written` answers 404 here, so Check fell back to the pattern check ("The grader isn't responding right now ... The pattern check marked your cards instead"). Everything below is the pattern checker plus the Submit gate. The AI path (production Check) and the 5.3.20 AI grade were **not tested live**.
- Policy applied: grading is lax on purpose. Reported: (1) cards a non-solution turns green, (2) honest shapes refused.

Baselines: references 3/3, 3/3, 1/1 (5.3.17, 5.3.19, 5.3.21). Untouched starters 0/3, 0/3, 0/1. Both fine.
Reference behaviour confirmed in the harness: 5.3.17 score goes 1, 6, 16 with one gold popup per hit; 5.3.19 default mass is 0.422 ("about 0.4" is true), the push at 0.4 throws the ball to the wall, mass 1 is a nudge, mass 4 barely moves it; 5.3.21 reference runs with no error through popup deletion, five nudges (tilt, ball.y 500) and R (round 2, mass 3).

## Browser proof of the Submit gate (all three lit with dev AI down)

| Lab | Code typed (starter plus) | Cards | Submit |
| --- | --- | --- | --- |
| 5.3.17 | `const note = 'b1.text = 5';` ; `new Sprite(b.x, b.y - 24, 28);` ; `const p = new Sprite(-9,-9,1); p.life = 1;` (inside the hit if) | 3/3 | enabled |
| 5.3.19 | starter plus a never-called `function unusedNudge(){ if (kb.pressing('left')) ball.applyForce(-5,0); ball.mass = 1; ball.debug = true; }` | 3/3 | enabled |
| 5.3.21 | starter plus one line `frameCount;` at the top of `draw()` | 1/1 | enabled |

The Run was clean each time, so the "clean Run of the same code" half of the gate does not help: none of these throws.

## Ranked findings

### F1. HIGH, 5.3.17 r2: any `if (A && !B)` containing `new Sprite(` counts as "a popup made only when a hit starts"
The inline branch of r2 asks only for an `if` whose condition has an `&&` and a `!x` (or `== false/0`), with `new Sprite(` in its body. It never asks that the condition be about the ball touching anything.
- Evidence (grader 3/3, nothing else changed in the starter): `if (score >= 0 && !over) { const pop = new Sprite(b.x,b.y-24,28); pop.life = 40; }` placed in the bumper loop. Harness run: 124 sprites by frame 50, ball pinned at x=21, **score stays 0 for the whole run**, no error. The lab's own named wrong idea ("a new popup would pile on every frame") is exactly what this builds, and it scores 3/3.
- Same with `if (kb.presses('r') && !done) { new Sprite... }` (popup on a key press), and `if (true) { if (!done) { new Sprite } }` (nested branch: any outer `if`, any inner `if` with a `!`). Also a popup in `setup()` under `if (true && !false)` (r2 text says "not in setup()").
- Correctly refused (good): `if (touching)`, `if (ball.colliding(b))`, straight in `draw()`, plain `setup()`, the `else` branch, `touching && b.wasTouching`, `!touching`.
- Suggested fix: make the inline branch need a collision word in the condition (`colliding|collides|overlap|touching|hit`) or, better, the same shape the `pc` branch already uses: the negated name must be assigned somewhere in the file from the condition's other operand (the lab's own `b.wasTouching = touching;`). The "Group" and helper branches stay as they are.
- Must still pass (run each against 5.3.17 `solution.js` before adopting): the reference; `const hit = touching && !b.wasTouching; if (hit) {...}`; `touching && b.wasTouching == 0`; popup inside a nested `if` in the hit block; popup in a helper the hit-if calls.
- Must still fail: the cases above, and the untouched starter (0/3).
- Keep refusing `wasTouching === false`. It is not an over-strict miss: 5.3.5 (`5-3-pinball-4-reading-a-collision-is-not-an-event`) teaches that `colliding()` gives a count, so `=== false` is a real bug (the score never climbs).

### F2. HIGH, 5.3.19: all three cards are whole-file regexes, so a never-called helper, a push in `setup()`, an inverted or dead condition and meaningless mass/debug all score 3/3
Evidence (grader, card string in brackets is r1 r2 r3):
- `function unusedNudge(){ ... }` never called [PPP]. Browser: Submit enabled.
- Whole nudge in `setup()` (the `kb.pressing` runs once at load) [PPP]. `if (false && kb.pressing('left')) ball.applyForce(-5,0)` [PPP].
- Inverted `if (!kb.pressing('left')) ball.applyForce(-5, 0)` [PPP]. Harness: the ball is shoved into the left wall at x=21 and falls out of play, no error.
- `applyForce(0, 0)`; left key pushes right; `ground.applyForce(...)` on the static ground [PPP].
- r2: `ball.mass = 0`, `-3`, `undefined`, `1000`, `ground.mass = 1` all green. Harness: the engine silently ignores 0, -3 and undefined (mass reads back 1), and 1000 makes the arrow keys do nothing visible. So "the weight is set" is green for a ball whose weight was not set.
- r3: `ball.debug = !true`, `!1` green (the `!` alternative is meant for `!ball.debug`); `ground.debug = true` green.
- Correctly refused: `vel.x +=` (the lab's own trap), `kb.presses` + applyForce, `applyForce` with no key, `debug = false`, comment-only and string-only versions, `applyForce` in the `else` of a `kb.pressing` if.
- Suggested fix: r1 as `inFunction` draw/update with `followCalls: true` (5.3.17 r1 already uses that machinery); r2 and r3 `inFunction` setup/draw/update with `followCalls`. For r2 add `(?!0\b|-|undefined)` after the `=`; for r3 add a lookahead so `!` must be followed by an identifier, not `true/1/false` literals (`!\s*(?!true|1\b|false|0\b)[A-Za-z_$]`).
- Must still pass: the reference (`if (kb.pressing('left')) ball.applyForce(-5, 0);` twice in `draw`, `ball.mass = 1;` and `ball.debug = true;` in `setup`); a helper `nudge()` called from `draw()` with the `if kb.pressing` inside; the else-if chain; `ball.applyForce(kb.pressing('right') ? 5 : ..., 0)` ternary and `5 * (kb.pressing('right') - kb.pressing('left'))` (both pass today); `ball.density = 2`; `ball.mass = W` with a const; `allSprites.debug = true` (allSprites in setup); a key-flip `if (kb.presses('d')) ball.debug = !ball.debug;` in `draw`.
- Must still fail: the cases above, starter 0/3.

### F3. MEDIUM, 5.3.21 r1: one catch-all card, passed by a one-token statement
The card accepts any of seven alternatives and several are satisfied by something that is not the polish. Each of these is 1/1 on the starter plus one line:
- `frameCount;` or `let f = frameCount;` or a `text(frameCount, ...)` (alternative 2 is bare `\bframeCount\b`). Browser: Submit enabled.
- `ball.gravityScale = 1;` (the default) or `ball.rotationLock = false;` (the default), on any sprite, including `ground`.
- `const m = score >= 4;` or `if (score > 3) {}` (alternative `x > 3` anywhere), `ball.opacity -= 0;`, `ball.opacity = 1 - 0;`, `ball.mass = ball.mass;`.
- `if (kb.pressing('x')) { score++; }` or any `n++/+=` under any `kb.press*` if (the "count goes up on a key press" alternative does not ask that the count be used). Harness: the game plays exactly like the starter.
- Dead code counts: a never-called function holding `frameCount % 120` is 1/1.
- Ungraded parts of what the steps ask: Challenge 2's "TILT shows until R" and "R puts the count and the tilt back", Challenge 3's "show the round", and step 2's one-sentence comment (no card; fine if intended, but then say so in the step as 5.3.19 s4 does).
- Suggested fix, keeping "any one challenge counts": `frameCount` alternative becomes `frameCount\s*%`; the gravityScale/rotationLock alternative gets a non-default value (`gravityScale\s*=\s*(?!1\b)`, `rotationLock\s*=\s*(?!false\b)`); the `>3` alternative becomes `if\s*\([^)]*>\s*3` with a statement after it; the opacity alternative stays.
- Must still pass: the reference (all three), and one honest single-challenge answer each: `p.opacity = p.life / 40` in a loop; `-= 0.025`; `lerp`/`map` of life; a tilt using `frameCount % 120`, or `ticks % 120`, or `nudges >= 4`, `nudges > LIMIT`; a heavier ball with `if (round >= 2) ball.mass = 3`, `ball.mass = round * 2`, or a ternary. All of these pass today and I checked them, so the tightening above must not lose them.
- Must still fail: the one-liners above, starter 0/1.

### F4. MEDIUM-LOW, 5.3.17 r3 is not tied to the popup, and r1's string route is a smuggle
- r3 first alternative accepts `x = new Sprite(...)` followed anywhere within 1500 chars by `x.life = n`, so a decoy works: with the hit-if holding only a bare `new Sprite();` (r2 green) plus `const q = new Sprite(-9,-9,1); q.life = 1;` elsewhere, r3 is green. `pop.life = NaN`, `= nothing` (undefined name) and `= 99999` also pass.
- r3 second alternative (own countdown) accepts `ball.t--; if (ball.t <= 0) ball.delete();` with no popup.
- `pop.life = 40; ball.life = 40;` passes r3 although the lab says `ball.life` deletes the ball. Harness: the ball vanishes at frame 40 and the sprite count drops. The AI card names this as "not met" only when it is the only `.life`.
- r1 `orIn` has `ignoreStrings: false` (so it can read `'1'`), which also reads inside string literals: `const note = 'b1.text = 5';`, `` `x.text = 5` ``, `console.log('a.text = 1')` each turn r1 green (setup-only; comments are stripped correctly). Also one bumper labelled of three, or `ground.text = 5`, is green.
- Suggested fix: r1 `orIn` anchor to a statement start with the `m` flag: `(?:^|[;{}])\s*[A-Za-z_$][\w$\[\]]*\.\s*text\s*=...` (a `'` before `b1` then fails). r3: put `(?!NaN|undefined|null)` after the `=`, and require the countdown alternative's subject to appear in a `new Sprite` assignment in the file.
- Must still pass: the reference; `b1.text = 1; b2.text = 5; b3.text = 10;` (literals, orIn); `b1.text = '5'`; `for (const b of bumpers) b.text = String(b.worth);`; a `pop.life = 0.5 * 60;`; a `pop.t = 40` countdown with `q.t -= 1; if (q.t <= 0) q.remove();` over a `pops` list (passes today, keep it).
- Must still fail: starter 0/3; `pop.life = 0`, `-40`, `ball.life` alone, `b.life` alone (all refused today, good).

### F5. LOW-MEDIUM, honest shapes refused (all pattern-checker only; the AI card text says "however the student wrote it")
5.3.17
- r1: `const w1 = b1.worth; b1.text = w1;` refused (value reaches `.text` through a local). Word labels `'one'`, `'five'`, `'ten'` refused; the card says "or set to a number".
- r2: `if (touching === 1)` refused (count on the first frame, an honest edge test; the course only warns against `=== false`). `ball.collides(b)` in one `if` refused (is it taught anywhere in unit 5? `grep "collides("` finds no lesson that teaches it, so low).
- r3: popup returned from a helper, `const pop = makePop(b); pop.life = 40;` refused (the same helper with the `.life` inside it passes); popups made through a `Group` (`new popups.Sprite(...)`) fail r2.
5.3.19
- r3: `ball.debug = SHOW;` with `const SHOW = true;` refused, `ball.debug = showDebug` refused, `ball.debug = 'true'` refused. `ball.debug = 1` passes. A flag variable is a common shape; allow an identifier that is not `false`.
- r1: `keyIsDown(LEFT_ARROW)` refused. Not taught in this unit's lessons I could find, so noted only.
5.3.21
- Challenge 1: `const fade = p.life / 40; p.opacity = fade;`, `p.opacity = fadeOf(p)` (helper returns life/40), and a stepped fade `if (p.life < 20) p.opacity = 0.5;` are refused. `lerp`, `map`, `-=`, `/ LIFE` all pass. The `.opacity` alternative needs the life/arithmetic on the same statement.
- Challenge 2: a budget that counts down (`budget -= 1; if (budget < 0) ball.y = 500;`) refused. Counting up passes.
- Challenge 3: `function nextRound(){ round++; ball.mass = 3; }` called from the R block refused (a correct heavier-from-round-2 answer). The same body written inline in the R-if passes only because of an unrelated `round += 1` under `kb.presses`. Suggested: accept `\.mass\s*=` inside any function that also touches a `round`-like counter, or accept any mass assignment in a function called from the R block (`followCalls`).
- An "idea of your own" other than gravityScale/rotationLock (bounciness change, combo counter, lives, bumper flash, trail, pitch) is not accepted as the polish. The card says so, and the step text says own ideas are welcome "on top", so this is by design; report only because the AI card text says "a polish of the student's own that changes play, such as", i.e. wider than the pattern.
- Must still fail for all of F5 fixes: the F2 and F3 cheats above and the starters.

### F6. INFO, 5.3.20 playtest (AI-graded, not tested live)
- The page shows the prompt and a textbox; Submit for feedback is disabled at 0 chars. Server floor is 20 characters (`lib/grade-written-core.ts`). Pass for a 0-point rubric is "at least 2 of 4 criteria met or partial" (`isPassingGrade`).
- All four criteria text say "Be very generous ... when the response is about their pinball game at all ... mark this criterion met". So one 20-character sentence about the game is 4/4 by the rubric's own wording; nothing can check that three rounds were played. That matches the lax policy; I would not tighten.
- The criterion titles (shown in the feedback) read "Played at least three rounds, or watched someone else play one", "Names one change from this polish arc and what it changed for a player" while the checked bar is "mentions anything about the game". If a teacher reads those titles in the grade view, they over-promise. Optional: soften the titles ("Says something about playing or watching") or leave as is.
- Prompt-injection and echo: the system prompt already marks a grading-instruction response as not an answer; pasting the question text back (it contains pinball, rounds, polish) was not tested and would likely be read as met under this rubric. Not a finding under the lax policy.
- Cross references check out: 5.3.11 "Playtest and reflect: Pinball", 5.3.19 "Lab: Nudge the table" and the 5.3.15 to 5.3.19 range exist with those titles.

## Checked and fine
- Comment smuggling: every card in all three labs strips comments; the only string-readable hole is F4's r1 `orIn`.
- Untouched starters 0/3, 0/3, 0/1 and references full.
- 5.3.17 r2 refuses the lab's own named wrong ideas (touching alone, colliding alone, straight in draw, setup, else branch, held touch, apart) and accepts the helper, nested-if, `hit` variable, `== 0` and `== false` shapes.
- 5.3.19 r1 refuses the mass-ignoring `vel.x +=` answer and `kb.presses`; accepts braces, else-if, ternary, difference-of-keys, const flag, helper, `forEach`, WASD, `applyForce(createVector(...))`.
- 5.3.21 accepts every honest single-challenge shape listed under F3.

## Not tested
- AI Check on all three labs and the 5.3.20 AI grade (dev has no AI).
- Whether Submit and the stored grade agree after a real AI verdict (the F-cheats lit Submit only through the pattern fallback).
- `npm run test:tolerance` and `scripts/test-grader-tolerance.mjs` (not run; my own build stood in). Adding the must-pass cases above to the accept list there would hold the F1 to F3 fixes.
