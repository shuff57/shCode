# q5play Slide Deck Conventions

Canonical rules for authoring Slidev decks for each q5play unit (2.1 – 2.7). One deck per unit, served statically from `public/slides/2.X/` via the Next.js build. When any module spec under `curriculum/modules/lessons/2.X.Y_*.md` references "the unit slide deck" or a `lessons/2-X-1-slides/` in-app lesson, these rules are binding.

**Template source:** crystallized during Unit 2.2 buildout. Unit 2.1 is the canonical reference deck (`slides/2.1/slides.md`, ~440 lines, 30 slides).

---

## 1. One deck per unit

Each unit has exactly **one** Slidev deck covering all modules in that unit. Decks live at:

```
slides/2.X/
├── slides.md         # the deck — ~400–500 lines, ~25–30 slides
├── components/
│   └── Q5Runner.vue  # shared runnable-code component (copied from 2.1)
├── public/
│   └── q5play/       # q5.js + Box2D runtime (copied from 2.1)
└── setup/            # Slidev setup hooks (copied from 2.1)
```

**Bootstrap command:**

```bash
mkdir -p slides/2.X
cp -r slides/2.1/{components,public,setup} slides/2.X/
```

Then author `slides/2.X/slides.md` (see §4 below).

---

## 2. Port allocation (dev servers)

Each unit's live-edit dev server runs on its own port so multiple decks can run simultaneously:

| Unit | Port | Command |
|------|------|---------|
| 2.1  | 3030 | `npm run slides:2.1` |
| 2.2  | 3031 | `npm run slides:2.2` |
| 2.3  | 3032 | `npm run slides:2.3` |
| 2.4  | 3033 | `npm run slides:2.4` |
| 2.5  | 3034 | `npm run slides:2.5` |
| 2.6  | 3035 | `npm run slides:2.6` |
| 2.7  | 3036 | `npm run slides:2.7` |

---

## 3. npm scripts (per unit)

When building a new unit, add three entries to `package.json` `"scripts"`:

```json
"slides:2.X": "slidev slides/2.X/slides.md --port 303N",
"slides:2.X:build": "slidev build slides/2.X/slides.md --base /slides/2.X/ --out ../../public/slides/2.X",
"slides:2.X:export": "slidev export slides/2.X/slides.md --output slides/2.X/export.pdf"
```

Then add the new `slides:2.X:build` to the `slides:build-all` chain:

```json
"slides:build-all": "npm run slides:2.1:build && npm run slides:2.2:build && ..."
```

The `prebuild` hook (`"prebuild": "npm run slides:build-all"`) runs `slides:build-all` before `next build`. This is what makes decks **live on the deployed site** — Cloudflare Pages runs `npm run build` and the prebuild generates `public/slides/2.X/` automatically. `@slidev/cli` is already a devDependency.

---

## 4. Deck content

**Length:** ~400–500 lines of Markdown, ~25–30 slides.
**Coverage:** all module worked examples + key code blocks + key concepts for the whole unit. The deck is the classroom presentation, not a reference book — keep each slide under ~6 bullets or ~15 lines of code.
**Style:** match `slides/2.1/slides.md` exactly. Re-read the first 10 slides of 2.1 before authoring.

### Required shape

**Frontmatter:**

```yaml
---
theme: default
title: "Unit 2.X — <Unit Name>"
info: |
  Unit 2.X: <Unit Name>.
  Week <N> · Q2 · <sessions> class sessions.
  Covers: <topics>.
class: text-center
transition: slide-left
mdc: true
---
```

**Slide separator:** `---` on its own line between slides.

**Progressive reveals:** use `<v-click>` for any "aha" moment — concept reveals, code annotations, comparisons. 2.1 uses ~15+ `<v-click>` reveals.

**Side-by-side layouts:** use `<div class="grid grid-cols-2 gap-8 mt-4">` (Tailwind).

**Code blocks:** fenced with ```js.

**Runnable code:** import and use `<Q5Runner :code="..." :width="400" :height="400" />` only when the slide demonstrates a q5play sketch that should run inside the deck. Copy the exact `<script setup lang="ts">` + import pattern from 2.1.

**Scaffold discipline:** show **conceptual** code in slides, not the graded-lab solution. Per `curriculum/resources/q5play-starter-conventions.md`, the graded starter is a scaffold; don't put the solution on a slide.

### Slide rhythm (adapt to unit content)

Approximate pacing used in 2.1 and 2.2:

1. Title slide (unit name, week, tagline)
2. "What you already know" (prior-unit review)
3. Concept reveal + `<v-click>`
4. DevTools / code-reveal walkthrough
5. New syntax slides (blueprint → example)
6. Live-code example with `Q5Runner`
7. Comparison slide (old way vs new way)
8. Discussion / pair-exercise prompt
9. Assignment preview (graded artifacts)
10. Scaffold rule reminder (pull from starter conventions)
11. Next-unit tease
12. Quick reference card
13. Wrap / questions

---

## 5. In-app lesson slot

Each unit's slide deck is surfaced through an in-app lesson at `lessons/2-X-1-slides/`:

```json
{
  "id": "2-X-1-slides",
  "title": "Unit 2.X Slides — <Unit Name>",
  "description": "Unit 2.X slides — <topics>. Includes runnable code examples.",
  "type": "lesson",
  "preview": "slides",
  "slidesUrl": "/slides/2.X/",
  "slidesDevUrl": "http://localhost:303N",
  ...
}
```

`slidesUrl` is a **relative path** (`/slides/2.X/`) — works in both dev (via Next.js public/ serving) and prod once the prebuild has run.

### `title` must not collide with a module number

The title uses the **unit** number (`Unit 2.X`), not a module number. Avoid "2.X.1 Slides …" — that collides with the curriculum's own Module 2.X.1 (the first module of the unit). Append the unit's full name for clarity.

✅ `"Unit 2.1 Slides — q5play Foundations"`
❌ `"2.1.1 Slides — Module 2.1 Presentation"` (collides with Module 2.1.1 in the curriculum plan)

### `description` must be student-facing

The `description` is rendered on the lesson card and at the top of the lesson page — students see it. Do NOT include implementation detail like "Built with Slidev", "Teachers edit content in slides/...", or "Live-editable deck". Describe what the student will see and do.

✅ `"Unit 2.1 slides — canvas, sprites, keyboard input, and the frame loop. Includes runnable code examples."`
❌ `"Live-editable slide deck with runnable q5play code. Built with Slidev. Teachers edit content in slides/2.1/slides.md."`

### Metadata-only fields

`slidesDevUrl` is **metadata-only**. The UI does not render it. Keep it for teacher/dev-server convenience; don't rely on it appearing on screen.

Do NOT add a `slidesSource` field. It was previously rendered as "Edit source: …" beneath the slides iframe, but that render was removed because it leaked teacher-implementation detail into the student view. The source file path is derivable from the folder name (`lessons/2-X-1-slides/` → `slides/2.X/slides.md`), so the field is redundant.

---

## 6. Gitignore

`public/slides/` is gitignored. Slidev build artifacts are regenerated on every Pages deploy via `prebuild` → `slides:build-all`. Do not commit them.

---

## 7. Authoring workflow

1. **Bootstrap:** `mkdir slides/2.X && cp -r slides/2.1/{components,public,setup} slides/2.X/`.
2. **Author slides.md** — read `slides/2.1/slides.md` for reference; keep style parity.
3. **Add 3 npm scripts** + chain into `slides:build-all`.
4. **Update in-app lesson** `lessons/2-X-1-slides/lesson.json` with `slidesUrl` and `slidesDevUrl`. Title follows `"Unit 2.X Slides — <Unit Name>"`; description is student-facing (see §5).
5. **Verify:** `npm run slides:2.X:build` should produce `public/slides/2.X/index.html` with no errors.
6. **Verify deploy path:** run `npm run build` (triggers prebuild) and confirm `public/slides/2.X/index.html` exists.
7. **Live-edit:** `npm run slides:2.X` on port 303N for authoring.

---

## History

| When | What |
|------|------|
| Unit 2.1 (initial) | Single deck at `slides/2.1/slides.md`, 482 lines, 30 slides. Served via `slidesUrl: "http://localhost:3030"` — broken in prod. |
| Unit 2.2 buildout | `public/slides/` gitignored. `prebuild` hook added. Both 2.1 and 2.2 `slidesUrl` switched to relative `/slides/2.X/`. Slides now live on the deployed site. |
| This doc | Hoisted out of per-unit work so 2.3 – 2.7 inherit the pattern. |
