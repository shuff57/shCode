# Module 5.1 walk, strong-student lens (cs-student-advanced)

Date 2026-11-03, branch `codehs-inspiration`. No repo file edited; only this report was written.
Method: the real `lib/grader.ts` (`gradeWithTests`, each lab's own `lesson.json`), about 150 named cases, with every case's per-requirement result recorded. Browser (`w51a`, headless, dev server 3002) for five spot checks. The dev server has no AI, so Check falls back to the pattern check ("The grader isn't responding right now ... the pattern check marked your cards instead"). **The AI Check itself was not tested.** Every verdict below is the pattern fallback.

**Numbering trap.** The titles you named are display titles. The folders differ: 5.1.19 = `5-1-18-lab-else-to-zero`, 5.1.22 = `5-1-21-a10-1-sprite-playground`, 5.1.24 = `5-1-23-challenges`. (`5-1-22-a10-2-frame-loop` is 5.1.23, the written reflection, not in scope.)

**Baseline.** All seven references score full. Untouched starters: 5.1.7 0/3, 5.1.11 0/4, 5.1.20 0/7, 5.1.22 0/8, 5.1.25 0/4. Two are above 0 by design: 5.1.19 is 2/3 (ships working) and 5.1.24 is 1/4 (`background(` is in the starter).

**Gate that changes the stakes.** A run error locks Submit even when every card is green. Verified on 5.1.25 (below). So a sketch that crashes cannot be submitted whatever the cards say.

---

## Ranked findings

### 1. 5.1.22 r6 "Automatic motion for the mover": passes with the mover not moving. CARD IS MEANINGLESS
r6's frameCount branch matches `frameCount` anywhere inside `draw()`/`update()`, not tied to `mover`. This is hit by accident, not only by gaming.

Natural accident (reference, with the mover line deleted and the label changed to show the frame count):
```js
  // mover.x line removed
  fill('white'); textSize(14);
  text('frame ' + frameCount, 12, 24);
```
**8/8.** The mover sits still. Also 8/8: `player.rotation = frameCount;` in place of the mover line, `let t = frameCount;`, `console.log(frameCount);`, and `mover.vel.x = 1; mover.vel.x = 0;` in draw (the velocity alternative reads the first assignment only).
With the mover line simply deleted it correctly scores 7/8, so the card is doing real work except through this one hole.

Fix, verified offline (alt 2 only, a lookahead that the same draw/update body also names `mover`):
`function\s+(?:draw|update)\s*\([^)]*\)\s*\{(?=B\bmover\b)B\bframeCount\b`, where `B` is the existing body matcher `(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\}|\{)*?`.
- Now fails: the label accident, `player.rotation = frameCount`, `let t = frameCount;`, frameCount only in setup, keys-only mover, the starter.
- Must still pass (run, all pass): the reference; an intermediate variable (`const t = frameCount * 0.05; mover.x = 80 + Math.sin(t) * 60;`); `mover.rotation = frameCount * 2` inside a braced `if`; `mover.x = frameCount % 500`; `mover.pos.x += 1`; `mover.vel.x = 2` in setup.
- Residual, accepted under lax policy: `if (mover.y > 400) mover.y = 0;` plus a frameCount label still passes.
- Timing: four 4,500 to 6,000 character adversarial inputs took 2 ms each. The repo's own 5.1.22 r6 list in `scripts/test-grader-tolerance.mjs` was not re-run; run `npm run test:tolerance` before shipping.

### 2. 5.1.20 r3 to r6: keys are never connected to velocity. SPLIT VERDICT
Shortest, with the starter's `let player;` kept:
```js
function setup() { new Canvas(400, 400); player = new Sprite(); }
function draw() {
  background(0);
  kb.pressing('a'); kb.pressing('w');
  player.vel.x = 4; player.vel.y = 4;
}
```
Browser: **7/7, Submit lit**, Run shows a sprite drifting off diagonally. Pattern check only: `new Canvas(` and `new Sprite(` anywhere, any size; `kb.pressing('a'` and `kb.pressing('w'` anywhere in draw; any `.vel.x =` and `.vel.y =`.
- **Card is meaningless** for this bare-call shape (r3/r4 and r5/r6 are each satisfied by unrelated statements). It needs a deliberately odd program, so low real-world frequency.
- **Acceptable under lax policy** for what a real beginner writes, and these all score 7/7:
  - keys read, no `else`, no zero (the sprite drifts forever, the exact bug 5.1.18 and 5.1.19 teach);
  - `'w'` mapped to a positive `vel.y` (up goes down).
- **Missing measurement, new framing.** Step 4's only new idea is "up is a negative `vel.y`", and no card in 5.1 grades the sign (5.1.22 does not either). Else-to-zero is graded elsewhere in the module (5.1.19 r1/r2, 5.1.22 r5), so that gap is covered. The sign is not covered anywhere. A lax-compatible card would be `kb.pressing('w'|'up')` followed within one statement by `.vel.y = -`. Do not propose that without running it against the reference: the reference uses an `if ... else if` chain and a ternary form would need its own alternative.
- Known and unchanged (`ch5-advanced.md` 1.1): r3/r4 have no `ignoreStrings`, because the key name lives in a string. `let k = "kb.pressing('a') kb.pressing('w')";` plus the two `.vel` assignments scores 7/7. Contrived, listed for the record.
- Not a hole: the regex-literal comment trick (`/'/ // text(`) was run on 5.1.11, .20, .24 and .25 and gained nothing in any of them.

### 3. 5.1.24 r4 "advanced feature": name-drop passes. ACCEPTABLE UNDER LAX POLICY
Canvas, sprite, and `sin(0);` or `text();` or `mouse.x;` in `draw()` is 4/4. The card says one challenge is built; the pattern only sees a function name. It is open-ended by design (listed in `ch5-advanced.md`), and the AI prompt asks for "would really run". Nothing to change. Not tested in the browser: the offline result is the same code path as finding 2.

### 4. 5.1.24 r4 refuses the trail answers, and the trail text is orphaned. WRONGLY REFUSED (new since the rgba rewrite)
`content.md` Challenge 5 is now the trail (easy path `background('rgba(34, 34, 34, 0.1)')`, honest path array plus `circle` plus `fill('rgba(...)')`).
- The easy path genuinely works: browser screenshot shows a fading white trail behind a moving sprite.
- Both paths score **3/4** (r1/r2/r3 pass, **r4 red**). Browser: Check falls back, card red, Submit disabled.
- Cause 1: the easy path is `background(...)` with the colour in a string, and r4 has `ignoreStrings: true`, so `'rgba(...)'` is blanked. The pattern cannot tell it from `background('#222')`. Only the AI can accept it.
- Cause 2: no alternative for `circle(`, `.rotation =`, or a bare `frameCount`. (The AI prompt says "a timer built from frameCount" counts; the regex accepts only `frameCount %`.)
- **Cause 3 (worse): the student cannot see this text.** The step panel lists a different Challenge 5 ("a wave", `sin`). I looked at the Steps tab and the File tab (script.js only) and searched the page: "Trail effect" is nowhere. `content.md` on this moshion lesson is not rendered to students. The rewrite is reachable only through the Docs drawer, if they go looking.
- Fix for the honest path, verified: append `|\bcircle\s*\(|\bframeCount\b|\.rotation\s*=(?!=)` to r4.
  - Now passes: the trail array with `circle`, `player.rotation = frameCount`, `if (frameCount > 120) player.color = 'red'`.
  - Must still fail (all fail): starter, keys-move-only, colour set with no key test (both are the repo's own reject cases), a string holding `sin( cos( text( circle( frameCount`, a comment holding `circle(1,1,1) frameCount`, `circle(` only in `setup()`. The reference still passes.
- The easy path stays AI-only. Decide whether to say so in the step text, or to drop the rgba "Easy path" from `content.md` or move it into the step panel (author's call).
- Unverified: whether the AI marks the easy path "met". Its r4 text does not name trails.

### 5. 5.1.7: the lab's point is ungraded by design; r1/r2 refuse negative and decimal coordinates. LOW
Shortest 3/3: `new Sprite(1,1,1,1).color='a'`. The prediction steps (what will move) can never be measured; the card text says only that the numbers changed. Adding a second sprite and leaving the original also scores 3/3. All acceptable: the lab is "No new code to write", 0 points.
Refused (honest): `new Sprite(-20, 60, 140, 30)` and `new Sprite(60.5, 60, 140, 30)` each score **1/3**: r1 and r2 both fail because the number tokens are `\d+`. A backtick colour (`` `gold` ``) loses r3. The 5.1.6 text names single quotes only, so this is minor.
Fix, verified: replace the number tokens in r1 and r2 with `-?\d+(?:\.\d+)?`. Reference passes, starter fails, "only moved" still fails r2, "only resized" still fails r1.
The string trick `let n = "x.color = 'gold'";` gets r3 only (1/3), so it cannot pass the lab.

### 6. 5.1.19: the observation is unmeasurable; the end state is the rule. ACCEPTABLE
The starter is 2/3. Shortest pass: change one `4` to `5` (`player.vel.x = -5`). Steps 2 and 3 (delete the else lines, watch the drift) leave no trace, and cannot. What is graded is the restored else plus a new speed, which is the stated learning.
- Accepted but wrong: `-4.0`, `-41`, `-2*2` (still speed 4) pass r3. `if (false) {} else player.vel.x = 0;` passes r1/r2. Contrived; skip.
- Refused (the lab names "the else lines", so acceptable): reset-first (`vel = 0;` then bare ifs) and nested ternary both score 1/3. 5.1.20 accepts the ternary and 5.1.22 r5 refuses it; the inconsistency is the only note-worthy part.
- `else player.vel.x = 0.0` fails r1 (the `0(?![\w.])` guard), trivial.
- Two variants an honest student writes pass: `else { player.vel.x = 0; }` on its own lines, and a `speed` or `SPEED` variable (`-speed`, `speed`).

### 7. 5.1.11: all four cards are presence checks. ACCEPTABLE
Shortest 4/4: `function setup(){new Canvas();new Sprite().color=1}function draw(){background()}`.
Not graded: 400 by 400, (200, 200, 40, 40), the `player` variable, any real colour. `new Canvas(1,1)` with a 0 by 0 sprite is 4/4. `new Canvas(` inside `draw()` is 4/4. `.color =` on a plain object counts. Comments and strings smuggle nothing (0/4 for the reference wrapped in either). `player.color` on a never-made `player` is 4/4 on cards but dies at run time, so Submit is locked. Everything a card names is still necessary to pass, so the lab's "four calls" point survives a one-liner. Arrow-function `draw = () => {}` loses r4; function expressions are not taught, so not a finding.

### 8. 5.1.25 (optional math grid): ungraded; the run-error gate holds. ACCEPTABLE
Lab is 0 points. Shortest 4/4, no canvas: `function setup(){world.origin='math';new Sprite(0,1)}function draw(){showGrid();showMouse()}`.
- r2 has no `ignoreStrings`: `let m = "world.origin = 'math'";` passes r2. Optional and ungraded, so nothing at stake.
- Order: `world.origin = 'math'` after the sprite is 4/4 on cards. Browser: the sketch stops with the red error "world.origin = 'math' must come before any sprite is made ...", the bar reads "Run your code again — the last run had an error", and **Submit is disabled**. So the gate does the measuring the regex cannot.
- Refused (honest, rare): a y of `25*2` or a `y` variable (r3), origin through a variable (r2), `showGrid`/`showMouse` inside a helper that `draw()` calls (r1 and r4), a sprite below the centre (-50, r3, pinned on purpose by the repo's own reject list). `showGrid()` with no spacing passes.

---

## Elegance cases, run as named tests (recorded)
| Lab | Answer | Result |
| --- | --- | --- |
| 5.1.7 | sprite in a variable, `.color` on a later line | 3/3 |
| 5.1.7 | hex colour `'#ff0'` | 3/3 |
| 5.1.7 | capital `'Tomato'` (still tomato) | 3/3 (passes) |
| 5.1.7 | `s.x = 60; s.y = 60; s.w = 140; s.h = 30` after the constructor | 1/3 (numbers must be in `new Sprite(...)`) |
| 5.1.19 | braced `else {}`; `speed` variable; decimal speed | 3/3 |
| 5.1.19 | reset-first; ternary | 1/3 |
| 5.1.20 | arrows; mixed WASD plus arrows; `a`/`left` with `||`; ternary; `(d - a) * 4` one-liner | 7/7 |
| 5.1.20 | `'ArrowLeft'` spelling (AI prompt says it works) | 5/7 |
| 5.1.20 | key names held in constants | 5/7 |
| 5.1.20 | movement inside `update()` | 3/7 (update is taught in 5.2, fine) |
| 5.1.22 | `mover.x += 2`; `.pos.x += 1`; `% 500`; `rotation`; template-string label; arrow keys | 8/8 |
| 5.1.22 | ternary movement, no `else` (the AI description accepts it) | 7/8 (r5) |
| 5.1.22 | `mover.speed`/`direction` | 7/8 (r6; not taught in 5.1) |
| 5.1.24 | Challenge 1 to 5 as listed in the step; `Math.sin(`; `mouse.pressing()` | 4/4 |
| 5.1.24 | rotation; frameCount timer; trail (both) | 3/4 (finding 4) |
| 5.1.25 | double quotes, no spacing arg | 4/4 |

Policy note: none of the refusals above is recommended as a tightening, and the fix proposals loosen (4, 5) or tie a loose card to the thing it names (1). Finding 1 is the only change that makes a currently green card red; it stays within "accept anything remotely related" because every taught shape still passes.

## Not tested
- AI Check verdicts (dev has none). In particular whether the AI accepts the rgba trail.
- `npm run test:tolerance` with the proposed patterns applied.
- 5.1.22 r3/r4/r5/r7/r8 beyond the cases listed, and the 5.1.23 written reflection.

## Files
Harness and cases: `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/adv51a/` (`cases.cjs`, `run.cjs`, `run2.cjs`, `run3.cjs`).
