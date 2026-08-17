# Multiple-Choice Quiz Conventions

Canonical rules for in-app **module quizzes** — multiple-choice recall checks graded
in the browser, with no model call. When a `lessons/<slug>/lesson.json` has
`preview === "quiz"` + a `quiz` block, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `preview === "quiz"` AND `quiz` is present.

**Canonical example:** `lessons/1-4-22-unit-quiz/`.

Distinct from a **written assignment** (`preview: "assignment"` + `aiGrader`, see
`written-assignment-conventions.md`) on purpose, and the split is pedagogical, not
technical:

| | Quiz | Written assignment |
|---|---|---|
| Asks | did you take in what the module taught | can you apply it to something of your own |
| Answer | one right answer, sitting in a specific lesson | the student supplies the subject; graded on reasoning |
| Graded by | the browser, against `quiz.questions[].answer` | Ollama, against `aiGrader.rubric` |
| Position | last lesson of a module | anywhere the skill is being practised |
| Retries | unlimited, instant | unlimited, one model call each |

Before 2026-08-17 the six module quizzes were AI-graded prose, which meant a
recall check cost a model call per attempt and returned a paragraph of feedback
for "name the three structures". Recall belongs in multiple choice; reasoning
stays with the grader.

---

## 1. Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> Module <n.n> Quiz",
  "description": "<N> multiple-choice questions on <topics>. Checked instantly.",
  "type": "assignment",
  "estimateMins": 10,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "quiz",
  "slos": ["SLO-<n>"],
  "points": 0,
  "contentFile": "content.md",
  "grading": { "totalPoints": 0, "passingScore": 0, "allowLateSubmit": true },
  "steps": [],
  "requirements": [],
  "quiz": {
    "passPercent": 70,
    "questions": [
      {
        "id": "q1-<topic>",
        "source": "1.4.2",
        "question": "<the question, with any setup it depends on>",
        "options": ["<wrong>", "<right>", "<wrong>", "<wrong>"],
        "answer": 1,
        "explanation": "<why, in a sentence or two — never just 'correct'>"
      }
    ]
  }
}
```

### Field-by-field

- `preview` — **`"quiz"`**. This is what routes the lesson to `QuizView` instead of
  `WrittenGrader`. A `quiz` block with any other preview is a build failure.
- `type` — stays **`"assignment"`**. A quiz is graded work, and the lists key their
  assignment styling off `type`. `badgeForLesson()` special-cases `preview: "quiz"`
  so the badge still reads **Quiz**.
- `quiz.passPercent` — percent correct needed to advance. **Default 70**, applied by
  `passThreshold()` in `lib/quiz-grade.ts` with a *ceiling*: 70% of 8 questions is 6,
  never 5. Set it only when a quiz genuinely wants a different bar.
- `quiz.questions[].id` — unique within the lesson. It is both the answer key and the
  radio-group `name`, so a duplicate makes two questions share one selection.
- `quiz.questions[].answer` — **0-based** index into `options`.
- `quiz.questions[].source` — displayed lesson number to reread, shown next to the
  explanation after grading. Same rule as written prompts: cite the number from
  `lesson.json.title`, never the folder slug.
- `quiz.questions[].code` — optional snippet rendered monospace above the options,
  for trace-the-output questions. See `2-1-39-a2-1-2-quiz`.
- `points` / `grading.*` — all `0`. `QuizView` never reads them; the gate is
  `passPercent`. Populate them anyway so the lesson.json stays self-describing.
- No `aiGrader`. A lesson with both is a build failure — `QuizView` wins the render,
  so the `aiGrader` would be dead config that still reads like the lesson is AI-graded.

## 2. content.md

One line, naming where the answers come from. `QuizView` renders the heading, the
"you need N of M" line and the retry rules itself, and `description` already appears
above — three copies of the same instructions is what the first draft did.

```md
Everything in this quiz comes from this module's readings and videos. Each question names the lesson to reread if you get it wrong.
```

No rubric table. A rubric is what a human or a model grades against; a quiz has an
answer key.

## 3. Writing the questions

**Every question is answerable from one named lesson**, and `source` names it. If a
question needs a fact the student was never given, hand them the fact and ask for the
reasoning instead — *"SQL is a language built for asking questions of a database. Why
could you not use it to build a web page?"* tests the concept; *"Why can a program for
a web page not simply be written in SQL?"* tests whether they remember what SQL is.

**One short-answer question usually becomes two.** "Explain the difference between a
low-level and a high-level language, and give one advantage of each" is two things;
multiple choice can only ask one at a time. Splitting it is an improvement, not a
compromise — 1.4.22's six prose questions became eight MC questions.

**Four options, and the three wrong ones have to be actually wrong** — not merely
worse. A distractor that a defensible reading makes correct is a bug the validator
cannot catch. Good distractors are the near-misses students really make: the *other*
level of abstraction, the life-cycle phases where the three structures belong, `"null"`
where `"object"` is the answer.

**The explanation teaches.** It is shown on a right answer and a wrong one, so it
says *why*, never "correct". It is also the only feedback a failing student gets —
`QuizView` deliberately does **not** highlight the right option on a failed attempt,
because that turns "try again" into "click the green one".

**Vary which slot is correct.** `scripts/test-quiz.mjs` fails a quiz of 4+ questions
whose answers are all in the same position.

## 4. What is checked

`npm test` runs `scripts/test-quiz.mjs`, which fails the build on: a `quiz` block with
the wrong preview, a `quiz` alongside an `aiGrader`, a missing/duplicate question id,
an empty question or explanation, fewer than 3 options, two identical options, an
`answer` index out of range, a `passPercent` outside 1–100, and an all-same-slot answer
key. It also unit-tests `passThreshold()`.

Not checked, because nothing can: whether a distractor is genuinely wrong, and whether
`source` points at a lesson that actually teaches the answer. Both are on the author.

## 5. Known ceiling

The answer key ships in the client bundle, so a student who opens devtools can read it.
That is the same posture as every console and shplay lesson in this course (their
solutions are generated into the bundle by `scripts/generate-solutions.mjs`), and moving
quiz grading server-side would mean a new endpoint and a new table to defend a 0-point
recall check. Deliberate; revisit if quizzes ever carry real weight.

## History

| When | What |
|------|------|
| Created (2026-08-17) | Six module quizzes converted from AI-graded prose to multiple choice: 1.1.23, 1.2.31, 1.3.21, 1.4.22, 1.5.45, 2.1.40 — 46 questions. New `preview: "quiz"` type, `components/QuizView.tsx`, `lib/quiz-grade.ts`, `scripts/test-quiz.mjs`. Writeups stayed with the AI grader. |
| 1.1.23 placement (2026-08-17, open) | `1-1-7-a3-3-unit-quiz` is displayed as *1.1.23 Unit 1.1 Quiz* but every question is module **1.2/1.3** material — `typeof`, declarations, naming style — none of which module 1.1 teaches. Its `source` pointers cite 1.2.x/1.3.x accordingly. The lesson's position in the course is still unresolved. |
