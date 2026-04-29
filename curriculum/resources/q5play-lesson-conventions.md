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
    { "id": "r1", "title": "Create a canvas", "description": "A canvas is created when the sketch starts.", "type": "regex", "file": "script.js", "pattern": "new\\s+Canvas\\s*\\(", "flags": "", "points": 0, "status": "pending" },
    { "id": "r2", "title": "Create at least one sprite", "description": "A sprite exists in the sketch.", "type": "regex", "file": "script.js", "pattern": "new\\s+Sprite\\s*\\(", "flags": "", "points": 0, "status": "pending" },
    { "id": "r3", "title": "Set a sprite color", "description": "A sprite has a color.", "type": "regex", "file": "script.js", "pattern": "\\.color\\s*=", "flags": "", "points": 0, "status": "pending" },
    { "id": "r4", "title": "Clear the background each frame", "description": "Previous frames don't stack up.", "type": "inFunction", "function": "draw", "file": "script.js", "pattern": "background\\s*\\(", "flags": "", "points": 0, "status": "pending" }
  ],
  "grading": { "totalPoints": 0, "passingScore": 0, "allowLateSubmit": true }
}
```

### Field-by-field

- `type` — **must be `"lesson"`**. `"assignment"` routes through `lab-assignment-conventions.md`; `"challenge"` through `q5play-challenge-conventions.md`.
- `difficulty` — **must be `"beginner"`**. Practice q5 lessons sit at the bottom rung of the lesson/lab/challenge progression. Labs (`type: "assignment"`) bump to `"intermediate"`; challenges (`type: "challenge"`) bump to `"advanced"`. The `difficulty` field encodes this slot-type tier, not the absolute content difficulty.
- `preview` — **must be `"q5play"`**. This mounts the q5play runtime, the file editor + live preview, and the right-side `TabbedRightDrawer` whose tabs include Docs / Quest / File (see §5).
- `steps` — authored alongside requirements for authoring consistency and so the `// STEP N:` breadcrumbs in `script.js` have matching `steps[].id` values (see §3). **Currently not rendered in the student UI** (the Quest tab shows only `requirements` — see §5). The `instructions` + `hints` still belong here because future UI may surface them; keep them clean and pointing at the docs (see §2).
- `requirements` — auto-graded checks AND the student-facing task list (since `steps` are unrendered). Each requirement's `title` + `description` is what the student reads in the Quest tab — write them as student-readable instructions, not terse grader labels. See `lab-assignment-conventions.md` for requirement-type grammar.
- `grading.totalPoints` — **always `0`.** The course is mastery-based: Submit is gated all-green (every requirement passed), not points-based. Keep the field for schema compatibility; never assign a non-zero value.
- `grading.passingScore` — **always `0`.** Same reason. The all-green Submit gate is the only criterion that matters; `passingScore` is decorative.
- `requirements[].points` — **always `0`.** Author by criterion, not by weight. The student UI shows a `passed/total` criteria count (no `pts` suffix) and the bottom-right progress badge under green-to-advance.

## 2. Hints rule — point at the docs, don't spoon-feed

`steps[].hints[]` **must be generic pointers that send the student to the q5play docs**, not answers or near-answers. The Docs tab is one click away on every q5play lesson (vertical "Docs" button on the right edge of the workspace — see §5), so the shortest path to "find it yourself" is a one-liner pointing at it.

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
- The Docs tab is always one click away on the right edge of the workspace (see §5). The student just needs to be nudged toward it.
- Generic hints survive curriculum refactors — if the q5play API changes, a "see Canvas section" pointer still works; a hardcoded signature doesn't.

---

## 3. Starters are scaffolds, not solutions

A graded q5play starter contains only **numbered `// STEP N:` comment breadcrumbs** inside empty `setup()` / `draw()` bodies. No pre-written calls to `new Canvas`, `new Sprite`, `background()`, etc.

Each `// STEP N:` must correspond one-to-one with a `lesson.json.steps[].id` entry (or, for downloadable `assignments/*_starter.js` files, to a numbered requirement in the assignment markdown).

### Why

Graded lessons define `requirements[]` entries — regex / `inFunction` patterns the auto-grader runs against `script.js`. If the starter already satisfies those patterns, the lesson is "complete" on page load. The student writes nothing. The all-green Submit gate is reached for free, the next lesson unlocks for free, and the work is unearned.

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

### Variants

- **Worked examples** — lessons with `preview: "example"` (read-not-graded reference material; no `requirements[]`) may ship fully working code. `lessons/2-3-19-example-pendulum/`, `lessons/2-4-8-example-camera-follow/`, etc.
- **Lab assignments** (`type: "assignment"`) — same scaffold shape as the canonical example above, **but the `// STEP N:` comments must describe the task in plain English without commented-out solution code**. See `lab-assignment-conventions.md` §3.
- **Challenges** (`type: "challenge"`) — `script.js` ships **fully empty** (zero bytes); no header, no lets, no skeleton, no breadcrumbs. The student structures the entire program themselves. See `q5play-challenge-conventions.md` §4.

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

- **Top assignment header** renders on every q5play lesson (`components/AssignmentHeader.tsx`). It shows the lesson title on the left and a **right-aligned criteria-progress tracker** on the right — a live score bar plus a `passed/total` count of requirement cards (no `pts` suffix; q5 grading is binary/completion-based, so the count is criteria, not points). The "In Progress" / "Submitted" badge and the Submit button are **not** in this header on q5 lessons (see below).
  - **Submit lives in the editor toolbar** on q5 lessons, to the right of the Commit and History buttons. It is the same `Submit` action — moved out of the header to keep the q5 header minimal (title + progress only). On regular `type: "assignment"` lessons (non-q5), Submit stays in the header along with the status badge.
  - **Submit is disabled until every requirement is green.** The gate is `requirements.every(r => r.status === 'passed')`, not `score >= passingScore`. This is q5-specific (`components/LessonWorkspace.tsx` — see `canSubmit` for `isQ5Mode`).
  - **Submit writes to the DB.** On confirm, the workspace POSTs the `script.js` content + full grade report to `/api/lesson-submissions` (append-only history) and marks `lesson_state` as `completed` with the earned score. If the server write fails, the student sees an alert and the lesson stays unsubmitted so they can retry.
  - **Completion is sticky.** Once submitted, the lesson shows green-check completion in the lesson list / teacher gradebook views. There's no "unsubmit" UI from the workspace; teachers can clear `lesson_state` server-side if needed.
- **Right-edge `TabbedRightDrawer`** (`components/TabbedRightDrawer.tsx`) is the single right-side panel; it replaces the old left sidebar + auto-open docs drawer. A vertical column of tab buttons sits on the right edge of the viewport at all times; clicking a tab slides a shared panel in from the right (only one tab open at a time). The drawer **starts closed** on every lesson — students click a tab to open it. State persists per-device under `shCode:drawer:active` (last-open tab key) and `shCode:drawer:width` (panel width, 240–600px, default 320). Tabs available on a q5play lesson, top-to-bottom:
  - **Docs** (q5 only, purple) — q5play docs viewer (`Q5DocsContent`). Tab header has a `Docs ↗` button that opens the full `/docs/q5play` page in a new tab. Because of this, **hints should always assume the docs are one click away** — see §2.
  - **Quest** (green) — the student's primary task list. Renders `requirements[]` stacked top-to-bottom via `RequirementsSection`. Each requirement is a card with a **4px left border** colored green (passed), red (failed), or muted grey (not yet graded) — no check/X circle, no point total. Card body = requirement `title` (bold) + `description` + any grader `messages[]`. `steps[]` is **not** rendered here (see §1 field-by-field). Empty state: "No graded items for this lesson."
  - **File** (cyan) — file picker / explorer (`FileExplorer`) plus Upload / Download buttons for the active file.
- **Editor + live preview** render in the main content column to the left of the tab strip. Above them sits a toolbar with `▶ Run` / `Reset` on the left (q5play / jscad / console modes) and `Commit (N) / History / Submit` on the right (Submit only on q5 lessons; same disabled-until-all-green gate as before).
- **Console log** sits below the editor/preview split inside its own `<details>` block (summary = "Console"). Students can expand it when they want to see `console.log` output or errors; collapsed by default so the editor + preview have maximum vertical room.
- **Drawer is drag-resizable.** A 6px grab handle sits on the panel's left edge; dragging adjusts width within `[240, 600]` and persists to `shCode:drawer:width`. The body's right padding reflows with `--shd-tabbed` so the editor area shrinks to make room. Authors should still **not assume a fixed viewport** when writing requirement descriptions: students may have the drawer open at near-max width on a small laptop, leaving the editor + preview narrow. Requirement `title` + `description` should read cleanly at the narrow end.
- **Bottom progress footer** (`components/LessonProgressFooter.tsx`) is fixed to the bottom of the viewport on every lesson page — module link, lesson position, completion dots, percentage. The body reserves bottom space (`body:has(.lesson-progress-footer) { padding-bottom: 60px }`) so the expanded console isn't covered by it.
- **Green-to-advance lesson lock.** A student can only navigate forward to the next lesson once the current one is `lesson_state === 'completed'`. Three places enforce this:
  - `components/HeaderLessonNav.tsx` — the **Next** link in the header chrome shows 🔒 + `cursor: not-allowed` until current is completed. Prev stays open for review.
  - `components/LessonProgressFooter.tsx` — dots past the first not-completed lesson render as non-clickable `<span>`s with the same locked styling.
  - `components/ModuleLessonsList.tsx` — on the module page, lessons after the first not-completed one render as non-Link `<div>` rows with a "🔒 Locked" pill and `aria-disabled="true"`.

  Already-started, current, and previously-completed lessons all stay reachable. The unlocking rule is linear: a lesson at index `i` is unlocked iff every prior lesson in module order has `lesson_state === 'completed'`.

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
# for each lessons/<slug>/ where lesson.json has `requirements[]`,
# confirm script.js has only // STEP comments inside the function bodies.

# all points must be 0 — points are deprecated; flag any non-zero values:
rg '"points":\s*[1-9]'    lessons/
rg '"totalPoints":\s*[1-9]' lessons/
rg '"passingScore":\s*[1-9]' lessons/

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
| Q5 header simplification | On q5 lessons the AssignmentHeader stripped down to just **title + right-aligned criteria-progress tracker**: removed the "In Progress" / "Submitted" badge and changed the score from points (`N/M pts`) to a criteria pass count (`N/M`, no unit) since q5 grading is binary. The Submit button moved out of the header into the editor toolbar, immediately to the right of Commit and History. AssignmentHeader gained `unitLabel`, `showStatus`, `showSubmit`, and `scoreAlign` props; LessonWorkspace passes `unitLabel=""`, `showStatus=false`, `showSubmit=false`, `scoreAlign="right"` in q5 mode and renders its own toolbar Submit button (same `handleSubmit`, same all-green gate). Non-q5 assignments are unchanged. §5 rewritten to match. |
| Right-side panel consolidation | Retired the separate left sidebar (Files / Grading) and the auto-opening `Q5DocsDrawer` in favor of a single right-edge `TabbedRightDrawer` carrying **Docs / Quest / File** tabs. Drawer starts closed on every lesson (no auto-open); students click a vertical tab on the right edge to open the shared panel. State persists under `shCode:drawer:active` + `shCode:drawer:width` (240–600, default 320), replacing the old `shCode:sidebar:width` and `shCode:q5docs:*` keys. §1 field-by-field updated ("the Quest tab" replaces "the sidebar" / "the Grading tab"); §2 hints rule updated (Docs is one click away, not auto-open); §5 fully rewritten to describe the three tabs, the closed-by-default behavior, and the bottom `LessonProgressFooter`. |
| Scaffold variants split | §3 "Exceptions" renamed to "Variants" and split out the per-`type` rules: `lesson` ships a description-only scaffold (canonical), `assignment` ships the same scaffold shape but with the **describe-don't-show** rule made explicit (`// STEP N:` comments must not contain commented-out solution code — see `lab-assignment-conventions.md` §3), and `challenge` ships **fully empty** per `q5play-challenge-conventions.md` §4. The stale "Challenge shells with `BUILD THIS:` blocks" entry was removed — that pre-2.2 pattern is retired everywhere. |
| Difficulty tiers slot-type | `difficulty` field now encodes the lesson/lab/challenge progression rather than absolute content difficulty: practice (`type: "lesson"`) is `"beginner"`, lab (`type: "assignment"`) is `"intermediate"`, challenge (`type: "challenge"`) is `"advanced"`. §1 field-by-field updated. Sister conventions `lab-assignment-conventions.md` and `q5play-challenge-conventions.md` carry the matching rule. |
| No-points + green-to-advance | The course is now mastery-based, not score-based. **All `points`, `totalPoints`, and `passingScore` values must be `0`** — the all-green Submit gate is the only criterion. §1 JSON example zeroed out; §1 field-by-field reframes the three numeric fields as decorative-must-be-zero. §3 dropped "totalPoints > 0" framing. §5 added the green-to-advance lesson-nav lock (header next-link, footer dots, module-page list — all gated on prior lesson `lesson_state === 'completed'` per `components/HeaderLessonNav.tsx`, `LessonProgressFooter.tsx`, `ModuleLessonsList.tsx`). Audit grep added at §Auditing. Retrofit pass zeroed all `lessons/2-1-*` / `2-2-*` / `2-3-*` / `2-4-*` lesson.json files. Sister conventions `lab-assignment-conventions.md`, `q5play-challenge-conventions.md`, and `sub-module-spec-conventions.md` carry matching updates. |
