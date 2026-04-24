# Written (AI-Graded) Assignment Conventions

Canonical rules for in-app **written assignments** — short prose responses graded by the Ollama-backed `/api/grade-written` route. When a module spec's Artifacts table lists a `type: written` entry, or a `lessons/<slug>/` has `lesson.json.preview === "assignment"` + an `aiGrader` block, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `preview === "assignment"` AND `aiGrader` is present.

**Canonical example:** `lessons/2-1-10-a10-2-frame-loop/`.

Distinct from a q5play lab (`preview: "q5play"`) because there is no `script.js` and no regex grading — the grade comes from an LLM evaluating the student's prose against a rubric. See `components/ContentLessonView.tsx` line 134 for the branch that routes an `aiGrader`-bearing lesson to `WrittenGrader`.

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
  "points": <n>,
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
        "description": "<what earns the points; be specific about what must appear>",
        "points": <n>
      }
    ]
  },
  "grading": { "totalPoints": <n>, "passingScore": <n>, "allowLateSubmit": true },
  "steps": [],
  "requirements": []
}
```

### Field-by-field

- `preview` — **`"assignment"`**, not `"q5play"`. This is what routes the lesson to `WrittenGrader` instead of the regex grader.
- `aiGrader.model` — the Ollama cloud model id. Default to `"qwen3-coder-next:cloud"` (the current standard for q5play modules). Don't invent model names. See the **Ollama grader** section of `CLAUDE.md` for the endpoint + secret wiring.
- `aiGrader.contextDocs` — array of q5play doc keys (e.g. `"overview"`, `"sprite"`, `"input"`). These are interpolated into the grader's system prompt so the model knows the q5play vocabulary. See `lib/q5play-docs.ts` for the valid keys.
- `aiGrader.prompt` — the exact text the student sees as the question set. Use `\n\n` between questions. The grader sees this prompt + the student's response.
- `aiGrader.rubric` — array. `rubric[].points` must sum to `grading.totalPoints` AND to the top-level `points`. Verify by hand on every edit.
- `points` — the top-level `points` field mirrors `grading.totalPoints`. Both are required by the UI.
- `steps` / `requirements` — empty arrays. No auto-grader runs on this path.

## 2. File layout

```
lessons/<slug>/
├── lesson.json
└── content.md       # optional framing / context / tips before the prompt
```

`content.md` is rendered above the writing area. Use it for context and worked examples — **not** to duplicate the prompt (the prompt comes from `aiGrader.prompt`).

## 3. Rubric shape

Each rubric row should be **independently checkable**. A good row names the thing to look for in specific terms:

```json
{
  "id": "q2-fps-math",
  "title": "Q2: 60 fps math shown",
  "description": "4 px/frame × 60 fps = 240 px/sec. 5 sec = 1200 px. 400 px canvas / 240 px/sec ≈ 1.67 sec. Student must show at least one multiplication step — not just final numbers.",
  "points": 2
}
```

The `description` is the LLM's grading guide. Be explicit about what counts and what doesn't — vague descriptions give inconsistent scores.

## 4. Point budget

Typical shape for a Unit-2 weekly writeup:

| Rubric row                         | Points |
|------------------------------------|--------|
| Q1 concept in own words            | 2      |
| Q2 math or worked step required    | 2      |
| Q3 one-reason reflection           | 1      |
| **Total**                          | **5**  |

`passingScore` is typically `~60%` (e.g. 3 / 5). `allowLateSubmit: true` is the default for written work.

## 5. Don'ts

- **Do not use `preview: "q5play"` for a writeup** — the UI won't mount `WrittenGrader` and there's no script to grade.
- **Do not leave `points` or `grading.totalPoints` unset** — the UI needs both.
- **Do not let rubric totals drift from `totalPoints`.** Verify by hand on every edit.
- **Do not invent Ollama model names.** Use the model already in production (`qwen3-coder-next:cloud`) unless switching deliberately and coordinating with the `OLLAMA_*` env vars.
- **Do not put the prompt in `content.md`** — the grader reads from `aiGrader.prompt`. Duplicating invites drift.

## 6. Title convention

> **`<unit-numbering>` = three dotted numbers `U.M.N`** (e.g. `2.1.11`). Titles MUST start with that prefix or the lesson vanishes from `/module/U.M` and the home page. See [README §Title numbering](README.md#title-numbering--the-hard-rule).

`"<unit-numbering> <Writeup Name>"` — the badge handles the "Assignment" label.

Example: `"2.1.11 Frame Loop Writeup"`.

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Pattern crystallized in `2-1-10-a10-2-frame-loop` (A10.2) and `2-2-12-a12-2-oop-writeup` (A12.2). |
| This doc | Hoisted out of per-module specs. |
