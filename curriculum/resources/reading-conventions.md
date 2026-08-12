# Reading Lesson Conventions

Canonical rules for in-app lessons whose primary surface is a text reading
(internal doc chapter, freeCodeCamp reading, shplay docs,
etc.). When a module spec under `curriculum/modules/lessons/*.md` lists a
"reading" entry or a `lessons/<slug>/` has
`lesson.json.preview === "reading"`, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `preview === "reading"`

**Canonical example:** `lessons/2-1-2-reading-canvas-sprite/`.

**Scope (intro-level units):** A reading owns exactly one glossary term, syntactic form, or atomic concept. If you're tempted to cover two, split into two readings. See §2a in `sub-module-spec-conventions.md` for the granularity bar.

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
  "externalLink": "/docs/shplay",
  "externalLinkLabel": "Open the in-app shplay docs",
  "contentFile": "content.md",
  "steps": [],
  "requirements": [],
  "grading": { "totalPoints": 0, "passingScore": 0, "allowLateSubmit": true }
}
```

### Field-by-field

- `externalLink` — URL or in-app path. Internal paths (e.g. `/docs/shplay`) are allowed when the canonical source is inside this app. External URLs open in a new tab — don't invent them.
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

Canonical rhythm — see `lessons/2-1-2-reading-canvas-sprite/content.md` for the live template:

1. **Open straight into per-topic subsections** — the UI already renders `lesson.json.externalLink` as a link button above the content, so don't duplicate it inside `content.md`. No hub-style heading, no "Required and reference reading for Module X.Y" preamble, no sibling-resource link line, no restated external link.
2. **Per-topic subsections** — one `## <Topic Name>` per chapter/topic the student should focus on. Plain topic names; no `R1`/`R2`/`Chapter` labels.
   ```md
   ## Canvas & Sprite
   **Read before attempting `2.1.5 Hello Sprite`.**
   ```
   Under each topic, in this order:
   - A "What you'll learn from it:" bulleted list (3–5 items).
   - A **Try it:** paragraph followed by a ```` ```js live ```` runnable code block so the student can edit + run without leaving the reading. **Required** — every topic gets a live block. If you cannot think of one, the topic is probably not load-bearing enough to keep as its own subsection.
3. **A short glossary table** at the end, separated from the topics by a `---` rule, under the heading `## Short glossary (quick reference)`. Covers the terms introduced across the topics; ~5–8 rows. **Required** — every reading ends here.

### `live` code fences

A fenced block annotated ```` ```js live ```` renders as a runnable shplay sketch inline in the lesson (same runtime used elsewhere in the app). Every per-topic subsection MUST have one — that is the only way the reading earns the "interactive" half of its name. A plain ```` ```js ```` fence is reference-only and never substitutes for the per-topic live block; use it only for short illustrative snippets *inside* prose, in addition to (not instead of) the topic's `js live` block.

**Console-track variant:** for a reading under a `preview: "console"` sub-module (no canvas, no q5 API — see `lab-assignment-conventions.md` §7), annotate the fence ```` ```js live console ```` instead of bare ```` ```js live ````. `components/MarkdownWithLiveBlocks.tsx`'s `LIVE_FENCE` regex parses the `console` flag and renders a console-output panel instead of a shplay canvas — using the bare `js live` (shplay) fence in a console-track reading either renders nothing meaningful or the wrong runtime. Established precedent: every reading under sub-module 1.1.1 and the pre-existing `lessons/1-1-2-*` / `1-1-3-*` set uses this variant. An optional trailing `id=<slug>` (e.g. ```` ```js live console id=inspect-sprite ````) is also supported by the same regex, for when a lesson needs to reference a specific block.

### Length

Aim for **under ~100 lines**. The canonical example is 72 lines. Going longer usually means you're duplicating the external source instead of pointing at it — revisit what belongs here vs what belongs in the link target.

## 4. Don'ts

- **Do not add a hub-style lead header** like `# X.Y.Z Readings` or "Other X.Y.Z resources: …". The lesson has its own title; the reading is the content, not a hub.
- **Do not duplicate the external reading into `content.md`.** Point at the external link for depth; use `content.md` for focus ("read *these* two topics"), embedded runnable examples, and comprehension framing.
- **Do not invent external URLs.** Teacher curates.
- **Do not add `requirements`.** If you want an auto-check, convert the lesson to a challenge or written-assignment.
- **Do not use `preview: "reading"` for a worked example.** Worked examples need `contentFile` but belong in their own type (`preview: "example"` — see `example-conventions.md`).
- **Do not label topic subsections `R1`, `R2`, "Chapter N", etc.** The section heading is the topic name.
- **Do not ship a reading with zero `js live` blocks.** Long-form prose with only ```` ```js ```` reference fences is a textbook chapter, not a reading lesson. Either restructure into topics with runnable demos or convert the lesson to a different type.
- **Do not omit the glossary.** Even a 4-row table is fine; "no glossary" is not.
- **Do not use beginner-unfriendly idioms in `js live` blocks.** Spell things out with `if`/`else`, named variables, and ordinary `for` loops. Avoid ternaries (`a ? b : c`), logical-operator shortcuts (`x && doThing()`, `x ?? y`), destructuring, arrow callbacks for control flow, and chained `forEach`/`map`/`filter` unless the lesson is teaching that idiom. Compactness smuggles in a second concept under the guise of brevity — readings introduce one concept at a time.

## 5. Title convention

> **`<unit-numbering>` = three dotted numbers `U.M.N`** (e.g. `2.1.3`). Titles MUST start with that prefix or the lesson vanishes from `/module/U.M` and the home page. See [README §Title numbering](README.md#title-numbering--the-hard-rule).

`"<unit-numbering> Reading — <source>: <topic>"` — the word "Reading" in the title keeps the type legible.

Examples:
- `"2.1.3 Reading — shplay docs: Canvas & Sprite"`
- `"1.1.2 Reading — FCC: Variables and Strings"`

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Pattern crystallized in `2-1-2-reading-canvas-sprite`, `2-1-6-reading-input`, `2-2-3-reading-classes`, `2-2-9-reading-parallel-vs-classes`. |
| This doc | Hoisted out of per-module specs. |
| Scaffolding pass | Stripped hub-style lead header, sibling-resources hub line, "Primary reading" section wrapper, restated external link, R1/R2/"Chapter" subsection labels, and generic "how to read the docs efficiently" block from the canonical example. Reading now opens straight into per-topic `## <Topic>` subsections and ends on the optional glossary. §3 rhythm + §4 don'ts updated to match. |
| Required-interactives pass | Promoted per-topic `js live` blocks and the closing glossary from "optional" to **required** after `2-2-3-reading-classes` shipped as long-form prose with neither. §3, §4 don'ts, and the `live` code fences subsection updated. |
