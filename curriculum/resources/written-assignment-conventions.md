# Written (AI-Graded) Assignment Conventions

Canonical rules for in-app **written assignments** — short prose responses graded by the Ollama-backed `/api/grade-written` route. When a module spec's Artifacts table lists a `type: written` entry, or a `lessons/<slug>/` has `lesson.json.preview === "assignment"` + an `aiGrader` block, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `preview === "assignment"` AND `aiGrader` is present.

**Canonical example:** `lessons/2-1-10-a10-2-frame-loop/`.

Distinct from a shplay lab (`preview: "shplay"`) because there is no `script.js` and no regex grading — the grade comes from an LLM evaluating the student's prose against a rubric. See `components/ContentLessonView.tsx` line 134 for the branch that routes an `aiGrader`-bearing lesson to `WrittenGrader`.

---

## 1. Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> <Writeup Name>",
  "description": "<one line>. AI-graded with hints.",
  "type": "assignment",
  "difficulty": "beginner",
  "estimateMins": 20,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "assignment",
  "week": <n>,
  "slos": ["SLO-<n>"],
  "points": <N>,
  "contentFile": "content.md",
  "aiGrader": {
    "rubricTitle": "<Lesson Name> — AI-graded rubric",
    "model": "qwen3-coder-next:cloud",
    "contextDocs": ["overview", "sprite"],
    "prompt": "<the student-facing questions, exactly as shown>",
    "rubric": [
      {
        "id": "<rubric-row-id>",
        "title": "<short criterion>",
        "description": "<what earns this criterion; be specific about what must appear>",
        "points": 1
      }
    ]
  },
  "grading": { "totalPoints": <N>, "passingScore": <N>, "allowLateSubmit": true },
  "steps": [],
  "requirements": []
}
```

(Where `<N>` = `aiGrader.rubric.length`.)

### Field-by-field

- `preview` — **`"assignment"`**, not `"shplay"`. This is what routes the lesson to `WrittenGrader` instead of the regex grader.
- `aiGrader.model` — the Ollama cloud model id. Default to `"qwen3-coder-next:cloud"` (the current standard for shplay modules). Don't invent model names. See the **Ollama grader** section of `CLAUDE.md` for the endpoint + secret wiring.
- `aiGrader.contextDocs` — array of shplay doc keys (e.g. `"overview"`, `"sprite"`, `"input"`). These are interpolated into the grader's system prompt so the model knows the shplay vocabulary. See `lib/shplay-docs.ts` for the valid keys.
- `aiGrader.prompt` — the exact text the student sees as the question set. Use `\n\n` between questions. The grader sees this prompt + the student's response.
- `aiGrader.rubric[].points` — **always `1` per item.** This is a binary AI signal (the model returns 0 or 1 per criterion — earned or not), not a weight. The UI must never surface this number to students; it's grader-internal. Don't assign different weights to different criteria — every criterion is equally required to advance.
- `points` (top-level) / `grading.totalPoints` / `grading.passingScore` — **all equal to `aiGrader.rubric.length` (count of criteria).** Setting `passingScore === totalPoints` enforces "every rubric item must be earned" — the all-green equivalent for written assignments. (Why not all `0` like q5 lessons? The Ollama grader sums per-rubric points to compute `totalScore`, and the workspace's non-q5 Submit gate is `totalScore >= passingScore`. With all-zero points, `0 >= 0` is always true and the gate is bypassed — green-to-advance breaks. The `1`-per-item carve-out preserves the all-green semantics through the existing scoring code path.)
- `steps` / `requirements` — empty arrays. No regex auto-grader runs on this path.

The student-facing surface for a written assignment must read as **pass / not yet** — the rubric itself is published as criteria, not as a weighted point breakdown. See §4 for what the student-facing rubric preview should look like.

## 2. File layout

```
lessons/<slug>/
├── lesson.json
└── content.md       # minimal framing + rubric preview
```

`content.md` is rendered above the writing area. Keep it small — a one-line "write your response below" nudge plus the rubric preview is plenty. Don't duplicate the prompt (the grader UI renders `aiGrader.prompt` separately), don't write a pre-read / "before you start" prep list (prereqs belong in the module spec, not the student-facing lesson), don't parrot teacher-facing SLO / evidence-retention warnings (those live in the module spec and the teacher-notes section), and don't include a "hub" H1 / metadata table / sibling-resources link line — the app chrome already shows the title, type, and week.

### Canonical content.md shape

See `lessons/2-1-10-a10-2-frame-loop/content.md` (~10 lines):

```md
Write your response in the box below. Short, clear answers are fine. The rubric below shows what the grader is looking for — every criterion must be met for the lesson to count as complete.

---

## Rubric

| # | Criterion |
|---|-----------|
| 1 | Q1: … |
| 2 | Q2: … |
| 3 | Q3: … |
```

No point columns. The rubric is a checklist; every row is required. The student-facing surface treats this as pass / not yet.

## 3. Rubric shape

Each rubric row should be **independently checkable** — and binary-shaped (the AI returns 0 or 1 for the row). A good row names the thing to look for in specific terms:

```json
{
  "id": "q2-fps-math",
  "title": "Q2: 60 fps math shown",
  "description": "4 px/frame × 60 fps = 240 px/sec. 5 sec = 1200 px. 400 px canvas / 240 px/sec ≈ 1.67 sec. Student must show at least one multiplication step — not just final numbers.",
  "points": 1
}
```

The `description` is the LLM's grading guide. Be explicit about what counts and what doesn't — vague descriptions give inconsistent scores. The `points: 1` is a binary signal, not a weight; never use a different value.

## 4. Pass criterion

Every rubric row must be earned. Concretely:

- `aiGrader.rubric[i].points = 1` for every item.
- `grading.totalPoints = aiGrader.rubric.length`.
- `grading.passingScore = grading.totalPoints` (so `totalScore >= passingScore` ⇒ all rows earned).
- The top-level `points` field mirrors `grading.totalPoints`.

This carve-out exists because the Ollama grader sums per-rubric points to compute `totalScore` and the workspace's non-q5 Submit gate is `totalScore >= passingScore`. The `1`-per-item shape is the cheapest way to keep the all-green semantics through the existing scoring code path. The student-facing rubric preview in `content.md` does NOT show points — it lists criteria only.

`allowLateSubmit: true` is the default for written work.

## 5. Don'ts

- **Do not use `preview: "shplay"` for a writeup** — the UI won't mount `WrittenGrader` and there's no script to grade.
- **Do not leave `points` / `grading.totalPoints` / `grading.passingScore` unset.** All three must be populated and equal to `aiGrader.rubric.length`.
- **Do not assign different `points` values to different rubric rows.** Every row is `1` — binary AI signal. Weights aren't supported under the no-points policy.
- **Do not show point columns in the student-facing rubric preview** in `content.md`. Use a `# | Criterion` two-column shape, not `Criterion | Pts`. Students see pass/fail per row, not weights.
- **Do not invent Ollama model names.** Use the model already in production (`qwen3-coder-next:cloud`) unless switching deliberately and coordinating with the `OLLAMA_*` env vars.
- **Do not put the prompt in `content.md`** — the grader reads from `aiGrader.prompt`. Duplicating invites drift.
- **Do not include an example answer / model response in `content.md`.** No matter how you label it ("style guide", "do NOT copy"), a written-out answer is a cheat sheet. The rubric gives students what they're graded on; let them think the answer through.
- **Do not add a hub-style lead header, metadata table, or sibling-resources link line** to `content.md`. The lesson title, type badge, and week are already visible in the app chrome.
- **Do not add a "Before you start" / prereq block to `content.md`.** Prereqs belong in the module spec — the student already sees module ordering in the sidebar.
- **Do not surface teacher-facing SLO / evidence-retention warnings** (e.g. `⚠️ RETAINED FOR SLO-2 EVIDENCE — your teacher keeps a digital copy …`). Those are teacher-notes, not student-facing copy. Likewise keep SLO mentions out of `lesson.json.description`.

## 6. Title convention

> **`<unit-numbering>` = three dotted numbers `U.M.N`** (e.g. `2.1.11`). Titles MUST start with that prefix or the lesson vanishes from `/module/U.M` and the home page. See [README §Title numbering](README.md#title-numbering--the-hard-rule).

`"<unit-numbering> <Writeup Name>"` — the badge handles the "Assignment" label.

Example: `"2.1.11 Frame Loop Writeup"`.

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Pattern crystallized in `2-1-10-a10-2-frame-loop` (A10.2) and `2-2-12-a12-2-oop-writeup` (A12.2). |
| This doc | Hoisted out of per-module specs. |
| Scaffolding pass | 2.1.11 Frame Loop Writeup `content.md` stripped from 60 lines → 15: dropped the `# A10.2 —` hub H1, the Module/Week/Points metadata table, the "Other 2.1.1 resources" link line, the duplicated Prompt block (lives in `aiGrader.prompt`), and the "Example response" block that showed full Q1/Q2/Q3 answers. Kept the "Before you start" prereqs + rubric-preview. §2 gained a canonical content.md template; §5 Don'ts gained "no example answers" and "no hub header / metadata table / sibling-resources line". |
| Second simplification | Dropped the "Before you start" prereq block AND any teacher-facing SLO / evidence-retention warnings from the canonical shape. Student-facing copy now opens directly with the "Write your response below" nudge, then rubric. Applied across `2-1-10-a10-2-frame-loop` and `2-2-12-a12-2-oop-writeup`. §2 canonical template shortened (~15 → ~10 lines); §5 Don'ts gained "no pre-read block" and "no teacher-facing SLO warnings". |
| No-points + green-to-advance (carve-out for written) | The course is now mastery-based — no points anywhere students can see. Written assignments are AI-graded, so the existing scoring code path needs *some* numeric signal to fire the Submit gate. Resolution: every `aiGrader.rubric[].points` is **`1`** (binary signal, never a weight); `grading.totalPoints = grading.passingScore = aiGrader.rubric.length`; top-level `points` mirrors `totalPoints`. With this shape `totalScore >= passingScore` requires every rubric item to be earned — the all-green equivalent for written. §1 JSON shape + field-by-field rewritten. §2 canonical content.md template dropped the `Pts` column (now `# | Criterion` only). §3 rubric example updated to `points: 1`. §4 renamed from "Point budget" → "Pass criterion" and prescribes the `<N>=rubric.length` pattern. §5 Don'ts gained the equal-rubric-weights and no-pts-column rules. Sister convention `shplay-lesson-conventions.md` carries the canonical reference for the green-to-advance lesson nav lock. |
