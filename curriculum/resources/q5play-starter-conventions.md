# q5play Starter Conventions

Canonical rules for every q5play starter file authored under `lessons/` and `assignments/` in this repo. When a Unit 2.x module spec references "starter", "scaffold", or "in-app lesson `script.js`", these rules are binding. The spec files themselves stay short; this document is the source of truth.

**Applies to:**
- `lessons/<slug>/script.js` where `lesson.json.preview === "q5play"`
- `assignments/*_starter.js` bundled with q5play lab assignments (A10.x, A11.x, A12.x, …)

**Template source:** these conventions were crystallized while authoring Module 2.1.1 / 2.1.2. Any new q5play module spec inherits them.

---

## 1. Starters are scaffolds, not solutions

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

## 2. No `/// <reference path=...>` in lesson `script.js`

Do not include a triple-slash TypeScript reference directive at the top of any `lessons/<slug>/script.js`:

```js
// ❌ do not include:
/// <reference path="/q5play/docs/q5play.d.ts" />
```

The in-app editor injects q5play type definitions into Monaco automatically. The reference directive is redundant clutter visible at the top of the student-facing editor pane.

**History:** stripped from all 18 q5play starters in commit `3cb9831`.

This rule is specific to in-app lesson files. Downloadable `assignments/*_starter.js` files opened in external editors may keep a reference directive if needed.

---

## 3. Header comment format

First line of the starter is a single-line comment matching `lesson.json.title`:

```js
// 2.1.5 Hello Sprite — your first q5play sketch.
```

Format: `// <unit-numbering> <title> — <one-line tagline>`.

Blank line, then top-level `let` declarations (declarations only — no initialization; the student initializes inside `setup()`).

---

## 4. Function order

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

## Auditing

```bash
# reference directive must not appear in any in-app lesson starter:
rg "reference path=.*q5play\\.d\\.ts" lessons/

# graded starters should have empty setup/draw bodies (visual spot-check):
# for each lessons/<slug>/ where lesson.json.grading.totalPoints > 0,
# confirm script.js has only // STEP comments inside the function bodies.
```

---

## History

| When | What |
|------|------|
| Commit `3cb9831` | Stripped `/// <reference path=...>` from all 18 q5play starters. |
| Module 2.1.1 / 2.1.2 authoring | Scaffold-not-solution convention crystallized. Canonical example = `lessons/q5play-intro/script.js`. |
| This doc | Hoisted out of per-module specs so all Unit 2.x builds share one source of truth. |
