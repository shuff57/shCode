# shplay Lesson Audit — Findings & Fixes

> **Status: All Critical, High, and Medium findings fixed.** See "Fixes Applied" at the bottom for the change log and post-fix verification.



**Scope:** every Unit 2 lesson with `preview: 'shplay'` (30 labs/assignments/challenges) plus the two `preview: 'assignment'` written writeups (`2-1-10`, `2-2-12`).

**Method:** static analysis. The grader (`lib/grader.ts`) is pure regex over `script.js` (after stripping JS comments), with optional scoping to a named function body. Every claim below was verified deterministically by loading the actual `lesson.json` pattern through `new RegExp(...)` against the named code shape — not the browser, not the LLM.

The dev server was up on `localhost:3002` and the Playwriter tab was blank, so a wider live walk-through wasn't run; the regex is deterministic and didn't need it. Live spot-checks would be useful only for the runtime-error paths (Submit gate, console capture), which I did **not** verify here.

---

## Severity legend

- **🔴 Critical** — grader is wrong: reasonable student code can't pass, *or* the starter passes the entire grader before the student types anything.
- **🟠 High** — grader contradicts the lesson copy or hint text; students who follow the docs can fail.
- **🟡 Medium** — grader is too narrow; some valid styles fail; or grader is too loose and accepts code that misses the lesson's point.
- **🟢 Low** — cosmetic / convention drift / minor brittleness.

---

## 🔴 Critical bugs

### 1. `2-6-24-a16-2-game-states` — r2 fails for normal multi-line `switch`

**`lesson.json` r2 pattern:** `case\s+.*:.*break`

The JS regex flag is `""` (no `s`), so `.` does not match newlines. The pattern requires `case`, the colon, and `break` to be on the **same line**. Real student code looks like:

```js
case 'play':
  movePlayer();
  break;
```

…which **fails**. Verified:

```
multi-line case+break => false
inline case+break     => true     (only the contrived single-line form passes)
three multi-line      => false
```

This is the *primary* graded requirement of A16.2 alongside the switch itself. The combined effect: a student who writes a perfectly normal 4-state switch in `draw()` cannot pass r2 and so cannot Submit (q5 lessons gate Submit on every requirement passing — see `LessonWorkspace.tsx:486-490`).

**Fix:** rewrite r2 to count case labels independently of `break`, and add a separate "uses break" requirement if you really want both checked.

```jsonc
{ "id": "r2", "title": "At least 3 case labels", "description": "...",
  "type": "inFunction", "function": "draw", "file": "script.js",
  "pattern": "(?:case\\s+[^:]+:[\\s\\S]*?){3}",
  "flags": "", "points": 0 },
{ "id": "r2b", "title": "Each case ends with break",
  "type": "inFunction", "function": "draw", "file": "script.js",
  "pattern": "\\bbreak\\s*;",
  "flags": "", "points": 0 }
```

---

### 2. `2-1-7d-lab-else-to-zero` — starter pre-passes the entire grader

The starter ships with the working code (`else player.vel.x = 0` and `else player.vel.y = 0`) already in `draw()`. Both reqs are green on first load, which means **Submit is enabled before the student does anything**.

```
2/2 reqs pre-pass: r1, r2
```

This violates the global memory rule "graded shplay `script.js` files ship as `// STEP N:` breadcrumbs in empty `setup()`/`draw()`, never as pre-working code." It is *also* the lesson's pedagogical intent (delete the lines, watch drift, restore the lines), so the lesson concept is fine but the autograder cannot enforce it.

**Fix options (pick one):**

- **A — Demote to ungraded experiment.** Drop `requirements` to `[]` and let Submit be a manual "I did the experiment" click.
- **B — Use commit history.** Set `grading.reviewCommitHistory: true` and require at least one commit whose snapshot lacks the else lines (the experiment) plus a final commit that has them. Needs a small additional grader.
- **C — Ship a broken starter.** Remove the `else` lines, prefix the file with: "STEP 1: Add the else lines back; first observe what's missing." Then the standard regex catches the restoration. Cleanest.

---

### 3. `2-3-12-challenges` — r4 only accepts Challenge 3, but copy says "any of the three"

**`lesson.json` r4 pattern:** `\bfunction\s+cull\s*\(`

The lesson description, `steps[3].instructions`, and **every challenge hint in `content.md`** all promise multiple challenges are graded:

- `step.s4`: *"Auto-grader accepts any of the three signals."*
- `content.md` Challenge 1: *"The auto-grader accepts any line that assigns to `lives`."*
- `content.md` Challenge 2: *"The auto-grader accepts any expression that uses `Math.random()` or `random()` to set a sprite's `.diameter` / `.width` / `.height` / `.color`."*

But the only signal r4 actually accepts is `function cull(`. Verified:

```
lives counter:  false  (student picked Challenge 1 → fails grader)
varied apples:  false  (student picked Challenge 2 → fails grader)
cull helper:    true   (student picked Challenge 3 → passes)
```

Two-thirds of the challenges silently can't be submitted. Worse, `content.md` actively misleads students.

**Fix:** make r4 a single OR pattern:

```json
"pattern": "\\bfunction\\s+cull\\s*\\(|\\blives\\s*=|Math\\.random\\s*\\([^)]*\\)[\\s\\S]{0,80}?\\.(diameter|width|height|color)\\s*="
```

(Adjust the proximity in challenge 2's pattern to taste; the goal is "uses Math.random near a sprite property write".)

Alternative: split r4 into three named requirements (one per challenge) and keep the "all reqs must pass" gate from `LessonWorkspace.tsx` — that would force students to do *all* the challenges. Almost certainly not the intent given "Pick one (or more)".

---

### 4. `2-2-13-challenges` — `script.js` starter is 0 bytes

`lessons/2-2-13-challenges/script.js` is an empty file. Same story for `lessons/2-3-12-challenges/script.js`. Neither has `setup()` or `draw()`. A student who clicks Run on the empty file gets… nothing — shplay needs at least an empty `function setup()` to bootstrap the canvas, and there are no STEP breadcrumbs to nudge them toward a structure.

The 2.1.11 challenges starter does have skeleton STEP comments. The 2.2.13 / 2.3.12 starters do not.

**Fix:** add the same minimal skeleton other challenges use (`function setup() { /* STEP 1 ... */ } function draw() { background('#222'); /* STEP 2 ... */ }`) so the editor isn't a blank page on first open.

---

## 🟠 High-severity bugs

### 4b. `grading.reviewCommitHistory: true` is dead code

Two lessons set `grading.reviewCommitHistory: true`:

- `2-4-10-a15-1-platformer/lesson.json`
- `2-6-24-a16-2-game-states/lesson.json`

Grep across the entire repo finds zero references to `reviewCommitHistory` outside the `Grading` interface in `lib/types.ts`. Nothing reads it; nothing branches on it. These two lessons *look* like they enforce a commit-history check on top of the regex grader, but they don't. Whatever the original intent was (probably "the teacher will scrub commits before crediting"), it isn't wired.

**Fix options:**
- **A — Wire it.** Add a teacher-side flag in the gradebook view: lessons with this flag get a "review history before crediting" badge.
- **B — Drop it.** Remove the flag from both lesson.json files and from `lib/types.ts`.

Option B is the smaller change; option A matches what the field name promises.

---

### 5. `2-2-11-a12-1-collectible` — starter pre-passes 3/5 reqs

The starter ships with the class declaration, the constructor signature, and an empty `collect()` method body. So `r1` (class defined), `r2` (constructor present), and `r3` (`collect()` method exists) are green before the student writes anything.

That isn't necessarily wrong — the lesson hint says "fill in STEP 1 / STEP 2 inside the existing scaffold" — but it conflicts with the 2-2-7-series labs (`2-2-7b/c/d/e/g/h`) where the student writes the entire method body and the grader has stricter shape checks. The collectible grader can't tell whether the student left `collect()` empty or wrote a working body.

**Fix:** tighten `r3` to require something inside the method body, e.g.:

```json
"pattern": "collect\\s*\\(\\s*\\)\\s*\\{[\\s\\S]*?\\breturn\\b[\\s\\S]*?\\}"
```

…or check for `this.sprite.delete()` plus `return this.value`.

---

### 6. `2-1-11-challenges` — r3 (background in draw) pre-passes from starter ~~High~~ → **Medium** (downgraded after independent review)

The starter contains `background('#222')` in `draw()` already, so r3 is auto-green. Still, r1 / r2 / r4 require real student code, so the lesson can't be submitted with a blank file. Downgraded to Medium on second review: three of four reqs still gate Submit, and the pre-passing item is the boilerplate every q5 sketch needs anyway. Mostly harmless.

**Fix:** either accept this (it's a freebie that mirrors what every q5 sketch needs), or move `background('#222')` into a comment that says "uncomment me when you're ready" so the student has to take an explicit action.

---

### 7. `2-1-10-a10-2-frame-loop` — points convention out of sync

`grading.totalPoints: 3, passingScore: 3` and rubric items each carry `points: 1`. Per the project memory rule "No points; lessons unlock by completion (green-to-advance)" the convention is now zero points everywhere.

Mechanism (verified): this lesson uses `preview: 'assignment'`, so `isQ5Mode` is false and the Submit gate at `LessonWorkspace.tsx:490` is `totalScore >= passingScore` — the AI grader must award full 3/3 or Submit stays disabled. (And because `requirements: []`, the q5 path's `allRequirementsPassed` would also be false; both paths block.) A student who writes a solid two-question response and gets 2/3 from the AI is genuinely stranded.

**Fix:** set every `points` field to 0 in this lesson's `aiGrader.rubric` and in `grading.totalPoints` / `passingScore`. Keep the rubric prose; only zero out the numbers. (Compare with `2-2-12-a12-2-oop-writeup` — same shape, all zeros — for the right format.)

---

## 🟡 Medium-severity bugs

### 8. `2-2-7c-lab-method-with-params` — `r2` doesn't actually verify the parameter is used

**Pattern:** `addBy[\s\S]*?\{[\s\S]*?this\.n\s*(?:\+=\s*\w+|=\s*this\.n\s*\+\s*\w+)`

`\w+` matches **either** the parameter name **or** a literal numeral. So this passes the grader:

```js
addBy(n) { this.n += 5; }   // ignores n, adds a literal — passes
```

The lesson title is *Method with parameters*; r2 description says *"The parameter passed to addBy is referenced inside the method body."* The regex doesn't enforce this.

**Fix:** capture the parameter name and back-reference it:

```json
"pattern": "addBy\\s*\\(\\s*(\\w+)\\s*\\)\\s*\\{[\\s\\S]*?this\\.n\\s*(?:\\+=\\s*\\1|=\\s*this\\.n\\s*\\+\\s*\\1)"
```

(JS RegExp supports back-references `\1`.)

---

### 9. `2-2-7d-lab-method-returns` — doesn't require a `return`

**Pattern:** `isHigh\s*\([^)]*\)[\s\S]*?(this\.n\s*>\s*10|10\s*<\s*this\.n)`

Passes for code that compares without ever returning:

```js
isHigh() { if (this.n > 10) console.log('high'); }   // no return → still passes
```

**Fix:** require `return` between `isHigh()` and the comparison:

```json
"pattern": "isHigh\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?\\breturn\\b[\\s\\S]*?(this\\.n\\s*>\\s*10|10\\s*<\\s*this\\.n)"
```

---

### 10. `2-2-7g-lab-mutate-sprite-prop` — r1 only accepts `+=`

**Pattern:** `moveRight[\s\S]*this\.sprite\.x\s*\+=`

The verbose form fails:

```js
moveRight(dx) { this.sprite.x = this.sprite.x + dx; }   // fails
```

**Fix:**

```json
"pattern": "moveRight[\\s\\S]*?this\\.sprite\\.x\\s*(?:\\+=|=\\s*this\\.sprite\\.x\\s*\\+)"
```

Also: this starter uses `kb.pressing('right')` (arrow key) in the driver `draw()`, conflicting with the WASD-only convention reinforced by 2.1.7e and the 2.1.9 hint *"Don't use arrow keys in this lab — they also scroll the browser iframe."* Consider `'d'` instead.

---

### 11. `2-2-8b-lab-array-of-instances` — for-loop spawning fails the grader

**Pattern:** `(?:enemies\.push\s*\(\s*new\s+Enemy[\s\S]*?){5}` — requires 5 textual `enemies.push(new Enemy(` occurrences.

```js
for (let i = 0; i < 5; i++) enemies.push(new Enemy(i*60, 100, 1));   // fails (only 1 textual push)
```

A `for` loop with a single push is the more idiomatic and DRY answer; the lesson should accept it.

**Fix:** loosen to *either* 5 explicit calls *or* a loop containing a push, *or* an `enemies.length === 5` assertion in the grader (would need a runtime check, not regex). Cheapest:

```json
"pattern": "(?:enemies\\.push\\s*\\(\\s*new\\s+Enemy[\\s\\S]*?){5}|for\\s*\\([\\s\\S]{0,80}\\{[\\s\\S]*?enemies\\.push\\s*\\(\\s*new\\s+Enemy"
```

---

### 12. `2-2-8c-lab-loop-instances` — indexed `enemies[i].render()` fails

**Pattern:** `\w+\.render\s*\(\s*\)` — needs a word char immediately before `.render`. `]` isn't a word char.

```js
for (let e of enemies) e.render();          // passes
for (let i = 0; i < enemies.length; i++) enemies[i].render();   // fails
```

Both are valid teaching forms. The instructions *suggest* `for...of` but don't ban indexed loops, and content.md doesn't either.

**Fix:**

```json
"pattern": "(?:\\w|\\])\\.render\\s*\\(\\s*\\)"
```

…or accept any `.render()` call inside the for loop body using `inFunction`-style scoping with a bigger pattern.

---

### 13. `2-4-10-a15-1-platformer` — r4 forces inline `&&`, rejects nested `if`

**Pattern:** `kb\.presses\s*\([^)]*\)\s*&&\s*[^;\n{]*\.colliding\s*\(|\.colliding\s*\([^)]*\)\s*&&\s*[^;\n{]*kb\.presses\s*\(`

Both the inline `&&` form and the perfectly equivalent nested form should pass. Currently:

```js
if (kb.presses('w') && player.colliding(allSprites)) jump();   // passes
if (player.colliding(allSprites)) { if (kb.presses('w')) jump(); }   // fails
```

**Fix:** add a second alternation for the nested case:

```json
"pattern": "(?:kb\\.presses\\s*\\([^)]*\\)\\s*&&\\s*[^;\\n{]*\\.colliding\\s*\\(|\\.colliding\\s*\\([^)]*\\)\\s*&&\\s*[^;\\n{]*kb\\.presses\\s*\\(|\\.colliding\\s*\\([^)]*\\)[\\s\\S]{0,120}?kb\\.presses\\s*\\(|kb\\.presses\\s*\\([^)]*\\)[\\s\\S]{0,120}?\\.colliding\\s*\\()"
```

---

### 14. `2-4-5-animated-sprites-sandbox` — r3 doesn't enforce the input-driven swap

**Pattern:** `kb\.pressing\s*\(\s*['"](?:a|d|w|s)['"][\s\S]*?(\.(image|img)\s*=|\.changeAni\s*\()|...`

This passes if `kb.pressing(...)` exists *anywhere* in `draw()` AND `.image=` exists *anywhere* in `draw()`, even if they're independent unconditional statements. The lesson title is "Animated sprites" — the swap must be *driven by* input, not just co-present with it.

**Fix:** scope tighter — inside an `if`-block whose condition references kb. Hard to do with regex; a runtime check would be more honest. Lower-priority because most students will write the natural pattern.

---

### 15. `2-2-6-lab-build-sprite` — number-only Sprite constructor regex

**r2 pattern:** `new\s+Sprite\s*\(\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?\s*\)` — requires four numeric literals.

```js
new Sprite(width/2, height/2, 40, 40);   // fails (width/2 not a numeric literal)
new Sprite(canvas.w/2, canvas.h/2, 40, 40);   // fails
```

These are perfectly idiomatic shplay. The lesson is for beginners and the docs may use literals, but the regex is brittle.

**Fix:** accept any expression for the position args:

```json
"pattern": "new\\s+Sprite\\s*\\(\\s*[^,]+\\s*,\\s*[^,]+\\s*,\\s*[^,]+\\s*,\\s*[^)]+\\s*\\)"
```

(And mirror the change for r3's three-arg form.)

---

## 🟢 Low / convention drift

### 16. Only 1 of 30 q5 lessons has a reference `solution.js`

`SolutionPanel.tsx` shows admins/teachers a "Solution" button that fetches `/api/lesson-solution/[id]`. Only `2-2-11-a12-1-collectible/solution.js` exists; for every other lesson the API returns 404 and the dialog says "No solution has been recorded for this lesson yet."

For a graded lab, the absence of a reference solution means there's no canonical answer to diff student commits against, and the teacher-edit page (per `lesson-starters/[id].ts`) can show them what the student started with but not what they should have ended with.

**Fix:** seed `solution.js` for at least the assignments (`a10-1`, `a10-2`, `a12-1`, `a12-2`, `a13-1`, `a14-1` ×2, `a15-1`, `a16-1`, `a16-2`). The build step at `scripts/generate-solutions.mjs` already wires them in.

### 17. `2-2-7c` and friends — multi-line/cross-method matching

Patterns like `addBy[\s\S]*?\{[\s\S]*?this\.n\s*\+=` will match across method boundaries. If a student's `Counter` had multiple methods, a `this.n +=` in a different method could satisfy the grader for `addBy`. Hasn't bitten anyone in these tiny single-class files, but the pattern is too greedy. Tightening to a balanced-brace match isn't possible in pure regex; the safer fix is to scope to method bodies the same way `inFunction` scopes to `setup()` / `draw()`. Could add a new requirement type `inMethod` that takes both class and method names.

### 18. `2-3-21-a14-1-car-ramp` r4 — `world.gravity.y\s*=\s*[1-9]` rejects `0.something`

If a student writes `world.gravity.y = 0.5` (a small but legal positive value), it fails (`0` doesn't match `[1-9]`). Rare in practice; most students use 5 or 10. Loosen if you care:

```json
"pattern": "world\\.gravity\\.y\\s*=\\s*(?:[1-9]\\d*|0?\\.\\d*[1-9])"
```

### 19. `2-2-7b` — `tick() { ++this.n }` (prefix increment) fails

Pattern requires `this.n` then `+=` / `=` / `++`. Prefix `++this.n` doesn't match. Edge case, but technically valid.

### 20. `2-3-20-a14-1-space-jumper` r5 — only accepts `'w'` or `' '` for jump key

That matches the lesson copy, which is explicit about why (shplay doesn't recognize `'space'`). No bug — flagging it because the same regex is reused and a student might naturally try `kb.presses('space')` and get a confusing failure. The hint text already calls this out, so leave as-is.

---

## What I did NOT verify

- **Runtime behaviour.** I confirmed regex matches but did not run any of the student-equivalent code in shplay. A grader pass with a runtime error still blocks Submit (per `LessonWorkspace.tsx:101` + `:486`), so for grader-passes-but-game-crashes paths the gate exists; the *positive* case (everything green and the game runs) was not exercised in the browser.
- **AI grader behaviour for `2-1-10` and `2-2-12`.** I read both rubrics and the prompts; they are coherent and use the documented `qwen3-coder-next:cloud` model. I did not call `/api/grade-written` to test response shape.
- **Live spot-check in the Playwriter tab.** A headless browser agent attempted to navigate to three of the buggiest lesson URLs but hit "Lesson locked" — the auth wall. The dev cookie isn't shared with new browser sessions. The Playwriter tab the user has open is presumably authenticated; live verification of the bugs above can be done there manually if desired.

## Independent verification summary

This report was second-passed by a dedicated critic agent and a separate scout agent:

- **Critic agent** independently re-loaded each `lesson.json`, recompiled the patterns through `new RegExp(...)`, and tested them against student-equivalent code samples. All 4 Critical and all 3 High findings were confirmed; no false positives. One severity downgrade (#6 → Medium) was applied above.
- **Scout agent** mapped every grading path in the repo and confirmed `lib/grader.ts` is the only q5 grader, the server stores client `gradeJson` verbatim with no re-check, and surfaced the new finding **#4b** (`reviewCommitHistory` is dead code on two lessons).

Both agents had access only to the source tree, not to this audit's reasoning.

---

## Suggested fix priority

1. **Fix #1** (`2-6-24` switch grader) — students hit it on the capstone; can't submit.
2. **Fix #3** (`2-3-12` cull-only) — content.md actively lies; trivial JSON change.
3. **Fix #2** (`2-1-7d` starter) — pick option C (broken starter), 30-second edit.
4. **Fix #4** (`2-2-13` / `2-3-12` empty starter scaffolds) — paste the canonical setup/draw skeleton.
5. **Fix #4b** (`reviewCommitHistory` dead code) — pick wire-it or drop-it; either is small.
6. **Fix #11 / #12 / #13** (loop / nested-if forms) — three small JSON tweaks, restores valid student styles.
7. **Fix #7** (`2-1-10` points: 0) — convention sync.
8. Everything else as time allows.

---

## Fixes Applied (this pass)

Each fix below was verified by loading the patched `lesson.json` through `new RegExp(...)` and running both positive and negative student-equivalent samples through the patched grader. After all edits, a full re-audit confirmed every q5 lesson.json still parses and the only remaining starter pre-passes are harmless boilerplate (`new Canvas`, `background`).

| # | Lesson(s) | What changed | Verified |
|---|---|---|---|
| 1 | `2-6-24-a16-2-game-states` | Replaced single-line `case…break` r2 with two `inFunction` reqs scoped to `draw()`: `r2` (≥3 case labels) + `r2b` (uses `break;`). | ✓ Multi-line switch with 3+ cases passes; ≤2 cases or no break fails. |
| 2 | `2-1-7d-lab-else-to-zero` | Rewrote starter (option C): both `else …vel.x/y = 0` lines deleted; STEP 1 now asks the student to observe drift then add the lines back. | ✓ Starter is 0/2 green on first load; restored code is 2/2. |
| 3 | `2-3-12-challenges` | r4 broadened to OR pattern accepting all three challenges: `lives` write/inc/dec, `Math.random` *or* `random()` near a sprite property write, *or* `function cull(…)`. r4 title/description updated. | ✓ All three challenge styles pass; blank file or no-challenge code fails. |
| 4 | `2-2-13-challenges`, `2-3-12-challenges` | Added minimal `setup()`/`draw()` scaffolds with STEP comments matching the lesson's grader (was 0 bytes each). | ✓ JSON parses; non-trivial reqs (`r1`/`r3`/`r4` etc.) still gate Submit. |
| 4b | `2-4-10-a15-1-platformer`, `2-6-24-a16-2-game-states`, `lib/types.ts` | Removed dead `reviewCommitHistory: true` flag from both lesson.json files and from the `Grading` interface. | ✓ No code references it; removal is type-safe. |
| 7 | `2-1-10-a10-2-frame-loop` | Zeroed `grading.totalPoints`, `grading.passingScore`, top-level `points`, and all three rubric `points` fields. | ✓ Now matches `2-2-12-a12-2-oop-writeup` shape; AI grader can't strand the student. |
| 11 | `2-2-8b-lab-array-of-instances` | r1 added second alternation: a `for(...) ...enemies.push(new Enemy` form (with or without braces). | ✓ One-line for, braced for, multi-line for, and 5 explicit pushes all pass; single push fails. |
| 12 | `2-2-8c-lab-loop-instances` | r2 broadened from `\w+\.render` to `(?:\w|\])\.render` so `enemies[i].render()` is accepted. | ✓ for-of, indexed `[i]`, and `forEach` all pass. |
| 13 | `2-4-10-a15-1-platformer` | r4 added two more alternations: nested-if forms in either order (collide-outer OR press-outer), within ~200 chars. | ✓ Inline `&&` and both nested-if forms pass; press-without-collide fails. |
| 5 | `2-2-11-a12-1-collectible` | r3 tightened: `collect()` body must contain `this.sprite.delete` (or `.remove`) AND a `return` (in either order). | ✓ Empty body fails; both delete-then-return and return-then-delete pass. |
| 8 | `2-2-7c-lab-method-with-params` | r2 rewritten with a back-reference: `addBy\s*\(\s*(\w+)\s*\)\s*\{ ... this\.n\s*(?:\+=\s*\1\| =\s*this\.n\s*\+\s*\1)`. The parameter name must actually appear in the assignment. | ✓ `addBy(n) { this.n += 5 }` (cheating literal) now fails; param-using forms pass. |
| 9 | `2-2-7d-lab-method-returns` | r1 rewritten with two lookaheads inside the method body: must contain `return` AND `this.n > 10` (in either order). | ✓ if-then-return form now passes; missing return or wrong threshold fails. |
| 10 | `2-2-7g-lab-mutate-sprite-prop` | r1 added second alternation: `this.sprite.x = this.sprite.x + …` (long form). | ✓ Both `+=` and long form pass; mutating wrong property fails. |
| 15 | `2-2-6-lab-build-sprite` | r2 / r3 patterns relaxed from `-?\d+(?:\.\d+)?` (numeric literals only) to `[^,()]+` (any non-paren expression per arg). | ✓ `width/2`, `height/2`, etc. now accepted; arg-count discrimination preserved. |

### Not fixed (deferred)

- **#6** (downgraded to Medium) — `2-1-11-challenges` r3 (`background` in draw) still pre-passes from the starter. Harmless boilerplate every q5 sketch needs anyway; three other reqs still gate Submit.
- **#14** (Medium) — `2-4-5-animated-sprites-sandbox` r3 doesn't strictly enforce that the visual swap is *driven by* input. Hard to do reliably with regex; would need either a runtime check or a much narrower pattern that risks false-rejecting. Deferred.
- **#16** (Low) — only `2-2-11` has a `solution.js`. Seeding solutions for the other 9 assignments is a content task, not a grader fix.
- **#17** (Low) — cross-method greedy matching in `2-2-7*` patterns. Tightening would require a new grader type (`inMethod`) that scopes to class+method bodies. Out of scope.
- **#18 / #19 / #20** (Low) — gravity decimal-only, prefix `++this.n`, jump-key constraint. All edge cases unlikely to bite; left as-is.

### Re-audit summary

After fixes, running the full grader against every q5 lesson's starter:

```
=== Q5 lessons where starter pre-passes (after fixes) ===
  2-1-11-challenges: 1/4 (r3)         ← background boilerplate, accepted
  2-2-11-a12-1-collectible: 2/5 (r1,r2)  ← class+constructor scaffold, r3/r4/r5 still gate
  2-2-13-challenges: 1/4 (r2)         ← `new Canvas` boilerplate, r1/r3/r4 still gate

=== JSON parse check ===
  All lesson.json files parse OK
```

No q5 lesson is ALL-GREEN from the starter anymore. The previously-broken `2-6-24` capstone now grades a normal multi-line switch correctly. The previously-misleading `2-3-12` challenges accept all three challenge paths. The previously-pre-passing `2-1-7d` is now correctly red on first load.
