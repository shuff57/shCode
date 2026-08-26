# Lab Assignment Conventions

Canonical rules for **in-app auto-graded labs** — the Axxy series (A10.1, A11.1, A12.1, …) rendered with `preview: "moSHion"`. These are the major graded artifacts of each moSHion module. When a module spec's Artifacts table lists a `type: lab` entry, or a `lessons/<slug>/` has `lesson.json.type === "assignment"` + `preview === "moSHion"`, these rules are binding.

**Environment branches.** A module spec's `environment:` field picks the lab surface: sections 1–6 are the **moSHion** sandbox; §7 is the **console** track (units 1.x). The lab's `preview` mirrors the spec's `environment:`.

**Applies to:**
- `lessons/<slug>/lesson.json` where `type === "assignment"` AND `preview === "moSHion"` — sections 1–6.
- `lessons/<slug>/lesson.json` where `type === "assignment"` AND `preview === "console"` — §7.

**Canonical example:** `lessons/2-2-11-a12-1-collectible/`.

Labs ship **scaffolded** — `script.js` has a header comment, top-level `let` declarations, `setup()` / `draw()` skeletons, and `// STEP N:` comments **in plain English describing each task** — but the function bodies are empty and **no commented-out solution code is shown.** The Quest tab carries the graded requirements; the STEP comments tell the student what each step should accomplish without giving them the line of code that does it. This is structurally different from a `type: "challenge"` lesson, which ships **fully empty** (see `moshion-challenge-conventions.md` §4) — challenges deliberately remove the scaffold so the student structures the program themselves.

---

## 1. Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> <Lab Name>",
  "description": "<one line>. Auto-graded.",
  "type": "assignment",
  "estimateMins": 45,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "moSHion",
  "week": <n>,
  "slos": ["SLO-<n>"],
  "steps": [ ... ],
  "requirements": [ ... ],
  "grading": { "totalPoints": 0, "passingScore": 0, "allowLateSubmit": true }
}
```

### Field-by-field

- `type` — **must be `"assignment"`**. This is what toggles the "Assignment" badge in `lib/lesson-badges.tsx`.
- `estimateMins` — labs are the 30–60 min bucket. Shorter = challenge; longer = project/capstone.
- `steps` — author-side documentation. **Not currently rendered in the student UI** (the Quest tab shows `requirements[]`, see `moshion-lesson-conventions.md` §5). Each `step.id` should still correspond to the matching `// STEP N:` comment in `script.js` so the scaffold's structure mirrors the spec.
- `requirements` — **strict**. Each requirement checks a specific pattern the student must produce. Use `type: "regex"` for anywhere-in-file checks and `type: "inFunction"` for per-function-body checks.
- `grading.totalPoints` / `grading.passingScore` / `requirements[].points` — **always `0`.** The course is mastery-based: Submit is gated all-green (every requirement passed), not points-based. Keep the fields for schema compatibility; never assign a non-zero value. See `moshion-lesson-conventions.md` §1 field-by-field + §5 (green-to-advance lock).

### Requirement types

- `"regex"` — pattern must match anywhere in `file`.
- `"inFunction"` — pattern must match inside the named function body. `function` may be a single string or an array like `["draw", "update"]` (pattern passes if found in any).

## 2. File layout

```
lessons/<slug>/
├── lesson.json
└── script.js        # scaffold: header + lets + setup/draw skeletons + // STEP N: comments,
                     # empty function bodies, NO commented-out solution code
```

No `content.md` required — step instructions live in `steps[].instructions` inside `lesson.json` (and on the matching `// STEP N:` comments inside `script.js`). A `content.md` is acceptable only if the lab needs a longer hint reference beyond inline step text.

## 3. The scaffold rule — describe, never show

The line between an honest scaffold and a give-the-answer scaffold is whether the comments contain **runnable code that solves the step.** Plain-English descriptions of what to do are scaffolds. Commented-out lines that the student can uncomment are answer keys.

✅ Good — describes the task, no code:

```js
function setup() {
  new Canvas(400, 400);

  // STEP 1: Create a Group — assign new Group() to `stars`.

  // STEP 2: Set defaults on the Group (color, diameter, collider).
}
```

❌ Bad — commented-out solution:

```js
function setup() {
  new Canvas(400, 400);

  // STEP 1: Create a Group.
  //   stars = new Group();             // ← this is the answer

  // STEP 2: Set defaults on the Group.
  //   stars.color = 'yellow';          // ← these are the answer too
  //   stars.diameter = 10;
}
```

The student should be able to read the STEP comment and know **what** to do, then write the **how** themselves. If the comment makes the work mechanical (uncomment lines, fill in literal values), it isn't a scaffold — it's a worksheet.

### Step ↔ requirement ↔ scaffold alignment

| `lesson.json.steps[].id` | `script.js` STEP comment       | `lesson.json.requirements[]`       |
|--------------------------|--------------------------------|------------------------------------|
| `s1` Create a canvas     | `// STEP 1: Create a canvas …` | `r1` `new Canvas(`                 |
| `s2` Create sprites      | `// STEP 2: Create N sprites …` | `r2` `new Sprite(` (×N)            |
| `s3` Wire input          | `// STEP 3: Read WASD and …`   | `r3`, `r4` `kb.pressing(…)` checks |
| …                        | …                              | …                                  |

Not every step needs a requirement (some are prose-only guidance), and not every requirement needs a step (e.g. "clear the background" may be implicit), but the happy path is 1:1.

## 4. WASD, not arrow keys

Every moSHion lab that uses keyboard input should use **WASD**, not arrow keys. Arrow keys scroll the browser iframe on some platforms and break the lesson UX. Enforce this in both `steps[].instructions` hints and the requirement regex:

```json
"pattern": "kb\\.pressing\\s*\\(\\s*['\"](?:a|d)['\"]"
```

Not `['"](?:left|right)['"]`.

## 5. Don'ts

- **Do not include commented-out solution code in `script.js`.** STEP comments describe the task in plain English (see §3). Lines like `//   stars = new Group();` are answer keys, not scaffolds.
- **Do not ship a working solution.** Empty function bodies; the student writes them.
- **Do not include a `// BUILD THIS:` prose block** at the top of `script.js`. The header comment is one line (`// <numbering> <title> — <one-line tagline>` per `moshion-lesson-conventions.md` §4.2); longer task framing belongs in `steps[].instructions` and the matching `// STEP N:` comments inside the function bodies.
- **Do not use arrow keys** — WASD only. See §4.
- **Do not auto-grade velocity magnitudes** (e.g. `vel.x = 4`). Students should be free to pick any value in a reasonable range; the grader checks *that* velocity is set, not *what* it's set to.
- **Do not include `authored_by_email` or other DB-side fields in the starter.** Those belong to the commit pipeline, not the lesson.

## 6. Title convention

> **`<unit-numbering>` = three dotted numbers `U.M.N`** (e.g. `2.1.10`). Titles MUST start with that prefix or the lesson vanishes from `/module/U.M` and the home page. See [README §Title numbering](README.md#title-numbering--the-hard-rule).

`"<unit-numbering> <Lab Name>"` — no "Lab" or "Assignment" word in the title; the badge handles that.

Examples:
- `"2.1.10 Sprite Playground"` (A10.1)
- `"2.2.11 Collectible Class"` (A12.1)

## 7. Console environment branch

For `preview: "console"` labs (the Q1 / units-1.x track, spec `environment: console`). All of the above applies except as amended here. Established from `1-2-5-lab-first-if`, `1-2-9-lab-predict-comparisons`, `1-2-12-lab-guard-and`, `1-2-22-lab-count-to-ten`.

### 7.1 Surface

The console lab is the same LessonWorkspace as moSHion labs, but the preview runs the student's `script.js` **directly as JS** in the page context (`new Function`), capturing `console.log` / `console.warn` / `console.error` output into a console panel. There is no canvas, no `setup()` / `draw()`, no q5 API. The student's only output surface is the console panel; the grader reads `script.js` source text.

### 7.2 Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> <Lab Name>",
  "description": "<one line>. Auto-graded.",
  "type": "assignment",
  "estimateMins": 8,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "console",
  "week": <n>,
  "slos": ["SLO-<n>"],
  "steps": [ ... ],
  "requirements": [
    {
      "id": "r1",
      "title": "<student-readable label>",
      "description": "<what the check verifies, in one line>",
      "type": "regex",
      "file": "script.js",
      "pattern": "if\\s*\\(",
      "flags": "i",
      "points": 0
    }
  ],
  "grading": { "totalPoints": 0, "passingScore": 0, "allowLateSubmit": true }
}
```

`flags: "i"` is the console-track convention — every canonical example sets it, unlike moSHion requirements (case-sensitive by default, since moSHion identifiers like `Sprite`/`Canvas` are case-sensitive). Console-track patterns check plain JS keywords, where case doesn't carry meaning, so case-insensitive is standard here.

### 7.3 Field-by-field

- `preview` — **must be `"console"`.** Badge is `PREVIEW_BADGES.assignment`, not `.console` — `badgeForLesson` (`lib/lesson-badges.tsx`, used by the module lesson list and lesson cards) resolves `type` before `preview`, and `type: "assignment"` always wins. Matches `README.md`'s own Type index (Badge = Assignment for this row). `PREVIEW_BADGES.console` never renders for a graded lab.
- `type` — `"assignment"` (same as moSHion).
- `estimateMins` — the 5–15 min bucket, not moSHion's 30–60. Console labs are one-concept drills.
- `steps` / `requirements` — identical semantics to §1: `steps[].id` ↔ `// STEP N:` comment; requirements are `"regex"` (anywhere in file) or `"inFunction"` (inside named function body). **Only `"regex"` has been used in console labs to date.**
- `grading.totalPoints` / `passingScore` / `requirements[].points` — **all `0`**; the all-green Submit gate applies exactly as in §1.

### 7.4 File layout

```
lessons/<slug>/
├── lesson.json
├── script.js        # scaffold: one-line header + // STEP N: comments,
│                    # NO solution code — same describe-never-show rule as §3
├── index.html        # stub: <script src="script.js"></script>, nothing else
└── style.css         # stub: near-empty, one comment line
```

`index.html` and `style.css` aren't read by the console runner (`runCode()` in `LessonWorkspace.tsx` executes `script.js` directly via `new Function`, no iframe/`srcDoc`) — but every canonical example ships both as boilerplate stubs, so include them for consistency with the file-tree the student sees in the File tab.

No `content.md` required (step instructions live in `steps[].instructions`), matching §2.

### 7.5 Scaffold — same describe-never-show rule as §3

`// STEP N:` comments describe the task in plain English; no commented-out solution lines. The §3 line between scaffold and answer key applies verbatim — a console lab is a scaffolded drill, not a worksheet.

### 7.6 Don'ts (console-specific)

- **Do not use `prompt()` in any graded console lab.** It blocks the runner (`new Function` runs in the page context; a modal prompt hangs the lesson until the student answers, and the auto-grader's post-run `setTimeout(runTests, 200)` fires against unfinished code). Confine `prompt()` to the worked example, where the teacher drives. Same for `alert()` and `confirm()` — window modals from the preview are equally hostile to a timed auto-grader.
- **Do not require a specific console output.** The grader reads source text, not captured output. Design requirements as pattern checks (`console\\.log\\(`), not as "prints exactly X".
- **Do not grade the literal value of a student-chosen open-ended variable** (e.g. `score = 70`, where any value in a reasonable range is fine). Say "any value between 50 and 100" and check the variable exists and is used. This does **not** apply to closed-answer content with exactly one correct value (e.g. a classification drill — "which phase is this task in?" → the literal string `"inception"` is the point of the check, not something to avoid grading).
- **Do not reuse moSHion vocabulary or API in instructions or requirements** — `Sprite`, `Canvas`, `draw()`, `kb.pressing` have no meaning in the console track. (This is the console mirror of the no-moshion-refs rule in `written-assignment-conventions.md`.)
- Do not include `authored_by_email` or other DB-side fields in the starter (same as §5).
- **Do not use `type: "output"`, `"function"`, or `"custom"` requirements.** `lib/grader.ts` stubs all three to always `passed = false` — they aren't "unused," they're broken, and using one permanently blocks Submit for that requirement (the console track's grader is source-text-only; there's no sandboxed execution path client-side). Stick to `"regex"` / `"inFunction"`.

### 7.7 Canonical examples

- `1-2-5-lab-first-if` — `if` statement + `console.log` inside the block; two regex requirements (`if\\s*\\(`, `console\\.log\\(`).
- `1-2-22-lab-count-to-ten` — single-STEP `for` loop drill.
- `1-2-12-lab-guard-and` — `&&` inside an `if` condition, one requirement (`if\\s*\\([^)]*&&`).
- `1-2-9-lab-predict-comparisons` — predict-then-run pattern: STEP 2 asks for prediction comments before running, a nice low-stakes structure for comparison-operator labs. **The prediction itself is never graded** — the grader only checks source-text patterns (here, `===` and `console.log(`), and the comment-stripping preprocessor (`lib/grader.ts`) makes "a comment exists above each log" unenforceable by regex anyway. Treat predict-then-run as an instructional structure in `steps[].instructions`, not something to write a requirement for.

**Known inconsistency:** `1-2-26-challenges` ships `preview: "console"` + `type: "assignment"` and is titled "Challenges". It is a stretch bundle, not a challenge lesson (the real challenge type is `preview: "moSHion"` + `type: "challenge"` per `moshion-challenge-conventions.md`). Accepted as-is; future stretch bundles should follow the same pattern and note it here if the type doc gains a home for them.

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Lab pattern crystallized in `2-1-9-a10-1-sprite-playground`. |
| This doc | Hoisted out of per-module specs. |
| Q5 Submit-gate alignment | `grading.passingScore` no longer gates Submit on labs (labs are q5 lessons; the all-green rule applies — see `moshion-lesson-conventions.md` §5). §1 field-by-field rewritten to recommend setting `passingScore` to `totalPoints` for new labs and to flag the field as decorative; §5 Don'ts dropped the obsolete "Do not set `passingScore === totalPoints`" rule. UI behavior is unchanged — labs share the q5 lesson workspace (right-edge `TabbedRightDrawer` with Docs/Quest/File tabs, criteria-progress header, toolbar Submit) described in `moshion-lesson-conventions.md` §5. |
| No-points + green-to-advance | All `points`, `totalPoints`, and `passingScore` values must be `0`. §1 JSON shape + field-by-field rewritten — points fields are now decorative-must-be-zero. The all-green Submit gate is the only criterion. The next lesson stays locked until current is `lesson_state.completed` per `moshion-lesson-conventions.md` §5. |
| Describe-don't-show scaffold rule | Codified the line between an honest scaffold and an answer-key scaffold: **`// STEP N:` comments describe the task in plain English; commented-out lines that contain runnable solution code are not allowed.** §1 / §2 / §3 / §5 rewritten with examples. The `type: "challenge"` lessons remain fully empty per `moshion-challenge-conventions.md` §4 — the empty/scaffold split is what distinguishes challenges from labs. Established precedent: `2-2-11-a12-1-collectible/script.js` is the canonical scaffold (`// STEP N:` comments in plain English, empty bodies). `2-1-9-a10-1-sprite-playground/script.js` is empty — known inconsistency from before this rule landed. |
| Difficulty tiers slot-type | Labs `difficulty` field is now `"intermediate"` — one rung above practice q5 lessons (`"beginner"`) and one rung below challenges (`"advanced"`). §1 JSON shape + field-by-field updated. Sister conventions `moshion-lesson-conventions.md` and `moshion-challenge-conventions.md` carry the matching rule. Audit pass on existing unit-2 labs (2.1.10, 2.2.11, 2.3.20) bumped `"beginner"` → `"intermediate"`. |
| Console environment branch | §7 added: `preview: "console"` labs (Q1 / units-1.x track) — direct-JS execution, console-panel output, `difficulty: "beginner"`, 5–15 min bucket, `prompt()`/`alert()`/`confirm()` banned (they block the runner). Codified from the existing `1-2-5` / `1-2-9` / `1-2-12` / `1-2-22` console labs, which predated the doc. Unblocks module spec `1.1.1`'s six `lab` slots (five of which are non-coding tasks — see spec §Status). |
| Submit-gate fix + §7 audit | §7.3's "all-green Submit gate applies exactly as in §1" claim was false as written: `LessonWorkspace.tsx`'s `canSubmit` only used `allRequirementsPassed` for `isQ5Mode`; every non-q5 zero-points lesson (all console labs) fell into the `totalScore >= passingScore` branch, which is vacuously `0 >= 0` — Submit was never actually gated. Fixed by adding an `isNoPoints` (`totalPossible === 0`) check alongside `isQ5Mode`; legacy point-based lessons (`sdlc-overview`, `variables-and-types`, `jscad-intro`, etc., nonzero `totalPoints`) keep their score-vs-passingScore partial-credit behavior unchanged. §7.3's badge claim was also wrong (`badgeForLesson` resolves `type` before `preview`, so console labs show the Assignment badge, not Console — matches `README.md`'s own Type index); §7.4's file layout was incomplete (all 8 canonical examples ship `index.html` + `style.css` stubs, not just `lesson.json` + `script.js`); §7.6's "no literal values" Don't was scoped to open-ended values only, since it otherwise forecloses closed-answer/classification-style console labs. |
| §7 minor cleanup pass | §7.2 gained a full example `requirements[]` object (`file`, `pattern`, `flags: "i"`, `points: 0`) — neither §1 nor §7 previously showed one, though every canonical example uses `flags: "i"` uniformly. §7.6 gained a Don't for `type: "output"`/`"function"`/`"custom"` requirements — `lib/grader.ts` stubs them to always-`false`, a silent permanent-lockout failure mode, not merely "unused to date." §7.7's predict-then-run note now states the prediction is ungraded by design (source-text-only grader + comment-stripping preprocessor make it unenforceable), so a builder doesn't try to write a requirement for it. |
