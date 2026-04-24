# q5play Lesson Conventions

Canonical rules for **graded q5play lessons** — the core "build a running sketch" lesson type used throughout Unit 2. When a module spec references "q5play lesson", "starter", "scaffold", or a `lessons/<slug>/script.js` under `preview: "q5play"` + `type: "lesson"`, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `preview === "q5play"` AND `type === "lesson"`
- `lessons/<slug>/script.js` bundled with the above
- `assignments/*_starter.js` bundled with q5play lab assignments (A10.x, A11.x, A12.x, …) follow the same starter rules from §3 onward

**Canonical example:** `lessons/q5play-intro/` (2.1.5 Hello Sprite).

---

## 1. Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> <Lesson Name>",
  "description": "<one-line hook>",
  "type": "lesson",
  "difficulty": "beginner",
  "estimateMins": 20,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "q5play",
  "week": <n>,
  "slos": ["SLO-<n>"],
  "steps": [
    {
      "id": "s1",
      "title": "<short imperative>",
      "instructions": "<one sentence telling the student what to do>",
      "hints": ["<generic doc pointer — see §2>"]
    }
  ],
  "requirements": [
    {
      "id": "r1",
      "title": "<what passes>",
      "description": "<one-line test description>",
      "type": "regex" | "inFunction",
      "file": "script.js",
      "pattern": "<regex>",
      "flags": "",
      "points": <n>,
      "status": "pending"
    }
  ],
  "grading": { "totalPoints": <n>, "passingScore": <n>, "allowLateSubmit": true }
}
```

### Field-by-field

- `type` — **must be `"lesson"`**. `"assignment"` routes through `lab-assignment-conventions.md`; `"challenge"` through `q5play-challenge-conventions.md`.
- `preview` — **must be `"q5play"`**. This is what mounts the q5play runtime, the file editor, AND the right-side docs drawer (see §5).
- `steps` — the student-visible task list, rendered in the left sidebar's **Grading** tab. Each step has `id` (matches a `// STEP N:` breadcrumb in `script.js` — see §3), `title`, `instructions` (one sentence), and `hints[]` (see §2).
- `requirements` — auto-graded checks. One requirement per step is the happy path; see `lab-assignment-conventions.md` for the detailed requirement-type grammar.
- `grading.totalPoints` — sum of all `requirements[].points`. Verify by hand.
- `grading.passingScore` — conventionally **~66% of `totalPoints`**. Allows one missed requirement without blocking progression.

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

This isn't something the lesson author configures — it's what the in-app workspace does automatically when `preview === "q5play"`. Knowing it helps you write hints and steps correctly.

- **Right-side q5play docs drawer** auto-opens on every q5play lesson (`components/Q5DocsDrawer.tsx`). Students pick a section from a dropdown and read pages inline. They can close it with `×`; the closed state persists per-device in `localStorage` under `shCode:q5docs:closed` and reopens with a "Docs" tab on the right edge.
- **Left sidebar's Grading tab** lists `steps[]` AND `requirements[]` together (merged by the Grading-tab refactor). Students see the walkthrough and the auto-grader targets side-by-side — don't author hints assuming requirements are hidden, they aren't.
- **`Code Editor & q5play Preview` dropdown** (the `<details>` block) contains the editor, the live preview iframe, AND Run / Reset buttons. Reset restores the starter — warn students about that in any step that asks them to iterate experimentally.

Because of the drawer, **hints should always assume the docs are one click away**. See §2.

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
- **Do not set `passingScore === totalPoints`.** Allow one missed requirement.
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
