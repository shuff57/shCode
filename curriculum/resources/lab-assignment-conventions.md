# q5play Lab Assignment Conventions

Canonical rules for **in-app auto-graded labs** — the Axxy series (A10.1, A11.1, A12.1, …) rendered with `preview: "q5play"`. These are the major graded artifacts of each q5play module. When a module spec's Artifacts table lists a `type: lab` entry, or a `lessons/<slug>/` has `lesson.json.type === "assignment"` + `preview === "q5play"`, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `type === "assignment"` AND `preview === "q5play"`.

**Canonical example:** `lessons/2-2-11-a12-1-collectible/`.

Labs ship **scaffolded** — `script.js` has a header comment, top-level `let` declarations, `setup()` / `draw()` skeletons, and `// STEP N:` comments **in plain English describing each task** — but the function bodies are empty and **no commented-out solution code is shown.** The Quest tab carries the graded requirements; the STEP comments tell the student what each step should accomplish without giving them the line of code that does it. This is structurally different from a `type: "challenge"` lesson, which ships **fully empty** (see `sketch-challenge-conventions.md` §4) — challenges deliberately remove the scaffold so the student structures the program themselves.

---

## 1. Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> <Lab Name>",
  "description": "<one line>. Auto-graded.",
  "type": "assignment",
  "difficulty": "intermediate",
  "estimateMins": 45,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "q5play",
  "week": <n>,
  "slos": ["SLO-<n>"],
  "steps": [ ... ],
  "requirements": [ ... ],
  "grading": { "totalPoints": 0, "passingScore": 0, "allowLateSubmit": true }
}
```

### Field-by-field

- `type` — **must be `"assignment"`**. This is what toggles the "Assignment" badge in `lib/lesson-badges.tsx`.
- `difficulty` — **must be `"intermediate"`**. Labs sit one rung above practice q5 lessons (`"beginner"`) and one rung below challenges (`"advanced"`). The tiering encodes the lesson/lab/challenge progression: same content surface, less scaffolding at each rung.
- `estimateMins` — labs are the 30–60 min bucket. Shorter = challenge; longer = project/capstone.
- `steps` — author-side documentation. **Not currently rendered in the student UI** (the Quest tab shows `requirements[]`, see `sketch-lesson-conventions.md` §5). Each `step.id` should still correspond to the matching `// STEP N:` comment in `script.js` so the scaffold's structure mirrors the spec.
- `requirements` — **strict**. Each requirement checks a specific pattern the student must produce. Use `type: "regex"` for anywhere-in-file checks and `type: "inFunction"` for per-function-body checks.
- `grading.totalPoints` / `grading.passingScore` / `requirements[].points` — **always `0`.** The course is mastery-based: Submit is gated all-green (every requirement passed), not points-based. Keep the fields for schema compatibility; never assign a non-zero value. See `sketch-lesson-conventions.md` §1 field-by-field + §5 (green-to-advance lock).

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

Every q5play lab that uses keyboard input should use **WASD**, not arrow keys. Arrow keys scroll the browser iframe on some platforms and break the lesson UX. Enforce this in both `steps[].instructions` hints and the requirement regex:

```json
"pattern": "kb\\.pressing\\s*\\(\\s*['\"](?:a|d)['\"]"
```

Not `['"](?:left|right)['"]`.

## 5. Don'ts

- **Do not include commented-out solution code in `script.js`.** STEP comments describe the task in plain English (see §3). Lines like `//   stars = new Group();` are answer keys, not scaffolds.
- **Do not ship a working solution.** Empty function bodies; the student writes them.
- **Do not include a `// BUILD THIS:` prose block** at the top of `script.js`. The header comment is one line (`// <numbering> <title> — <one-line tagline>` per `sketch-lesson-conventions.md` §4.2); longer task framing belongs in `steps[].instructions` and the matching `// STEP N:` comments inside the function bodies.
- **Do not use arrow keys** — WASD only. See §4.
- **Do not auto-grade velocity magnitudes** (e.g. `vel.x = 4`). Students should be free to pick any value in a reasonable range; the grader checks *that* velocity is set, not *what* it's set to.
- **Do not include `authored_by_email` or other DB-side fields in the starter.** Those belong to the commit pipeline, not the lesson.

## 6. Title convention

> **`<unit-numbering>` = three dotted numbers `U.M.N`** (e.g. `2.1.10`). Titles MUST start with that prefix or the lesson vanishes from `/module/U.M` and the home page. See [README §Title numbering](README.md#title-numbering--the-hard-rule).

`"<unit-numbering> <Lab Name>"` — no "Lab" or "Assignment" word in the title; the badge handles that.

Examples:
- `"2.1.10 Sprite Playground"` (A10.1)
- `"2.2.11 Collectible Class"` (A12.1)

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Lab pattern crystallized in `2-1-9-a10-1-sprite-playground`. |
| This doc | Hoisted out of per-module specs. |
| Q5 Submit-gate alignment | `grading.passingScore` no longer gates Submit on labs (labs are q5 lessons; the all-green rule applies — see `sketch-lesson-conventions.md` §5). §1 field-by-field rewritten to recommend setting `passingScore` to `totalPoints` for new labs and to flag the field as decorative; §5 Don'ts dropped the obsolete "Do not set `passingScore === totalPoints`" rule. UI behavior is unchanged — labs share the q5 lesson workspace (right-edge `TabbedRightDrawer` with Docs/Quest/File tabs, criteria-progress header, toolbar Submit) described in `sketch-lesson-conventions.md` §5. |
| No-points + green-to-advance | All `points`, `totalPoints`, and `passingScore` values must be `0`. §1 JSON shape + field-by-field rewritten — points fields are now decorative-must-be-zero. The all-green Submit gate is the only criterion. The next lesson stays locked until current is `lesson_state.completed` per `sketch-lesson-conventions.md` §5. |
| Describe-don't-show scaffold rule | Codified the line between an honest scaffold and an answer-key scaffold: **`// STEP N:` comments describe the task in plain English; commented-out lines that contain runnable solution code are not allowed.** §1 / §2 / §3 / §5 rewritten with examples. The `type: "challenge"` lessons remain fully empty per `sketch-challenge-conventions.md` §4 — the empty/scaffold split is what distinguishes challenges from labs. Established precedent: `2-2-11-a12-1-collectible/script.js` is the canonical scaffold (`// STEP N:` comments in plain English, empty bodies). `2-1-9-a10-1-sprite-playground/script.js` is empty — known inconsistency from before this rule landed. |
| Difficulty tiers slot-type | Labs `difficulty` field is now `"intermediate"` — one rung above practice q5 lessons (`"beginner"`) and one rung below challenges (`"advanced"`). §1 JSON shape + field-by-field updated. Sister conventions `sketch-lesson-conventions.md` and `sketch-challenge-conventions.md` carry the matching rule. Audit pass on existing unit-2 labs (2.1.10, 2.2.11, 2.3.20) bumped `"beginner"` → `"intermediate"`. |
