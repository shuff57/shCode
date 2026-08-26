# moSHion Challenge Lesson Conventions

A **challenge is a harder moSHion assignment** — same lesson-type shape as a lab (`lab-assignment-conventions.md`), but with a **permissive grader** (alternation / "any of these techniques passes") and `type === "challenge"` so the sidebar shows the ⭐ badge. Everything else — Steps scaffold in `script.js`, docs-pointer hints, UI behavior, title rule — comes from `moshion-lesson-conventions.md`. When a module spec lists a "challenges" entry or a `lessons/<slug>/` has `lesson.json.type === "challenge"`, these rules are binding.

**Applies to:**
- `lessons/<slug>/lesson.json` where `type === "challenge"` (and typically `preview === "moSHion"`).

**Canonical example:** `lessons/2-1-11-challenges/` (2.1.12 Challenges — Optional Stretch).

Read `moshion-lesson-conventions.md` and `lab-assignment-conventions.md` first — this doc only covers the three things that make a challenge different from a lab.

---

## 1. Required `lesson.json` shape

Same shape as a lab assignment; only the fields in the table below differ. Use `lessons/2-1-11-challenges/lesson.json` as the concrete template:

```json
{
  "id": "2-1-11-challenges",
  "title": "2.1.12 Challenges — Optional Stretch",
  "description": "Pick one or more of the stretch challenges and implement them in the editor. Auto-graded.",
  "type": "challenge",
  "estimateMins": 30,
  "category": "Unit 2: moSHion — Applied Game Development",
  "unit": "2.1 Foundations",
  "preview": "moSHion",
  "week": 10,
  "slos": ["SLO-3"],
  "steps": [
    { "id": "s1", "title": "Create a canvas", "instructions": "Inside setup(), create a canvas of any size.", "hints": ["Open the moSHion docs drawer on the right and find the Canvas section."] },
    { "id": "s2", "title": "Create at least one sprite", "instructions": "In setup(), create a sprite …", "hints": ["Check the Sprite section of the moSHion docs drawer for constructor arguments."] },
    { "id": "s3", "title": "Clear the background each frame", "instructions": "Call background() …", "hints": ["Search the moSHion docs drawer for background()."] },
    { "id": "s4", "title": "Use one advanced feature", "instructions": "Pick a challenge from content.md …", "hints": ["content.md lists six challenges with hints for each …"] }
  ],
  "requirements": [
    { "id": "r1", "title": "Create a canvas", "type": "regex", "file": "script.js", "pattern": "new\\s+Canvas\\s*\\(", "points": 0 },
    { "id": "r2", "title": "Create at least one sprite", "type": "regex", "file": "script.js", "pattern": "new\\s+Sprite\\s*\\(", "points": 0 },
    { "id": "r3", "title": "Clear the background each frame", "type": "inFunction", "function": "draw", "file": "script.js", "pattern": "background\\s*\\(", "points": 0 },
    {
      "id": "r4",
      "title": "Use at least one advanced feature",
      "description": "Your sketch uses a technique beyond canvas + sprite + background.",
      "type": "inFunction",
      "function": ["draw", "update"],
      "file": "script.js",
      "pattern": "kb\\.presses\\s*\\(|\\bsin\\s*\\(|\\bcos\\s*\\(|mouse\\.(x|y|pressed|pressing)|\\blerp\\s*\\(|frameCount\\s*%|\\btext\\s*\\(",
      "points": 0
    }
  ],
  "grading": { "totalPoints": 0, "passingScore": 0, "allowLateSubmit": true }
}
```

### Fields that differ from a lab

| Field | Practice (`type: "lesson"`) | Lab (`type: "assignment"`) | Challenge (`type: "challenge"`) |
|---|---|---|---|
| `type` | `"lesson"` | `"assignment"` | `"challenge"` — toggles the ⭐ Challenge badge |
| `estimateMins` | 20–30 | 30–60 | ~30 |
| `requirements` | strict per-feature regex | strict per-feature regex | alternation — see §2 |
| `requirements[].points` / `grading.totalPoints` / `grading.passingScore` | all `0` (all-green gate) | all `0` (all-green gate) | all `0` (all-green gate) |
| `script.js` | scaffold (description-only `// STEP N:`) | scaffold (description-only `// STEP N:`) | **fully empty** — see §4 |

`type` is what encodes the lesson/lab/challenge progression: same content surface, less scaffolding at each rung. A practice lesson scaffolds the work and tests one concept; a lab scaffolds and tests synthesis; a challenge removes the scaffold entirely.

Everything else — §1/§3/§4 of `moshion-lesson-conventions.md` apply (no `/// <reference>`, header comment format, function order — same shape as a lesson scaffold *minus* the scaffold itself for challenges).

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
  "points": 0
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

## 4. Starter `script.js` — **empty**

Challenges start the student from a **completely empty editor**. No header comment, no `let` declarations, no `setup()` / `draw()` skeletons, no `// STEP N:` breadcrumbs. The file exists (so the lesson loads) but its contents are blank.

```js
```

This is a deliberate divergence from `moshion-lesson-conventions.md` §3/§4 which mandates a Steps scaffold with breadcrumbs. Challenges are harder — the student has to invoke the docs drawer + the `content.md` challenge menu to figure out the shape of the program, not follow a predetermined walkthrough. The lenient grader (§2) gives them room to pick their own path.

If a student needs the scaffold to start, they can click **Reset** (which re-loads this empty starter, unhelpful) or — more usefully — reference the Hello Sprite starter pattern from a prior lesson.

**The old alternatives — Steps scaffold and "BUILD THIS:" block comment — are retired.** One shape only: empty.

---

## 5. Don'ts

- **Do not make every requirement strict.** At least one requirement must be the permissive alternation; that's what makes it a challenge vs a lab. If all requirements demand a specific pattern, it's a lab — convert it (see `lab-assignment-conventions.md`).
- **Do not assign non-zero `points` / `totalPoints` / `passingScore`.** All must be `0` per the no-points rule. The permissive r4 alternation is what allows partial completion: a student can pass r4 with any one of the alternation branches (one advanced feature is enough). The Submit gate is then all-green across all four requirements (canvas, sprite, background, one advanced feature).
- **Do not ship working solutions in `script.js`.** Steps scaffold only.
- **Do not add any starter code to `script.js`.** Empty editor is the point (see §4). This includes the `// <numbering> <title>` header comment that graded q5 lessons use — challenges skip it.
- **Do not give specific hints in `lesson.json.steps[].hints[]`.** Generic docs-pointer only (see `moshion-lesson-conventions.md` §2). Challenge menu in `content.md` may be more generous.

---

## 6. Title convention

> **`<unit-numbering>` = three dotted numbers `U.M.N`** (e.g. `2.1.12`). Titles MUST start with that prefix or the lesson vanishes from `/module/U.M` and the home page. See [README §Title numbering](README.md#title-numbering--the-hard-rule).

`"<unit-numbering> Challenges — <tagline>"`.

Example: `"2.1.12 Challenges — Optional Stretch"`.

---

## 7. UI behavior

Challenges use the **exact same workspace** as graded q5 lessons. See `moshion-lesson-conventions.md` §5 for the full layout: top criteria-progress header, editor + live preview with `Run / Reset / Commit / History / Submit` toolbar, collapsible Console, right-edge `TabbedRightDrawer` (Docs / Quest / File tabs, closed by default), bottom `LessonProgressFooter`. Write requirements and `content.md` with the narrow-end-readable constraint in mind — the drawer is drag-resizable up to 600px, and an open drawer narrows the editor.

---

## History

| When | What |
|------|------|
| Unit 2.1 buildout | Challenge pattern crystallized in `2-1-11-challenges`. |
| This doc | Hoisted out of per-module specs. |
| Canonical alignment | Reframed as "harder assignment variant". Retired the "BUILD THIS:" starter alternative — Steps scaffold only, matching labs. §1 JSON shape rewritten as a verbatim copy of `lessons/2-1-11-challenges/lesson.json` (which was itself cleaned up: hub header stripped from content.md, working WASD demo replaced with empty Steps scaffold, meta-guidance steps replaced with four canvas/sprite/bg/feature steps matching the requirements 1:1, hints rewritten as docs-drawer pointers). §7 cross-references `moshion-lesson-conventions.md` §5 for UI behavior instead of duplicating it. |
| Empty-editor starter | Dropped the Steps scaffold from challenge starters too. Challenge `script.js` is now **fully empty** — the student invokes the docs drawer + challenge menu to structure the program themselves. §4 rewritten to mandate an empty file; §5 Don'ts updated. |
| Workspace consolidation alignment | §7 trimmed to a thin pointer at the new `moshion-lesson-conventions.md` §5. Removed the stale recap of "auto-open docs drawer / left sidebar Grading tab / drag-resizable sidebars" — the workspace is now the single right-edge `TabbedRightDrawer` with Docs / Quest / File tabs (closed by default) plus the bottom `LessonProgressFooter`. |
| Difficulty tiers slot-type | Challenges `difficulty` field bumped from `"intermediate"` to `"advanced"` to encode the lesson/lab/challenge progression: practice = `"beginner"`, lab = `"intermediate"`, challenge = `"advanced"`. §1 JSON shape + the "fields that differ from a lab" comparison table updated to a three-column lesson/lab/challenge view. Sister conventions `moshion-lesson-conventions.md` and `lab-assignment-conventions.md` carry the matching rule. Audit pass on existing unit-2 challenges (2.1.12, 2.2.13, 2.3.12) bumped `"intermediate"` → `"advanced"`. |
| No-points + green-to-advance | All `points`, `totalPoints`, and `passingScore` values must be `0` per the new no-points rule. §1 JSON shape zeroed out (former 5/5/5/10 → 0/0/0/0; former 25/15 → 0/0). §1 "fields that differ from a lab" table replaced the standalone `passingScore` row with a combined "all-zero" row that applies to all three slot types. §2 example zeroed. §5 Don'ts replaced "Do not set `passingScore === totalPoints`" with "Do not assign non-zero points" — the permissive r4 alternation is what enables partial completion now (one branch passes r4; all-green Submit gate fires when the four core requirements are met). |
