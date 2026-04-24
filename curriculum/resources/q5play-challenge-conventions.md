# q5play Challenge Lesson Conventions

Canonical rules for in-app **optional-stretch challenge** lessons. A challenge is a shorter, less-prescribed q5play task that accepts any of several solutions and is auto-graded by a lenient regex pattern (OR-alternation, not strict sequence). When a module spec lists a "challenges" entry or a `lessons/<slug>/` has `lesson.json.type === "challenge"`, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `type === "challenge"` (and typically `preview === "q5play"`).

**Canonical example:** `lessons/2-1-11-challenges/`.

Challenges **also** follow `q5play-starter-conventions.md` — the starter `script.js` is not a solution. §3 below records the one relaxation (the "BUILD THIS:" block comment is acceptable in place of `// STEP N:` breadcrumbs).

---

## 1. Required `lesson.json` shape

```json
{
  "id": "<slug>",
  "title": "<numbering> Challenges — <tagline>",
  "description": "<one line>. Auto-graded.",
  "type": "challenge",
  "difficulty": "intermediate",
  "estimateMins": 30,
  "category": "<unit category>",
  "unit": "<unit label>",
  "preview": "q5play",
  "week": <n>,
  "slos": ["SLO-<n>"],
  "steps": [ ... ],
  "requirements": [ ... ],
  "grading": { "totalPoints": <n>, "passingScore": <n>, "allowLateSubmit": true }
}
```

### Field-by-field

- `type` — **must be `"challenge"`**. This is what toggles the ⭐ Challenge badge in the sidebar (`lib/lesson-badges.tsx`).
- `difficulty` — typically `"intermediate"`. Challenges are stretch work.
- `steps` — three steps is the sweet spot: "pick a challenge", "build it in the editor", "use at least one advanced feature". See canonical example.
- `requirements` — **permissive**. Use alternation (`a|b|c`) and `inFunction` with an array of function names. The grader should accept any one of several valid approaches.
- `grading.passingScore` — set to `~60%` of `totalPoints`. A student who completes ONE challenge variant should pass.

### Permissive requirement pattern

The canonical "pick one of these advanced features" requirement:

```json
{
  "id": "r4",
  "title": "Use at least one advanced feature",
  "type": "inFunction",
  "function": ["draw", "update"],
  "file": "script.js",
  "pattern": "kb\\.presses\\s*\\(|\\bsin\\s*\\(|\\bcos\\s*\\(|mouse\\.(x|y|pressed|pressing)|\\blerp\\s*\\(|frameCount\\s*%|\\btext\\s*\\(",
  "flags": "",
  "points": 10
}
```

The alternation is the point — **any one** of the listed techniques passes.

## 2. File layout

```
lessons/<slug>/
├── lesson.json
├── content.md       # the full challenge menu (⭐ list with hints per option)
└── script.js        # scaffold — see §3
```

## 3. Starter `script.js` — two acceptable shapes

### (A) Steps scaffold (same as graded q5play starters)

```js
// 2.1.12 Challenges — pick one or more from content.md.

let player;

function setup() {
  // STEP 1: Create a canvas
  // STEP 2: Create a sprite
}

function draw() {
  // STEP 3: Clear the background
  // STEP 4: Add your chosen advanced feature
}
```

### (B) "BUILD THIS:" block-comment spec

```js
// 2.1.12 Challenges — see content.md for the full menu.

/*
BUILD THIS:
- Canvas
- At least one sprite
- background() in draw()
- Pick ONE advanced feature:
    kb.presses / sin/cos / mouse.x|y / lerp / frameCount % / text
*/

function setup() {
}

function draw() {
}
```

Either is acceptable. Per `q5play-starter-conventions.md` §1 exception: "Challenge shells … that ship with a `BUILD THIS:` block-comment spec followed by empty bodies are also acceptable; the spec comment is itself the scaffold."

## 4. `content.md` shape

The content page is the **menu**. Structure:

- One-paragraph intro: "Pick one or more. You only need to complete one to pass the grader."
- Numbered or ⭐-bulleted challenge list, each with:
  - Difficulty tag (easy / medium / hard).
  - 2–4 sentence description.
  - 1–2 hint lines.
- Closer: "The auto-grader checks for ANY of these techniques — pick whichever suits your challenge."

## 5. Don'ts

- **Do not make requirements strict.** If the regex demands one specific technique, it's a lab, not a challenge — convert it (see `lab-assignment-conventions.md`).
- **Do not set `passingScore === totalPoints`.** Challenges accept partial completion.
- **Do not ship working solutions in `script.js`.** Scaffold rules still apply.

## 6. Title convention

`"<unit-numbering> Challenges — <tagline>"`.

Example: `"2.1.12 Challenges — Optional Stretch"`.

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Challenge pattern crystallized in `2-1-11-challenges`. |
| This doc | Hoisted out of per-module specs. |
