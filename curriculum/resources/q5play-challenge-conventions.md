# q5play Challenge Lesson Conventions

A **challenge is a harder q5play assignment** — same lesson-type shape as a lab (`lab-assignment-conventions.md`), but with a **permissive grader** (alternation / "any of these techniques passes") and `type === "challenge"` so the sidebar shows the ⭐ badge. Everything else — Steps scaffold in `script.js`, docs-pointer hints, UI behavior, title rule — comes from `q5play-lesson-conventions.md`. When a module spec lists a "challenges" entry or a `lessons/<slug>/` has `lesson.json.type === "challenge"`, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `type === "challenge"` (and typically `preview === "q5play"`).

**Canonical example:** `lessons/2-1-11-challenges/` (2.1.12 Challenges — Optional Stretch).

Read `q5play-lesson-conventions.md` and `lab-assignment-conventions.md` first — this doc only covers the three things that make a challenge different from a lab.

---

## 1. Required `lesson.json` shape

Same shape as a lab assignment; only the fields in the table below differ. Use `lessons/2-1-11-challenges/lesson.json` as the concrete template:

```json
{
  "id": "2-1-11-challenges",
  "title": "2.1.12 Challenges — Optional Stretch",
  "description": "Pick one or more of the stretch challenges and implement them in the editor. Auto-graded.",
  "type": "challenge",
  "difficulty": "intermediate",
  "estimateMins": 30,
  "category": "Unit 2: q5play — Applied Game Development",
  "unit": "2.1 Foundations",
  "preview": "q5play",
  "week": 10,
  "slos": ["SLO-3"],
  "steps": [
    { "id": "s1", "title": "Create a canvas", "instructions": "Inside setup(), create a canvas of any size.", "hints": ["Open the q5play docs drawer on the right and find the Canvas section."] },
    { "id": "s2", "title": "Create at least one sprite", "instructions": "In setup(), create a sprite …", "hints": ["Check the Sprite section of the q5play docs drawer for constructor arguments."] },
    { "id": "s3", "title": "Clear the background each frame", "instructions": "Call background() …", "hints": ["Search the q5play docs drawer for background()."] },
    { "id": "s4", "title": "Use one advanced feature", "instructions": "Pick a challenge from content.md …", "hints": ["content.md lists six challenges with hints for each …"] }
  ],
  "requirements": [
    { "id": "r1", "title": "Create a canvas", "type": "regex", "file": "script.js", "pattern": "new\\s+Canvas\\s*\\(", "points": 5 },
    { "id": "r2", "title": "Create at least one sprite", "type": "regex", "file": "script.js", "pattern": "new\\s+Sprite\\s*\\(", "points": 5 },
    { "id": "r3", "title": "Clear the background each frame", "type": "inFunction", "function": "draw", "file": "script.js", "pattern": "background\\s*\\(", "points": 5 },
    {
      "id": "r4",
      "title": "Use at least one advanced feature",
      "description": "Your sketch uses a technique beyond canvas + sprite + background.",
      "type": "inFunction",
      "function": ["draw", "update"],
      "file": "script.js",
      "pattern": "kb\\.presses\\s*\\(|\\bsin\\s*\\(|\\bcos\\s*\\(|mouse\\.(x|y|pressed|pressing)|\\blerp\\s*\\(|frameCount\\s*%|\\btext\\s*\\(",
      "points": 10
    }
  ],
  "grading": { "totalPoints": 25, "passingScore": 15, "allowLateSubmit": true }
}
```

### Fields that differ from a lab

| Field | Lab | Challenge |
|---|---|---|
| `type` | `"assignment"` | `"challenge"` — toggles the ⭐ Challenge badge |
| `difficulty` | `"beginner"` | `"intermediate"` (stretch work) |
| `estimateMins` | 30–60 | ~30 |
| `requirements` | strict per-feature regex | alternation — see §2 |
| `grading.passingScore` | ~66% of `totalPoints` | **~60%** (one feature should pass) |

Everything else — `type: "lesson"` rules don't apply (this is `"challenge"`), but §1/§3/§4 of `q5play-lesson-conventions.md` do: Steps scaffold, no `/// <reference>`, header comment format, function order.

---

## 2. Permissive requirement pattern — the one thing that makes a challenge a challenge

The "pick one of these advanced features" requirement uses a **regex alternation** plus `inFunction` with an array of function names. Any single matching technique passes:

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

The other requirements (canvas, sprite, background) stay strict — the permissive one is typically just the **last** requirement where the student's chosen-variant creativity is tested. If every requirement is alternation-based, this is probably a lab with a weak grader, not a challenge.

---

## 3. `content.md` shape — the challenge menu

Every challenge lesson has a `content.md` listing the stretch options. Structure:

1. No hub-style lead header. No sibling-resources line. (Matches `reading-conventions.md` §3 rules.)
2. Numbered `## Challenge N — <Title> (<difficulty>)` headings, six or so per lesson.
3. Under each:
   - 2–4 sentences describing the challenge.
   - A `**Hints:**` bulleted list — 2–3 items. Hints here **can** be more generous than the lesson.json hints (small code snippets are OK since the student is picking which challenge to attempt).
   - Optional `**Stretch it further:**` line with a harder variation.
4. Optional closer: "If you finish all six" suggestions for pairing / deeper exploration.

See `lessons/2-1-11-challenges/content.md` for the live template.

---

## 4. Starter `script.js` — Steps scaffold only

Use the same Steps scaffold pattern as a lab. **The old "BUILD THIS: block comment" alternative has been retired** — one shape only, for consistency with labs and graded lessons.

```js
// 2.1.12 Challenges — pick one (or more) from content.md and build it here.

let player;

function setup() {
  // STEP 1: Create a canvas

  // STEP 2: Create at least one sprite
}

function draw() {
  // STEP 3: Clear the background each frame

  // STEP 4: Add one advanced feature — see the challenge menu (content.md)
  //         for the list of qualifying techniques.
}
```

Empty `setup()` / `draw()` bodies. STEP comments map 1:1 to `requirements[].id` as with labs. No pre-written movement, no example snippets — the challenge menu is in `content.md`.

---

## 5. Don'ts

- **Do not make every requirement strict.** At least one requirement must be the permissive alternation; that's what makes it a challenge vs a lab. If all requirements demand a specific pattern, it's a lab — convert it (see `lab-assignment-conventions.md`).
- **Do not set `passingScore === totalPoints`.** Challenges accept partial completion — one advanced feature passes.
- **Do not ship working solutions in `script.js`.** Steps scaffold only.
- **Do not use the legacy "BUILD THIS:" block-comment shape.** Retired — one scaffold shape only.
- **Do not give specific hints in `lesson.json.steps[].hints[]`.** Generic docs-pointer only (see `q5play-lesson-conventions.md` §2). Challenge menu in `content.md` may be more generous.

---

## 6. Title convention

> **`<unit-numbering>` = three dotted numbers `U.M.N`** (e.g. `2.1.12`). Titles MUST start with that prefix or the lesson vanishes from `/module/U.M` and the home page. See [README §Title numbering](README.md#title-numbering--the-hard-rule).

`"<unit-numbering> Challenges — <tagline>"`.

Example: `"2.1.12 Challenges — Optional Stretch"`.

---

## 7. UI behavior

See `q5play-lesson-conventions.md` §5. Challenges use the same workspace as graded q5 lessons: right-side docs drawer (auto-open, per-device persistence), left sidebar's Grading tab with vertically-stacked requirement cards (4px border = status), editor + live preview (always visible), collapsible Console, drag-resizable sidebars. Write requirements and content.md with the narrow-end-readable constraint in mind.

---

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Challenge pattern crystallized in `2-1-11-challenges`. |
| This doc | Hoisted out of per-module specs. |
| Canonical alignment | Reframed as "harder assignment variant". Retired the "BUILD THIS:" starter alternative — Steps scaffold only, matching labs. §1 JSON shape rewritten as a verbatim copy of `lessons/2-1-11-challenges/lesson.json` (which was itself cleaned up: hub header stripped from content.md, working WASD demo replaced with empty Steps scaffold, meta-guidance steps replaced with four canvas/sprite/bg/feature steps matching the requirements 1:1, hints rewritten as docs-drawer pointers). §7 cross-references `q5play-lesson-conventions.md` §5 for UI behavior instead of duplicating it. |
