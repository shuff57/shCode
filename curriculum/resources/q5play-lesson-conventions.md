# q5play Lesson Conventions

Canonical rules for **graded q5play lessons** — the core "build a running sketch" lesson type used throughout Unit 2. When a module spec references "q5play lesson", "starter", "scaffold", or a `lessons/<slug>/script.js` under `preview: "q5play"` + `type: "lesson"`, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `preview === "q5play"` AND `type === "lesson"`
- `lessons/<slug>/script.js` bundled with the above
- `assignments/*_starter.js` bundled with q5play lab assignments (A10.x, A11.x, A12.x, …) follow the same starter rules from §3 onward

**Canonical example:** `lessons/q5play-intro/` (2.1.5 Hello Sprite).

---

## 1. Required `lesson.json` shape

Use **Hello Sprite (`lessons/q5play-intro/lesson.json`)** as a concrete working template. Below is the live shape verbatim from it — copy this, then swap the title/description/content per lesson:

```json
{
  "id": "q5play-intro",
  "title": "2.1.5 Hello Sprite",
  "description": "Your first q5play sketch: a canvas, a sprite, a background color.",
  "type": "lesson",
  "difficulty": "beginner",
  "estimateMins": 20,
  "category": "Unit 2: q5play — Applied Game Development",
  "unit": "2.1 Foundations",
  "preview": "q5play",
  "week": 10,
  "slos": ["SLO-3"],
  "steps": [
    {
      "id": "s1",
      "title": "Create a canvas",
      "instructions": "Inside setup(), call `new Canvas(400, 400)` to make a 400×400 drawing area.",
      "hints": ["Open the q5play docs drawer on the right and find the Canvas section."]
    }
    /* …s2–s4 follow the same shape */
  ],
  "requirements": [
    { "id": "r1", "title": "Create a canvas", "description": "A canvas is created when the sketch starts.", "type": "regex", "file": "script.js", "pattern": "new\\s+Canvas\\s*\\(", "flags": "", "points": 10, "status": "pending" },
    { "id": "r2", "title": "Create at least one sprite", "description": "A sprite exists in the sketch.", "type": "regex", "file": "script.js", "pattern": "new\\s+Sprite\\s*\\(", "flags": "", "points": 10, "status": "pending" },
    { "id": "r3", "title": "Set a sprite color", "description": "A sprite has a color.", "type": "regex", "file": "script.js", "pattern": "\\.color\\s*=", "flags": "", "points": 5, "status": "pending" },
    { "id": "r4", "title": "Clear the background each frame", "description": "Previous frames don't stack up.", "type": "inFunction", "function": "draw", "file": "script.js", "pattern": "background\\s*\\(", "flags": "", "points": 5, "status": "pending" }
  ],
  "grading": { "totalPoints": 30, "passingScore": 20, "allowLateSubmit": true }
}
```

### Field-by-field

- `type` — **must be `"lesson"`**. `"assignment"` routes through `lab-assignment-conventions.md`; `"challenge"` through `q5play-challenge-conventions.md`.
- `preview` — **must be `"q5play"`**. This mounts the q5play runtime, the file editor + live preview, and the right-side docs drawer (see §5).
- `steps` — authored alongside requirements for authoring consistency and so the `// STEP N:` breadcrumbs in `script.js` have matching `steps[].id` values (see §3). **Currently not rendered in the student UI** (the Grading tab shows only `requirements` — see §5). The `instructions` + `hints` still belong here because future UI may surface them; keep them clean and pointing at the docs (see §2).
- `requirements` — auto-graded checks AND the student-facing task list (since `steps` are unrendered). Each requirement's `title` + `description` is what the student reads in the sidebar — write them as student-readable instructions, not terse grader labels. See `lab-assignment-conventions.md` for requirement-type grammar.
- `grading.totalPoints` — sum of all `requirements[].points`. Hello Sprite: `10+10+5+5 = 30`. Verify by hand.
- `grading.passingScore` — **does not gate Submit on q5 lessons.** Submit requires every requirement green (see §5). `passingScore` only affects the SubmitDialog's "below passing" warning, which can never fire for q5 since the Submit button stays disabled until all-green. Set it to `totalPoints` for new q5 lessons so the field reads as truthful; existing files using ~66% still work and don't need migration.

## 2. Hints rule — point at the docs, don't spoon-feed

`steps[].hints[]` **must be generic pointers that send the student to the q5play docs**, not answers or near-answers. The docs drawer auto-opens on q5play lessons (see §5), so the shortest path to "find it yourself" is a one-liner pointing at the drawer.

### ✅ Good hints (docs-pointer pattern)

```json
"hints": ["Open the q5play docs drawer on the right and find the Canvas section."]
"hints": ["Check the Sprite section of the q5play docs drawer for constructor arguments."]
"hints": ["Look up sprite properties in the q5play docs drawer."]
"hints": ["Search the q5play docs drawer for background()."]
```

### ❌ Bad hints (hand-feeding the answer)

```json
"hints": ["new Canvas(width, height) — width and height are in pixels."]  // shows the exact signature
"hints": ["Try 'red', '#ff00ff', or 'rgba(255,0,0,0.5)'."]                  // shows example values
"hints": ["Store it in a variable outside setup() so update()/draw() can use it."]  // describes the solution
```

### Why

- Students learn **docs lookup** — the dominant professional skill. A hint that points at the docs trains that muscle; a hint that pastes the signature atrophies it.
- The docs drawer is already on-screen (see §5). The student just needs to be nudged toward it.
- Generic hints survive curriculum refactors — if the q5play API changes, a "see Canvas section" pointer still works; a hardcoded signature doesn't.

---

## 3. Starters are scaffolds, not solutions

A graded q5play starter contains only **numbered `// STEP N:` comment breadcrumbs** inside empty `setup()` / `draw()` bodies. No pre-written calls to `new Canvas`, `new Sprite`, `background()`, etc.

Each `// STEP N:` must correspond one-to-one with a `lesson.json.steps[].id` entry (or, for downloadable `assignments/*_starter.js` files, to a numbered requirement in the assignment markdown).

### Why

Graded lessons define `grading.totalPoints > 0` and `requirements[]` entries — regex / `inFunction` patterns the auto-grader runs against `script.js`. If the starter already satisfies those patterns, the lesson is "complete" on page load. The student writes nothing. The grade is not earned.

The STEP comments are the breadcrumb trail. The working program is the destination.

### Canonical example — `lessons/q5play-intro/script.js`

```js
// 2.1.5 Hello Sprite — your first q5play sketch.

let player;

function setup() {
  // STEP 1: Create a 400×400 canvas

  // STEP 2: Create a sprite at the center (200, 200), 40 wide, 40 tall

  // STEP 3: Give it a color — try 'deepskyblue' or any CSS color
}

function draw() {
  // STEP 4: Clear the background each frame so old drawings don't pile up
}
```

Matches `lesson.json.steps` IDs `s1`–`s4`. The four regex / `inFunction` requirements (`new Canvas(`, `new Sprite(`, `.color =`, `background(` inside `draw`) are the grading targets.

### Exceptions

- **Worked examples** — lessons with `preview: "example"` and `grading.totalPoints === 0` (read-not-graded reference material) may ship fully working code. `lessons/q5play-gravity/`, `lessons/q5play-camera/`, `lessons/q5play-pendulum/`, `lessons/q5play-sprite-showcase/` etc.
- **Challenge shells** — `lessons/q5play-*-challenge/` starters that ship with a `BUILD THIS:` block-comment spec followed by empty bodies are also acceptable; the spec comment is itself the scaffold.

---

## 4. Starter `script.js` rules

### 4.1 No `/// <reference path=...>` in lesson `script.js`

Do not include a triple-slash TypeScript reference directive at the top of any `lessons/<slug>/script.js`:

```js
// ❌ do not include:
/// <reference path="/q5play/docs/q5play.d.ts" />
```

The in-app editor injects q5play type definitions into Monaco automatically. The reference directive is redundant clutter visible at the top of the student-facing editor pane.

**History:** stripped from all 18 q5play starters in commit `3cb9831`.

This rule is specific to in-app lesson files. Downloadable `assignments/*_starter.js` files opened in external editors may keep a reference directive if needed.

### 4.2 Header comment format

First line of the starter is a single-line comment matching `lesson.json.title`:

```js
// 2.1.5 Hello Sprite — your first q5play sketch.
```

Format: `// <unit-numbering> <title> — <one-line tagline>`.

Blank line, then top-level `let` declarations (declarations only — no initialization; the student initializes inside `setup()`).

### 4.3 Function order

```js
function setup() {  // once
  // STEP N:
}

function draw() {   // every frame
  // STEP N:
}
```

`setup()` appears before `draw()`. Optional `update()` (between them) only when the lesson explicitly teaches the physics update hook — skip in the Foundations unit.

---

## 5. UI behavior the student sees

This isn't something the lesson author configures — it's what the in-app workspace does automatically when `preview === "q5play"`. Knowing it helps you write requirements + hints correctly.

- **Top assignment header with Submit button** renders on every q5play lesson (`components/AssignmentHeader.tsx`). It shows the lesson title, week + category, a live score bar (current grade / total), an "In Progress" / "Submitted" badge, and the Submit button.
  - **Submit is disabled until every requirement is green.** The gate is `requirements.every(r => r.status === 'passed')`, not `score >= passingScore`. This is q5-specific (`components/LessonWorkspace.tsx` — see `canSubmit` for `isQ5Mode`).
  - **Submit writes to the DB.** On confirm, the workspace POSTs the `script.js` content + full grade report to `/api/lesson-submissions` (append-only history) and marks `lesson_state` as `completed` with the earned score. If the server write fails, the student sees an alert and the lesson stays "In Progress" so they can retry.
  - **Completion is sticky.** Once submitted, the lesson shows green-check completion in the lesson list / teacher gradebook views. There's no "unsubmit" UI from the workspace; teachers can clear `lesson_state` server-side if needed.
- **Right-side q5play docs drawer** auto-opens on every q5play lesson (`components/Q5DocsDrawer.tsx`). Students pick a section from a dropdown and read pages inline. Close it with `×`; the closed state persists per-device in `localStorage` under `shCode:q5docs:closed` and reopens via a small vertical "Docs" tab on the right edge. Because of this, **hints should always assume the docs are one click away** — see §2.
- **Left sidebar's Grading tab** (the default tab) shows `requirements[]` stacked top-to-bottom. Each requirement renders as a card with:
  - A **4px left border** colored green (passed), red (failed), or muted grey (not yet graded). No check/X circle, no point total.
  - The requirement's `title` (bold heading) + `description` (sub-line) + any grader `messages[]`.
  - This is the student's primary task list — `steps[]` is not currently rendered (see §1 field-by-field).
- **Editor + live preview** render directly on the right side of the sidebar (no wrapping `<details>` dropdown). Above them sits a toolbar with `▶ Run` / `Reset` on the left (q5play / jscad / console modes) and `Commit (N) / History` on the right.
- **Console log** sits below the editor/preview split inside its own `<details>` block (summary = "Console"). Students can expand it when they want to see `console.log` output or errors; collapsed by default so the editor + preview have maximum vertical room.
- **Both sidebars are drag-resizable.** Each has a 6px invisible grab on its outer edge (right edge for the left sidebar; left edge for the docs drawer). Student drags to resize; the new width persists per-device. Keys: `shCode:sidebar:width` (left sidebar, 200–520px, default 260) and `shCode:q5docs:width` (docs drawer, 280–640px, default 420). This means the student controls the **reading-vs-coding ratio** for every lesson — don't assume a fixed viewport when writing requirement descriptions; they should be readable at the narrow end.

Reset restores the starter `script.js` — warn students in a requirement `description` if you want them to iterate experimentally.

---

## 6. File layout

```
lessons/<slug>/
├── lesson.json
└── script.js        # scaffold with // STEP N: breadcrumbs, empty setup/draw bodies
```

No `content.md` needed — step `instructions` live inline in `lesson.json`.

---

## 7. Title convention

> **`<unit-numbering>` = three dotted numbers `U.M.N`** (e.g. `2.1.5`). Titles MUST start with that prefix or the lesson vanishes from `/module/U.M` and the home page. See [README §Title numbering](README.md#title-numbering--the-hard-rule).

`"<unit-numbering> <Lesson Name>"` — no "Lesson" word in the title; the badge handles that.

Examples:
- `"2.1.5 Hello Sprite"`
- `"2.1.9 Make it Move"`
- `"2.2.5 Enemy Class"`

---

## 8. Don'ts

- **Do not ship a working solution.** Starter is a scaffold (see §3).
- **Do not give specific hints.** Generic docs pointers only (see §2).
- **Do not include `/// <reference path=...>`** in `script.js` (see §4.1).
- **Do not include `authored_by_email` or other DB-side fields** in the starter. Those belong to the commit pipeline.
- **Do not duplicate the module's teacher-led demo in `script.js`.** The demo is in the slide deck; the starter is what the student types from empty.

---

## Auditing

```bash
# reference directive must not appear in any in-app lesson starter:
rg "reference path=.*q5play\\.d\\.ts" lessons/

# graded starters should have empty setup/draw bodies (visual spot-check):
# for each lessons/<slug>/ where lesson.json.grading.totalPoints > 0,
# confirm script.js has only // STEP comments inside the function bodies.

# hints should be generic docs pointers (no specific signatures / values):
# grep for common tell-tales of answer-leaking hints:
rg '"hints":\s*\[[^\]]*\bnew\s+(Canvas|Sprite)' lessons/    # leaks constructor
rg '"hints":\s*\[[^\]]*=\s*['"'"'"]'             lessons/    # leaks a literal value
```

---

## History

| When | What |
|------|------|
| Commit `3cb9831` | Stripped `/// <reference path=...>` from all 18 q5play starters. |
| Module 2.1.1 / 2.1.2 authoring | Scaffold-not-solution convention crystallized. Canonical example = `lessons/q5play-intro/script.js`. |
| Rename + expansion | File renamed `q5play-starter-conventions.md` → `q5play-lesson-conventions.md` and broadened to cover the full Q5 Lesson type: added §1 `lesson.json` shape, §2 hints-rule (generic docs pointers), §5 UI-behavior notes covering the right-side docs drawer, Grading tab (merged steps+requirements), and the Code Editor / Preview dropdown with Run + Reset buttons. All 15 references in other curriculum docs updated. |
| UI refactor | Grading tab dropped the `Steps` subsection — now renders only `requirements[]`, stacked vertically. `RequirementCard` simplified: no status circle, no `N/M pts` label; pass/fail signalled only by the 4px left border (green / red / muted). Editor + preview + console unwrapped from their `<details>` dropdowns; Commit / History moved into the editor toolbar (right-aligned, opposite Run/Reset). §1 JSON shape rewritten to use Hello Sprite's concrete values; §1 field-by-field notes that `steps[]` is currently unrendered and `requirements[]` titles/descriptions must carry the student-facing task wording. §5 rewritten to match. |
| Collapsible console + resizable sidebars | Console log put back inside a `<details>` (collapsed by default) so the editor/preview have maximum vertical room. Both side panels (left Files/Grading sidebar and right q5 docs drawer) gained 6px drag handles on their outer edges; widths persist per-device in `localStorage` under `shCode:sidebar:width` and `shCode:q5docs:width`. §5 notes the resize affordance and reminds authors not to assume a fixed viewport. |
| Submit + DB-tracked completion on q5 lessons | Every q5 lesson (`preview === "q5play"`) now renders the AssignmentHeader with a Submit button — previously only `type: "assignment"` lessons did. Submit is gated on **all requirements green** (q5-specific rule, replacing the old `score >= passingScore` gate). On confirm, the workspace writes to `/api/lesson-submissions` and marks `lesson_state` completed; failure surfaces as an alert and keeps the lesson In Progress. §1 field-by-field notes that `passingScore` no longer gates Submit on q5; §5 documents the header + Submit behavior; §8 dropped the "don't set `passingScore === totalPoints`" rule since the gate is now all-green. |
