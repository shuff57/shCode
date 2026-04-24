# Per-lesson-type conventions

This directory collects the **reusable build conventions** for each lesson type used under `lessons/<slug>/`. Builder AI reads these whenever a module spec under `curriculum/modules/lessons/*.md` references a lesson type — the module spec stays short, these docs are the source of truth.

## Type index

| `preview` / `type`                         | Badge           | Graded?  | Conventions doc                                                                  |
|--------------------------------------------|-----------------|----------|----------------------------------------------------------------------------------|
| `preview: "video"`                         | Video           | No       | [video-conventions.md](video-conventions.md)                                     |
| `preview: "reading"`                       | Reading         | No       | [reading-conventions.md](reading-conventions.md)                                 |
| `preview: "example"`                       | Worked Example  | No       | [example-conventions.md](example-conventions.md)                                 |
| `preview: "slides"`                        | Slides          | No       | [q5play-slides-conventions.md](q5play-slides-conventions.md)                     |
| `preview: "q5play"` + `type: "lesson"`     | Q5 Lesson       | Yes      | [q5play-starter-conventions.md](q5play-starter-conventions.md)                   |
| `preview: "q5play"` + `type: "challenge"`  | Challenge       | Yes      | [q5play-challenge-conventions.md](q5play-challenge-conventions.md)               |
| `preview: "q5play"` + `type: "assignment"` | Assignment      | Yes      | [lab-assignment-conventions.md](lab-assignment-conventions.md)                   |
| `preview: "assignment"` + `aiGrader`       | Assignment      | Yes (AI) | [written-assignment-conventions.md](written-assignment-conventions.md)           |

Authoritative badge list lives in `lib/lesson-badges.tsx` (`PREVIEW_BADGES`). Add a row there when introducing a new type.

## Purpose — why per-type docs, not per-module

Module specs under `curriculum/modules/lessons/` used to repeat the same "Build Outputs" boilerplate (video manifest shape, written-assignment rubric shape, lab starter conventions, etc.) on every file. When a convention shifted, 13 module specs had to change in lockstep and drifted instead.

These per-type docs are the fix: each module spec now **links** instead of restating. A convention only changes in one place.

## Adding a new lesson type (quizzes, tests, etc.)

When a new type appears — for example a multiple-choice quiz, a timed test, a peer-review exercise — create a new convention doc next to these. The template is always the same:

1. **Intro + Applies to** — the one-line rule that binds the doc to a `lesson.json` shape.
2. **Required `lesson.json` shape** — full JSON skeleton with field-by-field notes.
3. **File layout** — what sits in `lessons/<slug>/` besides `lesson.json`.
4. **Content-file shape** — if there's a `content.md` or similar, describe its structure.
5. **Don'ts** — the two or three anti-patterns that waste builder-AI tokens.
6. **Title convention** — the pattern `lesson.json.title` must follow.
7. **History** — where the pattern came from. Future-you will want this.

Then:

- Add a row to the **Type index** table above.
- If the new type needs its own pill color, add a badge entry in `lib/lesson-badges.tsx` and mention that file in the doc.
- Link from the first module spec that needs it.

## What NOT to put in these docs

- **Per-module content.** Lesson-specific text, per-week rubric rows, and unit-specific stepping stones belong in `curriculum/modules/lessons/<id>.md`, not here.
- **Code changes.** These are read-only reference docs. If a convention implies a code change (e.g. "add a new preview mode to `ContentLessonView`"), that's tracked in the module spec that first needs it, not here.
- **Runtime config.** `wrangler.toml`, D1 schema, env vars, etc. belong in `CLAUDE.md`.

## Related

- `curriculum/modules/lessons/*.md` — per-module build specs that consume these conventions.
- `curriculum/README.md` — how the curriculum build system works overall.
- `lib/lesson-badges.tsx` — authoritative list of recognized `preview` values.
- `CLAUDE.md` — project-wide infrastructure (D1, auth, Ollama grader, env vars).
