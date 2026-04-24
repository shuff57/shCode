# Slide Deck Conventions

Canonical rules for authoring Slidev decks for **any curriculum unit**. One deck per unit, served statically from `public/slides/U.M/` via the Next.js build (where U = unit number, M = module number). When a module spec under `curriculum/modules/lessons/U.M.Y_*.md` references "the unit slide deck" or a `lessons/U-M-1-slides/` in-app lesson, these rules are binding.

**Canonical reference:** Unit 2.1 (`slides/2.1/slides.md`, ~440 lines, 30 slides) was the first deck built under this convention and remains the style reference. The q5play-specific patterns below (Q5Runner embed, sprite-heavy slide rhythm) are tagged **[q5play]** — skip them if the unit isn't q5play-based.

---

## 1. One deck per unit

Each unit has exactly **one** Slidev deck covering all its modules. Decks live at:

```
slides/U.M/
├── slides.md         # the deck — ~400–500 lines, ~25–30 slides
├── setup/            # Slidev setup hooks
├── components/       # [q5play] per-deck Vue components (e.g. Q5Runner.vue)
└── public/           # [q5play] runtime assets (q5.js + Box2D)
```

For q5play units: copy `components/` and `public/` from `slides/2.1/`. For non-q5play units (Unit 1, future Unit 3+ that don't embed runnable sketches), the `components/` and `public/` folders are optional — omit them if the deck is pure content.

**Bootstrap (q5play unit):**

```bash
mkdir -p slides/U.M
cp -r slides/2.1/{components,public,setup} slides/U.M/
```

**Bootstrap (non-q5play unit):**

```bash
mkdir -p slides/U.M/setup
cp slides/2.1/setup/* slides/U.M/setup/
```

Then author `slides/U.M/slides.md` (see §4).

---

## 2. Port allocation (dev servers)

Each unit's live-edit dev server runs on its own port so multiple decks can run simultaneously. Rule: **port = 3030 + N**, where N is the deck's position in `slides:build-all`. Current assignments:

| Unit | Port | Command |
|------|------|---------|
| 2.1  | 3030 | `npm run slides:2.1` |
| 2.2  | 3031 | `npm run slides:2.2` |
| 2.3  | 3032 | `npm run slides:2.3` |
| 2.4  | 3033 | `npm run slides:2.4` |
| 2.5  | 3034 | `npm run slides:2.5` |
| 2.6  | 3035 | `npm run slides:2.6` |
| 2.7  | 3036 | `npm run slides:2.7` |
| 3.1  | 3037 | `npm run slides:3.1` |
| 3.2  | 3038 | `npm run slides:3.2` |
| …    | +1 per new deck | |

Keep ports unique across all decks even if you never run two at once — consistency makes muscle memory reliable.

---

## 3. npm scripts (per unit)

When adding a new unit, append three entries to `package.json` `"scripts"`:

```json
"slides:U.M": "slidev slides/U.M/slides.md --port 30NN",
"slides:U.M:build": "slidev build slides/U.M/slides.md --base /slides/U.M/ --out ../../public/slides/U.M",
"slides:U.M:export": "slidev export slides/U.M/slides.md --output slides/U.M/export.pdf"
```

Then add the new `slides:U.M:build` to the `slides:build-all` chain:

```json
"slides:build-all": "npm run slides:2.1:build && npm run slides:2.2:build && ... && npm run slides:U.M:build"
```

The `prebuild` hook (`"prebuild": "npm run slides:build-all"`) runs `slides:build-all` before `next build`. This is what makes decks **live on the deployed site** — Cloudflare Pages runs `npm run build` and the prebuild generates `public/slides/U.M/` automatically. `@slidev/cli` is already a devDependency.

---

## 4. Deck content

**Length:** ~400–500 lines of Markdown, ~25–30 slides.
**Coverage:** all module worked examples + key code blocks + key concepts for the whole unit. The deck is the classroom presentation, not a reference book — keep each slide under ~6 bullets or ~15 lines of code.
**Style:** match `slides/2.1/slides.md`. Re-read the first 10 slides of 2.1 before authoring.

### Required shape

**Frontmatter:**

```yaml
---
theme: default
title: "Unit U.M — <Unit Name>"
info: |
  Unit U.M: <Unit Name>.
  Week <N> · Q<n> · <sessions> class sessions.
  Covers: <topics>.
class: text-center
transition: slide-left
mdc: true
---
```

**Slide separator:** `---` on its own line between slides.

**Progressive reveals:** use `<v-click>` for any "aha" moment — concept reveals, code annotations, comparisons. Unit 2.1 uses ~15+ reveals.

**Side-by-side layouts:** `<div class="grid grid-cols-2 gap-8 mt-4">` (Tailwind).

**Code blocks:** fenced with ```js (or whatever language).

**[q5play] Runnable code:** import and use `<Q5Runner :code="..." :width="400" :height="400" />` only when the slide demonstrates a q5play sketch that should run inside the deck. Copy the exact `<script setup lang="ts">` + import pattern from 2.1. Non-q5play units skip this entirely — drop the `components/Q5Runner.vue` file and don't reference it.

**Scaffold discipline:** show **conceptual** code in slides, not the graded-lab solution. Per `q5play-starter-conventions.md` (or the unit's equivalent starter doc), the graded starter is a scaffold; don't put the solution on a slide.

### Slide rhythm (adapt to unit content)

Approximate pacing used in 2.1 and 2.2 — adapt per unit:

1. Title slide (unit name, week, tagline)
2. "What you already know" (prior-unit review)
3. Concept reveal + `<v-click>`
4. DevTools / code-reveal walkthrough
5. New syntax slides (blueprint → example)
6. Live-code example (q5play: with `Q5Runner`; other units: static code + discussion)
7. Comparison slide (old way vs new way)
8. Discussion / pair-exercise prompt
9. Assignment preview (graded artifacts)
10. Scaffold rule reminder
11. Next-unit tease
12. Quick reference card
13. Wrap / questions

---

## 5. In-app lesson slot

Each unit's slide deck is surfaced through an in-app lesson at `lessons/U-M-1-slides/`:

```json
{
  "id": "U-M-1-slides",
  "title": "U.M.1 Slides — <Unit Name>",
  "description": "Unit U.M slides — <topics>. Includes runnable code examples.",
  "type": "lesson",
  "preview": "slides",
  "slidesUrl": "/slides/U.M/",
  "slidesDevUrl": "http://localhost:30NN",
  ...
}
```

`slidesUrl` is a **relative path** (`/slides/U.M/`) — works in both dev (via Next.js public/ serving) and prod once the prebuild has run.

### `title` MUST start with a numbered prefix

`lib/curriculum.ts` → `parseNumberedIdFromTitle` greps the title for a leading `X.Y.Z` pattern and applies to every unit. Any lesson whose title doesn't start with three dotted numbers is silently dropped from the module listing page AND the home page — the student never sees it.

Slides always occupy the `.1` position in their module. All other lessons in that module start at `.2`.

✅ `"2.1.1 Slides — q5play Foundations"` (Unit 2, Module 1)
✅ `"2.2.1 Slides — Object-Oriented Programming"` (Unit 2, Module 2)
✅ `"3.1.1 Slides — <Unit 3 Module 1 name>"` (Unit 3 when it ships)
❌ `"Unit 2.1 Slides — q5play Foundations"` (no numbered prefix — lesson vanishes from /module/2.1)
❌ `"2.1 Slides — q5play Foundations"` (needs three numbers, not two)

The teacher-reference doc at `curriculum/modules/lessons/U.M.1_*.md` shares the same number but lives in a different namespace (never rendered to students), so there's no actual collision.

### `description` must be student-facing

The `description` is rendered on the lesson card and at the top of the lesson page — students see it. Do NOT include implementation detail like "Built with Slidev", "Teachers edit content in slides/...", or "Live-editable deck". Describe what the student will see and do.

✅ `"Unit 2.1 slides — canvas, sprites, keyboard input, and the frame loop. Includes runnable code examples."`
❌ `"Live-editable slide deck with runnable q5play code. Built with Slidev. Teachers edit content in slides/2.1/slides.md."`

### Metadata-only fields

`slidesDevUrl` is **metadata-only**. The UI does not render it. Keep it for teacher/dev-server convenience; don't rely on it appearing on screen.

Do NOT add a `slidesSource` field. It was previously rendered as "Edit source: …" beneath the slides iframe, but that render was removed because it leaked teacher-implementation detail into the student view. The source file path is derivable from the folder name (`lessons/U-M-1-slides/` → `slides/U.M/slides.md`), so the field is redundant.

---

## 6. Gitignore

`public/slides/` is gitignored. Slidev build artifacts are regenerated on every Pages deploy via `prebuild` → `slides:build-all`. Do not commit them.

---

## 7. Authoring workflow

1. **Bootstrap:** `mkdir slides/U.M && cp -r slides/2.1/{setup,components,public} slides/U.M/` (drop `components,public` for non-q5play units).
2. **Author slides.md** — read `slides/2.1/slides.md` for reference; keep style parity.
3. **Add 3 npm scripts** to `package.json` + chain into `slides:build-all`.
4. **Update in-app lesson** `lessons/U-M-1-slides/lesson.json` with `slidesUrl` and `slidesDevUrl`. Title MUST start with `"U.M.1 Slides — <Unit Name>"` (see §5 for why); description is student-facing (see §5).
5. **Verify:** `npm run slides:U.M:build` should produce `public/slides/U.M/index.html` with no errors.
6. **Verify deploy path:** run `npm run build` (triggers prebuild) and confirm `public/slides/U.M/index.html` exists.
7. **Live-edit:** `npm run slides:U.M` on port 30NN for authoring.

---

## History

| When | What |
|------|------|
| Unit 2.1 (initial) | Single deck at `slides/2.1/slides.md`, 482 lines, 30 slides. Served via `slidesUrl: "http://localhost:3030"` — broken in prod. |
| Unit 2.2 buildout | `public/slides/` gitignored. `prebuild` hook added. Both 2.1 and 2.2 `slidesUrl` switched to relative `/slides/U.M/`. Slides now live on the deployed site. |
| Rename + generalize | File renamed from `q5play-slides-conventions.md` to `slide-deck-conventions.md`. Unit-2-specific assumptions tagged `[q5play]` so Unit 3+ (any subject) can follow the same rules. Title rule (`U.M.1 …`) made explicit after two lessons shipped with the wrong title and vanished from the module page. |
