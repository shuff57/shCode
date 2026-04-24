# Reading Lesson Conventions

Canonical rules for in-app lessons whose primary surface is a text reading
(internal doc chapter, freeCodeCamp reading, CHS-AP passage, q5play docs,
etc.). When a module spec under `curriculum/modules/lessons/*.md` lists a
"reading" entry or a `lessons/<slug>/` has
`lesson.json.preview === "reading"`, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `preview === "reading"`

**Canonical example:** `lessons/2-1-2-reading-canvas-sprite/`.

---

## 1. Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> Reading — <source>: <topic>",
  "description": "<one-line hook ending with when-to-read>",
  "type": "lesson",
  "difficulty": "beginner",
  "estimateMins": 10,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "reading",
  "week": <n>,
  "slos": ["SLO-<n>"],
  "externalLink": "/docs/q5play",
  "externalLinkLabel": "Open the in-app q5play docs",
  "contentFile": "content.md",
  "steps": [],
  "requirements": [],
  "grading": { "totalPoints": 0, "passingScore": 0, "allowLateSubmit": true }
}
```

### Field-by-field

- `externalLink` — URL or in-app path. Internal paths (e.g. `/docs/q5play`) are allowed when the canonical source is inside this app. External URLs open in a new tab — don't invent them.
- `externalLinkLabel` — human-readable label rendered with a `→` arrow (see `components/ContentLessonView.tsx` line 120). Defaults to the raw URL if omitted; always provide one.
- `contentFile` — relative filename of a markdown file in the same lesson directory (conventionally `content.md`). Renders below the external link. Use for: framing the reading, comprehension questions, "what to notice" prompts. Keep it short — the reading itself lives behind `externalLink`.
- `steps` / `requirements` / `grading.totalPoints` — always empty / zero. Readings are not auto-graded.

## 2. File layout

```
lessons/<slug>/
├── lesson.json
└── content.md       # optional framing / questions; no code files
```

## 3. `content.md` shape (when present)

Recommended rhythm:

1. One-sentence framing ("This is the q5play docs chapter on Canvas & Sprite. Skim it before building your first sketch.").
2. A short bulleted "while you read, notice…" list (3–5 items).
3. Optional: 2–3 comprehension questions for a paired discussion (no auto-grading).

Keep it under 40 lines. A reading lesson is a pointer plus framing, not a second copy of the source.

## 4. Don'ts

- **Do not duplicate the external reading into `content.md`.** Link to it; frame it. The link is the source of truth.
- **Do not invent external URLs.** Teacher curates.
- **Do not add `requirements`.** If you want an auto-check, convert the lesson to a challenge or written-assignment.
- **Do not use `preview: "reading"` for a worked example.** Worked examples need `contentFile` but belong in their own type (`preview: "example"` — see `example-conventions.md`).

## 5. Title convention

> **`<unit-numbering>` = three dotted numbers `U.M.N`** (e.g. `2.1.3`). Titles MUST start with that prefix or the lesson vanishes from `/module/U.M` and the home page. See [README §Title numbering](README.md#title-numbering--the-hard-rule).

`"<unit-numbering> Reading — <source>: <topic>"` — the word "Reading" in the title keeps the type legible.

Examples:
- `"2.1.3 Reading — q5play docs: Canvas & Sprite"`
- `"1.1.2 Reading — FCC: Variables and Strings"`

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Pattern crystallized in `2-1-2-reading-canvas-sprite`, `2-1-6-reading-input`, `2-2-3-reading-classes`, `2-2-9-reading-parallel-vs-classes`. |
| This doc | Hoisted out of per-module specs. |
