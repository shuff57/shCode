# Lesson Numbering Convention

Source of truth for shCode lesson folder names. Mirrors the q5play (Unit 2) convention so Unit 3 onward inherits the same shape, the same sort behavior, and the same teacher mental model.

---

## 1. The pattern

```
M-X-N[a-z]?[-aWW-N][-slug]
```

| Token | Meaning | Example |
|---|---|---|
| `M` | Unit number (1 = JS basics, 2 = q5play, 3 = shPlay) | `2`, `3` |
| `X` | Module number within the unit | `1`, `2`, ..., `6` (q5play); `1`, ..., `8` (shPlay) |
| `N` | Lesson position within the module (raw integer; **NOT** zero-padded) | `1`, `9`, `10`, `25` |
| `a-z` | Optional alphabetic sub-position (sub-cluster within a numbered slot) | `3a`, `3b`, `3c` |
| `aWW-N` | Optional assignment code: A-class assignment, week WW, sub-N | `a12-1`, `a14-2` |
| `slug` | Human-readable name; should start with the lesson type token | `slides`, `video-frame-loop`, `reading-canvas`, `lab-one-sprite`, `example-keyboard`, `sandbox-axes`, `challenges` |

Tokens are joined by single `-` separators. The `M-X-N` triple is the canonical pedagogical address; the `aWW-N` token surfaces the gradebook assignment code; the slug is just for readability.

---

## 2. Examples (verbatim from Unit 2)

| Folder name | Reading |
|---|---|
| `2-1-1-slides` | Unit 2, Module 1, position 1 — module-intro slides |
| `2-1-1-video-intro` | Same numbered slot, a sibling video |
| `2-1-3-example-minimum-sprite` | Unit 2, Module 1, position 3 — worked example |
| `2-1-3a-reading-canvas` | Sub-cluster `a` of position 3 — first follow-up reading |
| `2-1-3b-reading-sprite` | Sub-cluster `b` of position 3 |
| `2-1-3c-lab-one-sprite` | Sub-cluster `c` of position 3 — graded lab |
| `2-1-9-a10-1-sprite-playground` | Position 9 — Assignment 10.1 ("a10-1"), slug `sprite-playground` |
| `2-2-7e-lab-method-calls-method` | Sub-cluster `e` of position 7 — graded lab |
| `2-2-11-a12-1-collectible` | Position 11 — Assignment 12.1, slug `collectible` |
| `2-2-12-a12-2-oop-writeup` | Position 12 — Assignment 12.2 (the AI-graded writeup) |
| `2-2-13-challenges` | Position 13 — module challenges |
| `2-3-21-a14-1-car-ramp` | Module 3 position 21, Assignment 14.1, slug `car-ramp` |

The same pattern applies to Unit 3.

---

## 3. Slug type prefixes

The slug **should** start with one of these type tokens to make filtering trivial:

| Type | Prefix | Folder contents |
|---|---|---|
| Module slides | `slides` (no body) | `lesson.json` only |
| Video | `video-<topic>` | `lesson.json` only (videoUrl in metadata) |
| Reading | `reading-<topic>` | `lesson.json` + `content.md` |
| Worked example (runnable) | `example-<topic>` | `lesson.json` + `script.js` (no STEPs, no requirements) |
| Sandbox (free-play, runnable) | `sandbox-<topic>` or `sandbox` | `lesson.json` + `script.js` |
| Graded lab (concept slice) | `lab-<topic>` | `lesson.json` + `script.js` (with `// STEP N:` breadcrumbs) + `solution.js` |
| Graded module assignment | `a<WW>-<N>-<slug>` (the `a<WW>-<N>` token replaces the slug-type prefix) | `lesson.json` + `script.js` + `solution.js` |
| Module challenges | `challenges` (no body) | `lesson.json` + `content.md` + `script.js` + `solution.js` |
| Build-up lab (drives toward module project) | `b<N>-lab-<topic>` (where `b<N>` replaces the position digit) | `lesson.json` + `script.js` + `solution.js` |

`b<N>-` (e.g., `3-1-b3-lab-moon-orbit`) is a **build-up sub-position** — labs that progressively assemble the module project before the named project lesson lands. They live AFTER the regular numbered slots but BEFORE the project's numbered slot.

---

## 4. Sort behavior

`fs.readdir` returns alphabetic order. Pure lexical sort would put `3-1-9a-...` AFTER `3-1-10a-...` (because '9' > '1'). However, the codebase already handles this correctly:

- `components/HeaderLessonNav.tsx:40` sorts with `localeCompare(b, undefined, { numeric: true })` — this is **natural numeric sort**, which puts `3-1-2` before `3-1-9` before `3-1-10`.
- The teacher gradebook (`app/teacher/page.tsx:339, 565`) uses `localeCompare(b)` (no `{ numeric: true }`) — this DOES fall back to lexical. **Sort breaks here at 9→10 transitions.** Either upgrade the call to `{ numeric: true }` or rely on the within-position alphabetic suffix to disambiguate.

**Decision (Unit 3):** mirror Unit 2's bare numbering. **Do not zero-pad.** If new lexical-sort sites appear in the gradebook or progress views, fix them by adding `{ numeric: true }` rather than re-encoding folder names.

The lesson `title` field (e.g., `"3.1.9a Sandbox — Transform Playground"`) is a separate signal that uses the `M.X.N` dotted form for human reading. The natural-numeric sort works on the title too because `localeCompare(..., { numeric: true })` handles both `-` and `.` separators.

---

## 5. Title format (independent of folder name)

Folder name and `lesson.json.title` are paired but distinct:

- Folder: `3-1-3c-lab-one-sprite`
- Title: `"3.1.3c Lab — Drop one sprite, change its color"`

Title rules:
- **Must** start with the dotted `M.X.N[a-z]?` prefix matching the folder.
- Followed by a single space, then a type word (`Lab`, `Reading`, `Example`, `Sandbox`, `Video`, `Project`, `Writeup`, `Challenges`), then an em-dash, then the topic.
- If the prefix doesn't match the folder's `M-X-N` triple, the lesson disappears from module pages.

---

## 6. Module size targets (Unit 3 onward)

**Soft target: ~20 lessons per module.** Acceptable range: 14–25. Anything >25 splits at the next concept boundary; anything <14 either absorbs an adjacent micro-cluster or is fine if the concept is small.

The target exists because (a) intro-course audiences benefit from "I finished a module today" momentum, (b) wave-by-wave authoring scales linearly with module size — ~20 is the largest comfortable batch, and (c) shorter modules let students show up after an absence and pick up at the next module boundary without having missed five concept clusters.

---

## 7. Unit 3 split rename map (13 modules — final)

`plans/unit-3-shplay.md` was drafted across three numbering layers (v1 = 6 modules, v2/v3 = 8 modules, this layer = 13 modules). The plan's lesson tables are still in **v1 numbering** (`3-1-` through `3-6-`); the rename pass below is the single source of truth.

When authoring Unit 3 lessons, use these final module numbers:

| Plan source (v1 module / row range) | Final module | Final prefix | Approx count |
|---|---|---|---|
| Pre-split 3.1 (rows: slides → frameCount labs `3-1-11b`) | **3.1 Coordinates & Transforms** + new Spinning Sculpture build-ups & project | `3-1-` | ~22 |
| Pre-split 3.1 (rows: Sphere/Plane reading `3-1-12` → `3-1-18-challenges`) | **3.2 Shapes & Composition** | `3-2-` (renumbered from `3-1-`) | ~25 |
| Pre-split 3.2 (rows: slides → procedural-vs-OOP example, ending before composition reading `3-2-11a`) | **3.3 OOP in 3D — Foundations** (single-shape classes, constructors, methods, instances) | `3-3-` (renumbered from `3-2-`) | ~21 |
| Pre-split 3.2 (rows: composition reading `3-2-11a` → challenges) | **3.4 OOP in 3D — Composition** (multi-shape classes, parenting, Robot project) | `3-4-` (renumbered from `3-2-`) | ~18 |
| Pre-split 3.3 (rows: slides → safe-despawn lab `3-3-12c`) | **3.5 Groups — Foundations** (Group, distance/intersects, despawn) | `3-5-` (renumbered from `3-3-`) | ~18 |
| Pre-split 3.3 (rows: collectible-pattern reading `3-3-13a` → wave-spawn example) | **3.6 Groups — Collector Game** (collectible pattern, Collector Game project) | `3-6-` (renumbered from `3-3-`) | ~18 |
| Pre-split 3.4 (rows: slides → camera-sandbox `3-4-12a`) | **3.7 Camera in 3D** (position, lookAt, follow, orbit, precedence) | `3-7-` (renumbered from `3-4-`) | ~16 |
| Pre-split 3.4 (rows: deltaTime reading `3-4-8a` → animation-patterns video — and yes, this overlaps; see split-point note below) | **3.8 Animation & Walkable Scene** (deltaTime, lerp, sin/cos paths, Walkable Scene project) | `3-8-` (renumbered from `3-4-`) | ~17 |
| Pre-split 3.5 (rows: slides → directional-light labs and the first sandbox) | **3.9 Lighting Foundations** (ambient + directional, what is light) | `3-9-` (renumbered from `3-5-`) | ~15 |
| Pre-split 3.5 (rows: point-light reading → multi-light composition + Light Studio build-ups + Light Studio project) | **3.10 Light Studio** (point, spot, color, intensity, composition, Light Studio project) | `3-10-` (renumbered from `3-5-`) | ~15 |
| Pre-split 3.5 (rows: materials readings → Mood Scene project + challenges) | **3.11 Materials & Atmosphere** | `3-11-` (renumbered from `3-5-`) | ~26 |
| Pre-split 3.6 (rows: slides → B3c integration build-up) | **3.12 3D Platformer — Mechanics** (physics, jump, WASD, integration) | `3-12-` (renumbered from `3-6-`) | ~15 |
| Pre-split 3.6 (rows: B4 coins → final sandbox) | **3.13 3D Platformer — Build & Ship** (Unit Final: coins, win, atmosphere, project, writeup, challenges) | `3-13-` (renumbered from `3-6-`) | ~14 |

**Total Unit 3 lesson count: ~240** (no lessons removed by the splits).

Within each final module, position numbers `N` re-sequence from 1 (no gaps from the split point). Sub-position letters and slug type prefixes are preserved verbatim. The build-up `bN` slot numbers also re-sequence within their final module; e.g., 3.12 might keep B1–B3 from pre-split 3.6, while 3.13 starts fresh with B1 corresponding to coins (was B4 pre-split).

**Split-point notes:**

- **Pre-split 3.4 has a small overlap risk** between rows around `3-4-8a-reading-deltatime` and `3-4-8b-reading-timebased-motion`. Camera depends on deltaTime conceptually but the deltaTime reading itself is a movement-related concept. **Decision:** put `3-4-8a-reading-deltatime` at the END of Module 3.7 (so camera can use deltaTime in its labs) and START Module 3.8 with `3-4-8b-reading-timebased-motion` and the time-based motion lab. This puts the conceptual divider at "now we use deltaTime to drive position" rather than at deltaTime as a primitive.
- **Pre-split 3.6 platformer split:** Module 3.12 ends with `3-6-b3c-lab-wasd-jump-integrated`. Module 3.13 starts with `3-6-b4-lab-coins`. Students who finish 3.12 have a working jumping/walking sphere with no game logic yet; 3.13 turns it into a platformer.

**Bulk rename order** (applied high-to-low to avoid prefix collisions):

1. Pre-split `3-6-*` lessons split: rows for slides through B3c → `3-12-*`; rows for B4 through final-sandbox → `3-13-*`. Re-sequence positions in both.
2. Pre-split `3-5-*` lessons split THREE ways: lighting-foundations (ambient + directional + sandbox) → `3-9-*`; light-studio (point/spot/color/intensity/multi/animated/build-ups/project/challenges) → `3-10-*`; materials (materials readings + Mood Scene project + challenges) → `3-11-*`. Re-sequence positions.
3. Pre-split `3-4-*` lessons split: camera rows → `3-7-*`; animation rows (`3-4-8b` onward) + Walkable Scene → `3-8-*`. Re-sequence.
4. Pre-split `3-3-*` lessons split: Groups foundations (rows through safe-despawn) → `3-5-*`; Collector Game (rows from collectible-pattern reading onward) → `3-6-*`. Re-sequence.
5. Pre-split `3-2-*` lessons split: OOP foundations (rows through procedural-vs-OOP example) → `3-3-*`; OOP composition (composition reading onward + Robot) → `3-4-*`. Re-sequence.
6. Pre-split `3-1-*` lessons split: transforms-content stays at `3-1-*`; shapes/Solar-System-content → `3-2-*`. Re-sequence.

After the bulk rename, every `lesson.json.title` field must be updated to match the new `M.X.N[a-z]?` prefix.

---

## 8. Worked examples of Unit 3 IDs (post-split, 13-module final)

| Folder | Title | Notes |
|---|---|---|
| `3-1-1-slides` | "3.1.1 Module Slides" | Module 3.1 (Coordinates & Transforms) |
| `3-1-2-bridge-q5-to-shplay` | "3.1.2 Reading — Bridge: q5play 2D to shPlay 3D" | Bridge reading |
| `3-1-b1-lab-rotate-y` | "3.1.B1 Build-Up — Rotate on Y" | Spinning Sculpture build-up |
| `3-1-12-spinning-sculpture` | "3.1.12 Project — Spinning Sculpture" | Module project |
| `3-1-13-3d-writeup` | "3.1.13 Writeup — 3D Foundations" | First-3D AI-graded writeup |
| `3-2-1-slides` | "3.2.1 Module Slides" | Module 3.2 (Shapes & Composition) |
| `3-2-b3-lab-moon-orbit` | "3.2.B3 Build-Up — Moon Orbits Earth" | Solar System build-up |
| `3-2-12-solar-system` | "3.2.12 Project — Solar System" | Module project |
| `3-3-7e-lab-method-calls-method` | "3.3.7e Lab — Method calling method" | Module 3.3 (OOP Foundations) |
| `3-4-b3-lab-robot-arms` | "3.4.B3 Build-Up — Robot Arms (parented)" | Module 3.4 (OOP Composition) Robot build-up |
| `3-4-9-custom-character` | "3.4.9 Project — Custom 3D Character" | Robot project |
| `3-5-7-example-timed-spawn` | "3.5.7 Example — Timed Spawn Loop" | Module 3.5 (Groups Foundations) |
| `3-6-b4-lab-detect-collect` | "3.6.B4 Build-Up — Detect and Despawn" | Module 3.6 (Collector Game) build-up |
| `3-6-9-collector-game` | "3.6.9 Project — Collector Game" | Mid-unit project (with mid-unit writeup `3-6-10-groups-writeup`) |
| `3-7-9c-lab-lerp-camera` | "3.7.9c Lab — Lerp the camera X" | Module 3.7 (Camera in 3D) |
| `3-8-b4-lab-windmill` | "3.8.B4 Build-Up — Animated Decoration" | Module 3.8 (Animation & Walkable Scene) |
| `3-8-12-walkable-scene` | "3.8.12 Project — Walkable Scene" | Module project |
| `3-9-1-slides` | "3.9.1 Module Slides" | Module 3.9 (Lighting Foundations) |
| `3-10-12-light-studio` | "3.10.12 Project — Light Studio" | Module 3.10 (Light Studio) project |
| `3-11-12-mood-scene` | "3.11.12 Project — Mood Scene" | Module 3.11 (Materials & Atmosphere) project |
| `3-12-b3c-lab-wasd-jump-integrated` | "3.12.B3c Build-Up — WASD + Jump Together" | Module 3.12 (Platformer Mechanics) — last build-up before split |
| `3-13-b1-lab-coins` | "3.13.B1 Build-Up — Collectible Coins" | Module 3.13 (Platformer Build & Ship) — first build-up after split (renumbered from `3-6-b4` pre-split) |
| `3-13-8-platformer` | "3.13.8 Project — 3D Platformer" | Unit Final project |
| `3-13-9-platformer-writeup` | "3.13.9 Writeup — 3D Platformer" | Unit Final AI-graded writeup |

---

## 9. When to bend the convention

- **Don't** zero-pad. The natural-numeric sort handles the 9→10 case.
- **Don't** invent new sub-position alphabets (e.g., `3-1-3-1`, `3-1-3-2`). Use letter suffixes (`a`, `b`, `c`).
- **Don't** include uppercase, spaces, or non-ASCII in folder names.
- **Do** keep the `aWW-N` assignment-code token only when the gradebook explicitly references that code in a class. For Unit 3, drop the token unless a teacher's gradebook is keying off it.
- **Do** keep the slug terse (max ~5 words). The title carries the readable description.
