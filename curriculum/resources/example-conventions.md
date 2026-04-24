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

- `description` — **omit**. Worked examples don't take a description. The title + type badge are enough; `content.md` leads with the `**Goal:**` line. `components/ContentLessonView.tsx` skips the description `<p>` when absent, so no blank space renders.
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

Canonical rhythm — see `lessons/2-1-3-example-minimum-sprite/content.md` for the live template:

1. **Lead with `**Goal:**`** — a one-line statement of what the walkthrough proves or builds. No hub-style heading, no `## Worked Example N —` label, no sibling-resources line.
2. **Numbered `## Step` sections** — each step is one `##` heading (`## Step 1 — Hit Run`, `## Step 2 — Notice the bug`, `## Step 3 — Hoist the sprite`, etc.). Heading phrasing should assume the student is **reading + running the embedded editor**, not typing code from scratch — so `Hit Run`, `Notice`, `Try`, `Break it on purpose`, `Refactor` all fit; `Type this exactly` does not. Under each step:
   - A short prose paragraph explaining the intent of the step.
   - **One ```` ```js live ```` fence** carrying the code for that step. Every step gets its own editor + preview so the student can run each variation independently — there's no "combined final" block at the end.
3. **`## Key takeaways`** — a 3–5 bullet list naming the reusable ideas, in imperative or declarative form ("`setup()` runs once").

Single topic per lesson. If you have multiple walkthroughs (minimum sprite, keyboard movement, frameCount motion), split them into separate lessons — don't stack them in one `content.md`.

### Length

Aim for **under ~80 lines**. The canonical example is 60 lines. A worked example is a mental anchor, not a tutorial.

### `live` code fences

A fenced block annotated ```` ```js live ```` renders as a runnable q5play sketch inline — its own editor + preview, independent of any other block on the page. Give **every** step block the `live` annotation so each variation of the code can be executed and tweaked in place; skipping `live` forces the student to copy/paste to see the effect, which defeats the point.

Reference-only snippets (pure prose-embedded code the student isn't meant to run — e.g. a one-liner showing a syntax form) can stay as plain ```` ```js ```` if a walkthrough needs them, but the canonical pattern has none.

## 4. Exception — fully-working q5play sketches

Per `q5play-lesson-conventions.md` §1, lessons with `preview: "example"` and `grading.totalPoints === 0` **may** ship a fully-working `script.js`. Reference/showcase examples live that way (`lessons/q5play-gravity/`, `q5play-camera/`, `q5play-pendulum/`, `q5play-sprite-showcase/`). When doing this, write `script.js` as solid, readable example code — this is the only lesson type where a complete program is the correct output.

## 5. Don'ts

- **Do not auto-grade a worked example.** It's a reference, not a test.
- **Do not use "Worked Example" as a synonym for "Starter".** Starters ship empty scaffolds and *are* graded (`preview: "q5play"` + `type: "lesson"`, see `q5play-lesson-conventions.md`).
- **Do not duplicate the module's teacher-led demo.** Module specs describe the live-in-class demo; the worked-example lesson is the student's after-class reference version, not a transcript.
- **Do not include a `description` field in `lesson.json`.** See §1 field-by-field.
- **Do not label step sections `## Worked Example N — …`.** One walkthrough per lesson, so the heading is just `## Step N — …`.
- **Do not stack multiple walkthroughs into one lesson.** If a topic needs its own Goal + Steps + Takeaways, it's its own lesson.

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
| Scaffolding pass | 2.1.4 canonical example pruned from 280 → 65 lines: dropped hub header, sibling-resources line, cross-example cheat sheet, and the "## Worked Example N —" labels; dropped unrelated walkthroughs (Keyboard Movement, frameCount) that belong in their own lessons. `description` field dropped from `lesson.json` (rendered as an ugly empty `<p>`; ContentLessonView now conditionally renders it). §1 / §3 / §5 updated to codify the new shape. |
| Per-step live blocks | Each `## Step` now carries its own ```` ```js live ```` fence (instead of a trailing "combined final" block). Students can run and tweak every step independently. `public/q5play/runner.html` got `overflow: hidden` on html/body so oversized canvases get clipped rather than showing scrollbars inside the iframe. |
