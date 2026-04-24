# Worked Example Lesson Conventions

Canonical rules for in-app **worked-example** lessons — teacher-led code walkthroughs that students return to as reference after class. When a module spec lists a "worked example" entry or a `lessons/<slug>/` has `lesson.json.preview === "example"`, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `preview === "example"`

**Canonical example:** `lessons/2-1-3-example-minimum-sprite/`.

---

## 1. Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> Worked Example — <topic>",
  "description": "<one-line hook>",
  "type": "lesson",
  "difficulty": "beginner",
  "estimateMins": 10,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "example",
  "week": <n>,
  "slos": ["SLO-<n>"],
  "contentFile": "content.md",
  "steps": [],
  "requirements": [],
  "grading": { "totalPoints": 0, "passingScore": 0, "allowLateSubmit": true }
}
```

### Field-by-field

- `contentFile` — always `"content.md"` unless there's a compelling reason otherwise. This is the walkthrough.
- `steps` / `requirements` — empty. Worked examples are read-not-graded.
- `grading.totalPoints` — `0`.

## 2. File layout

```
lessons/<slug>/
├── lesson.json
└── content.md       # the worked example (prose + code blocks)
```

Code blocks inside `content.md` are rendered via `MarkdownWithLiveBlocks` — runnable q5play snippets work in place. No separate `script.js` is needed.

## 3. `content.md` shape

Recommended rhythm (matches `lessons/2-1-3-example-minimum-sprite/content.md`):

1. One-paragraph framing ("Here's the minimum q5play sketch that works.").
2. First code block — the simplest working version.
3. One sentence pointing at the key idea ("Notice we created the sprite inside `setup()`, not `draw()`.").
4. Evolution block(s) — show the common bug or the refactor step.
5. "Return here when…" closer naming the next-lesson context.

Keep it under ~80 lines. A worked example is a mental anchor, not a tutorial.

## 4. Exception — fully-working q5play sketches

Per `q5play-starter-conventions.md` §1, lessons with `preview: "example"` and `grading.totalPoints === 0` **may** ship a fully-working `script.js`. Reference/showcase examples live that way (`lessons/q5play-gravity/`, `q5play-camera/`, `q5play-pendulum/`, `q5play-sprite-showcase/`). When doing this, write `script.js` as solid, readable example code — this is the only lesson type where a complete program is the correct output.

## 5. Don'ts

- **Do not auto-grade a worked example.** It's a reference, not a test.
- **Do not use "Worked Example" as a synonym for "Starter".** Starters ship empty scaffolds and *are* graded (`preview: "q5play"` + `type: "lesson"`, see `q5play-starter-conventions.md`).
- **Do not duplicate the module's teacher-led demo.** Module specs describe the live-in-class demo; the worked-example lesson is the student's after-class reference version, not a transcript.

## 6. Title convention

> **`<unit-numbering>` = three dotted numbers `U.M.N`** (e.g. `2.1.4`). Titles MUST start with that prefix or the lesson vanishes from `/module/U.M` and the home page. See [README §Title numbering](README.md#title-numbering--the-hard-rule).

`"<unit-numbering> Worked Example — <topic>"`.

Examples:
- `"2.1.4 Worked Example — Minimum Sprite Program"`
- `"2.2.10 Worked Example — Procedural vs OOP"`

## History

| When | What |
|------|------|
| Unit 2.1 / 2.2 buildout | Pattern crystallized in `2-1-3-example-minimum-sprite`, `2-1-7-example-keyboard`, `2-2-4-example-devtools-reveal`, `2-2-8-example-enemy-class`, `2-2-10-example-proc-vs-oop`. |
| This doc | Hoisted out of per-module specs. |
