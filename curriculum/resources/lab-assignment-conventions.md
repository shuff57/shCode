# q5play Lab Assignment Conventions

Canonical rules for **in-app auto-graded labs** — the Axxy series (A10.1, A11.1, A12.1, …) rendered with `preview: "q5play"`. These are the major graded artifacts of each q5play module. When a module spec's Artifacts table lists a `type: lab` entry, or a `lessons/<slug>/` has `lesson.json.type === "assignment"` + `preview === "q5play"`, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `type === "assignment"` AND `preview === "q5play"`.

**Canonical example:** `lessons/2-1-9-a10-1-sprite-playground/`.

Labs **also** follow `q5play-starter-conventions.md` — starter `script.js` is a scaffold, never the solution.

---

## 1. Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> <Lab Name>",
  "description": "<one line>. Auto-graded.",
  "type": "assignment",
  "difficulty": "beginner",
  "estimateMins": 45,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "q5play",
  "week": <n>,
  "slos": ["SLO-<n>"],
  "steps": [ ... ],
  "requirements": [ ... ],
  "grading": { "totalPoints": <n>, "passingScore": <n>, "allowLateSubmit": true }
}
```

### Field-by-field

- `type` — **must be `"assignment"`**. This is what toggles the "Assignment" badge in `lib/lesson-badges.tsx`.
- `estimateMins` — labs are the 30–60 min bucket. Shorter = challenge; longer = project/capstone.
- `steps` — one step per requirement (rough 1:1). Each `step.id` should correspond to a `// STEP N:` breadcrumb in the starter `script.js` (per `q5play-starter-conventions.md` §1).
- `requirements` — **strict**. Each requirement checks a specific pattern the student must produce. Use `type: "regex"` for anywhere-in-file checks and `type: "inFunction"` for per-function-body checks.
- `grading.totalPoints` — sum of all `requirements[].points`. Verify by hand.
- `grading.passingScore` — conventionally `~66–75%` of `totalPoints`. Allows one missed requirement without blocking progression.

### Requirement types

- `"regex"` — pattern must match anywhere in `file`.
- `"inFunction"` — pattern must match inside the named function body. `function` may be a single string or an array like `["draw", "update"]` (pattern passes if found in any).

## 2. File layout

```
lessons/<slug>/
├── lesson.json
└── script.js        # scaffold with // STEP N: breadcrumbs, empty setup/draw bodies
```

No `content.md` required — step instructions live in `steps[].instructions` inside `lesson.json`. A `content.md` is acceptable only if the lab needs a longer hint reference beyond inline step text.

## 3. Step ↔ requirement ↔ starter alignment

The canonical three-way contract:

| `lesson.json.steps[].id` | `script.js` breadcrumb | `lesson.json.requirements[]`       |
|--------------------------|------------------------|------------------------------------|
| `s1` Create a canvas     | `// STEP 1: …`         | `r1` `new Canvas(`                 |
| `s2` Create sprites      | `// STEP 2: …`         | `r2` `new Sprite(` (×N)            |
| `s3` Wire input          | `// STEP 3: …`         | `r3`, `r4` `kb.pressing(…)` checks |
| …                        | …                      | …                                  |

Not every step needs a requirement (some are prose-only guidance), and not every requirement needs a step (e.g. "clear the background" may be implicit), but the happy path is 1:1.

## 4. WASD, not arrow keys

Every q5play lab that uses keyboard input should use **WASD**, not arrow keys. Arrow keys scroll the browser iframe on some platforms and break the lesson UX. Enforce this in both `steps[].instructions` hints and the requirement regex:

```json
"pattern": "kb\\.pressing\\s*\\(\\s*['\"](?:a|d)['\"]"
```

Not `['"](?:left|right)['"]`.

## 5. Don'ts

- **Do not ship a working solution.** Starter is a scaffold (see `q5play-starter-conventions.md` §1).
- **Do not set `passingScore === totalPoints`.** Labs allow one missed requirement.
- **Do not use arrow keys** — WASD only. See §4.
- **Do not auto-grade velocity magnitudes** (e.g. `vel.x = 4`). Students should be free to pick any value in a reasonable range; the grader checks *that* velocity is set, not *what* it's set to.
- **Do not include `authored_by_email` or other DB-side fields in the starter.** Those belong to the commit pipeline, not the lesson.

## 6. Title convention

`"<unit-numbering> <Lab Name>"` — no "Lab" or "Assignment" word in the title; the badge handles that.

Examples:
- `"2.1.10 Sprite Playground"` (A10.1)
- `"2.2.11 Collectible Class"` (A12.1)

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Lab pattern crystallized in `2-1-9-a10-1-sprite-playground`. |
| This doc | Hoisted out of per-module specs. |
