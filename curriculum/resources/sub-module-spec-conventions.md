# Sub-Module Spec Conventions

Canonical rules for the per-sub-module Markdown specs at `curriculum/modules/lessons/<U.M.Y>_<topic>.md`. A sub-module spec is the **teacher-facing planning doc for ONE pedagogical sub-module** (typically one week of class). Its job is to drive lesson authoring downstream — when the user says "build 2.3.1," the spec is what Claude reads + acts on. The artifact-type conventions in this directory cover *how* to author each lesson; this doc covers *what a sub-module spec must contain to make that authoring possible.*

**Applies to:** every file under `curriculum/modules/lessons/*.md` (e.g. `2.3.1_groups-overlaps.md`, `2.3.2_physics-applications.md`).

**Canonical reference:** `curriculum/modules/lessons/2.3.1_groups-overlaps.md` after the post-2.2 convention overhaul.

**Distinct from:** `curriculum/modules/<U.M>_*.md` — those are short *unit-level* index docs, not per-sub-module build specs. Unit-level docs are out of scope here.

---

## 1. YAML frontmatter — required shape

```yaml
---
id: "<U.M.Y>"               # e.g. "2.3.1" — three-part dotted id matching the filename
title: <Sub-Module Title>   # e.g. "Groups and Overlaps"
unit: "<U.M> <Unit Name>"   # e.g. "2.3 Collections and Physics Applications"
quarter: <1-4>
week: <N>                   # the school week this sub-module occupies
contactHours: <hours>
sessions: <N>               # typically 2 for a 3.5-hour week
environment: q5play         # or "console", "html-css", etc.
slos:
  primary: [SLO-N]          # SLOs this sub-module owns. Omit if pure reinforcement.
  reinforce: [SLO-N, ...]   # SLOs this sub-module reinforces.
artifacts:
  - { id: A<W>.<N>, type: lab|written|challenge, slo: SLO-N, role: primary|support, points: <n> }
prerequisites:
  - "<plain-English prereq>"
externalSources:
  q5playDocsInApp: "/docs/q5play"   # only when relevant
status: draft|ready|shipped
---
```

`id` MUST match the filename's `<U.M.Y>` prefix. `title` MUST NOT include numbering (the file id encodes that).

## 2. Required sections, in order

1. **Header banner** — one or two block-quote lines stating the week, hours, environment, and SLO focus.
2. **Context** — 1–3 paragraphs of *why this sub-module exists* + a `**Do NOT:**` bulleted list of pedagogical anti-patterns (the things teachers regret when they ignore them).
3. **Learning Objectives** — numbered list ("Students will be able to: 1. … 2. …"). 4–7 items.
4. **Topics Covered** — bulleted list of concepts and APIs introduced (no rubric content here — that's §Assignments).
5. **Prerequisites** — bullet list of prior sub-modules + cross-unit prereqs (e.g. "Q1 W8 arrays comfortable").
6. **Environment Setup** — anything beyond "standard q5play setup" (projector tabs, handouts, supporting tools).
7. **Videos** — table per §3.1.
8. **Readings** — table per §3.2 + per-reading **Reading content guidance** subsection per §3.2.
9. **In-App Lessons (carry-overs)** — list of pre-existing `lessons/<slug>/` to migrate, per §3.4. Skip the section entirely if nothing is being carried over.
10. **Worked Examples (teacher-led)** — numbered `### Worked Example N — <topic> (<minutes>)` blocks with full code samples in fenced ```js blocks. These are the live-in-class demos *and* the spec for the matching `preview: "example"` lessons.
11. **Challenges (optional stretch)** — bulleted list of stretch ideas. Becomes the `<U-M-L>-challenges` lesson's `content.md`.
12. **Session Plan** — 2 (or however many) tables, one per class session. Columns: `Time | Activity | Notes`.
13. **Assignments** — for each `A<W>.<N>` artifact: type, points, est. time, due, task description, requirements, rubric. Lab assignments per `lab-assignment-conventions.md`; written per `written-assignment-conventions.md`.
14. **Vocabulary** — 5–10 row table `Term | Definition`. Doubles as the source rows for the closing glossary in matching reading lessons.
15. **Teacher Notes** — bullet list of pacing tips, common student bugs, retention rules (for SLO-evidence artifacts).
16. **Numbered Lesson List** — per §3.3. **This is the build target** — Claude reads this section when the user says "build 2.X.Y."
17. **Status** — one bullet matching the YAML `status` field.

## 3. Per-section specifics

### 3.1 Videos table

| Column | Required | Notes |
|---|---|---|
| `#` | yes | `V1`, `V2`, … — sequential |
| `Source` | yes | `Teacher` or `Community` |
| `Title` | yes | Bare title with a `(N min)` duration hint |
| `Description hook` | **yes** | One-line student-facing hook ending with *when to watch* (e.g. "Watch before attempting `2.3.5 Groups Sandbox`."). Becomes the `description` field of the matching video lesson per `video-conventions.md` §1. |
| `YouTube URL` | leave empty | Teacher curates per `video-conventions.md` §3 — never invent. |

### 3.2 Readings table + per-reading guidance

The table:

| Column | Required | Notes |
|---|---|---|
| `#` | yes | `R1`, `R2`, … |
| `Source` | yes | `Internal`, `FCC`, `Teacher`, etc. |
| `Section` | yes | URL or chapter pointer (e.g. `/docs/q5play` for the in-app docs) |
| `Title` | yes | The section title from the source |
| `Notes` | optional | One-liner if the source needs context |

Then a **Reading content guidance** subsection per reading. Each reading lesson under `reading-conventions.md` §3 must have per-topic `## <Topic>` subsections (each with a `js live` Try-it block) and a closing glossary table. The spec MUST tell the author exactly which topics to split into:

```markdown
### Reading content guidance

#### R1 — Groups (`2-3-3-reading-groups`)

- **Topic 1: Creating + iterating a Group** — read before `2.3.5 Groups Sandbox`.
  - **What you'll learn from it** (3–5 bullets summarizing the chunk).
  - **Try it:** demo idea — what the runnable js live block should show (e.g. "spawn 5 sprites into a Group, log group.length each frame").
- **Topic 2: Group defaults + auto-association** — read before `2.3.5 Groups Sandbox`.
  - **What you'll learn from it** …
  - **Try it:** demo idea …
- **Glossary rows from §Vocabulary:** `Group`, `Spawn`, `Despawn`, `Iterate backwards`.
```

If a reading is one-topic (rare), state that explicitly with a one-line "single-topic" justification.

### 3.3 Numbered Lesson List — the build target

Replaces the legacy "Build Outputs" section. Lists every in-app lesson the sub-module produces, in the order they appear on `/module/U.M`. The first lesson in the unit is always `<U>-<M>-1-slides` (per `slide-deck-conventions.md` §5); subsequent lessons start at `.2`.

**Required table shape:**

| Slot | Type | Title | Slug | Source / artifact | Notes |
|---|---|---|---|---|---|
| `<U.M.1>` | slides | `<U.M.1> Slides — <Unit Name>` | `<U-M-1-slides>` | Unit deck `slides/<U.M>/slides.md` | Shared with all sub-modules in the unit |
| `<U.M.2>` | video | `<U.M.2> Video — <V1 title>` | `<U-M-2-video-…>` | V1 (above) | |
| `<U.M.3>` | reading | `<U.M.3> Reading — <R1 title>` | `<U-M-3-reading-…>` | R1 (above) | |
| `<U.M.4>` | example | `<U.M.4> Worked Example — <WE1 topic>` | `<U-M-4-example-…>` | WE1 (above) | |
| `<U.M.5>` | q5play (lesson) | `<U.M.5> <Lab Name>` | `<U-M-5-…>` | carry-over: `q5play-groups` | Migration: title, week, unit, draw()-only |
| … | … | … | … | … | … |
| `<U.M.N>` | q5play (challenge) | `<U.M.N> Challenges — Optional Stretch` | `<U-M-N>-challenges` | Challenges section (above) | |

A unit that spans multiple sub-modules numbers lessons **flat across the whole unit**, not per sub-module — so 2.3.1 (W13) might fill slots 2.3.1–2.3.12 and 2.3.2 (W14) continues at 2.3.13–2.3.21. The first sub-module owns the `<U.M.1>` slides slot; subsequent sub-modules in the same unit do **not** get their own slides row — they inherit the unit-level deck.

**Starter-file shape per type** — the spec's slot table assigns a `type`, and that determines whether `script.js` ships with content:

| Slot type | `script.js` shape | Convention |
|---|---|---|
| `q5play (lesson)` (`type: "lesson"`) | scaffold: header + lets + `setup()` / `draw()` skeletons + `// STEP N:` comments **describing each task in plain English**, empty function bodies | `q5play-lesson-conventions.md` §3 |
| `q5play (assignment)` (`type: "assignment"`) | scaffold: same shape as `lesson` — header + lets + skeletons + `// STEP N:` description-only comments. **No commented-out solution code.** | `lab-assignment-conventions.md` §2 + §3 |
| `q5play (challenge)` (`type: "challenge"`) | **fully empty** — zero bytes (or single trailing newline). Challenges deliberately remove the scaffold so the student structures the program themselves. | `q5play-challenge-conventions.md` §4 |
| `example` (`preview: "example"`) | fully working sketch (read-along) OR omitted entirely if `content.md` carries everything | `example-conventions.md` §4 |
| `slides`, `video`, `reading` | no `script.js` at all | per-type convention |

The split between scaffolded (lesson + assignment, with description-only STEP comments) and fully empty (challenge) is the structural difference. The split inside the scaffolded camp is the **commented-out-code rule**: comments may describe what to do, but never paste the line of code that does it. Authors get this wrong by carrying commented-out solutions into the scaffold "for clarity"; the result is an answer key, not a starter.

### 3.4 Carry-over migration notes

Pre-existing `lessons/<old-slug>/` directories that pre-date the post-2.2 conventions need migration. The spec's **In-App Lessons** section MUST list each one with:

- **Old slug** — current folder name.
- **New slug** — `<U-M-L>-<descriptor>` per the slug rule (§4).
- **Title** — new `<U.M.L> <Lesson Name>`.
- **Convention violations to fix** — bulleted list of what the existing `lesson.json` / `script.js` violates today (arrow keys vs WASD, `update()` separate from `draw()`, "BUILD THIS:" challenge starter, `passingScore < totalPoints`, stale unit/category, stale week, etc.).

Example:

```markdown
### `lessons/q5play-groups/` → `lessons/2-3-5-groups-sandbox/`

- **New title:** `2.3.5 Groups Sandbox`
- **Convention violations to fix:**
  - Title prefix `5.3.1 …` → `2.3.5 …`
  - `unit: "5.3 Groups & Overlaps"` → `"2.3 Collections and Physics Applications"`
  - `category: "Unit 5: q5play — Game Physics"` → `"Unit 2: q5play — Applied Game Development"`
  - `week: 15` → `13`
  - `script.js` uses `update()` separate from `draw()` — consolidate to `draw()` only (per §Do NOT in this spec).
  - `passingScore: 20` → set to `totalPoints` per `q5play-lesson-conventions.md` §1 (Submit is all-green-gated).
- **Data continuity:** renaming the folder changes `lesson.json.id`, which breaks any existing student commits/progress under the old id. Acceptable in pre-launch state; flag if students are already enrolled.
```

## 4. Slug naming convention

Every `lessons/<slug>/` folder name (which is also `lesson.json.id`) MUST follow:

```
<U>-<M>-<L>-<descriptor>
```

- `<U>` = unit number (e.g. `2`)
- `<M>` = module number within the unit (e.g. `3`)
- `<L>` = sequential lesson position within the unit-module (e.g. `5`)
- `<descriptor>` = kebab-case content hint (e.g. `groups-sandbox`, `reading-classes`, `a13-1-asteroid-field`)

**Why this format:** the `<U>-<M>-<L>` triple is what the database, the `parseNumberedIdFromTitle` helper, and the teacher reading the slug all use to locate the lesson within the curriculum. The descriptor exists for human readability.

**Examples:**

| Slug | Title | Type |
|---|---|---|
| `2-3-1-slides` | `2.3.1 Slides — Collections and Physics Applications` | slides |
| `2-3-3-reading-groups` | `2.3.3 Reading — q5play docs: Groups` | reading |
| `2-3-5-groups-sandbox` | `2.3.5 Groups Sandbox` | q5play (lesson) |
| `2-3-11-a13-1-asteroid-field` | `2.3.11 A13.1 Asteroid Field` | q5play (assignment) |
| `2-3-12-challenges` | `2.3.12 Challenges — Optional Stretch` | q5play (challenge) |

**For a graded artifact (`A<W>.<N>`)** include the artifact id in the descriptor (e.g. `a13-1-asteroid-field`, `a14-1-space-jumper`) so the slug self-documents its grading-system identity.

**Slug rename ⇒ data loss.** Renaming the folder changes `lesson.json.id`, which breaks the foreign-key that `commits` / `lesson_state` / `lesson_drafts` / `lesson_submissions` tables hold against the old id. The §3.4 migration notes MUST flag this when the lesson has shipped.

## 5. Don'ts

- **Do not put per-lesson rendering details in the spec.** That's what the per-type conventions in this directory are for. The spec lists the lesson and links to the type convention; it doesn't restate the JSON shape.
- **Do not include a "Build Outputs (what Builder AI generates)" section.** That was the pre-2.2 build pattern (produce one assignment markdown + one video manifest). The post-2.2 build is **the Numbered Lesson List in §3.3** — every in-app lesson, not a single artifact-list.
- **Do not invent video URLs in the Videos table.** Same rule as `video-conventions.md` §3 — teacher curates `videoUrl`; the spec's `YouTube URL` cell stays empty.
- **Do not duplicate the unit-level (`<U.M>_*.md`) overview.** The unit-level file is for SLO mapping + inter-module bridges; the sub-module spec is for the build.
- **Do not embed solutions to graded labs.** Worked examples ship runnable code; lab/challenge requirements stay declarative ("must include `kb.presses` somewhere in `draw()`").
- **Do not skip the Numbered Lesson List.** A spec without §3.3 isn't buildable — lesson authors have to invent the slot mapping themselves and drift across sub-modules.

## 6. Authoring workflow

When creating a new sub-module spec:

1. Copy `2.3.1_groups-overlaps.md` as the template.
2. Fill the YAML frontmatter (id, title, unit, week, slos, artifacts).
3. Author §1–§15 (everything except the Numbered Lesson List + Status).
4. Once the artifacts list is settled, populate §16 (Numbered Lesson List) — mapping each video / reading / worked example / lab / challenge to a `<U.M.L>` slot.
5. Set status to `draft`. Bump to `ready` when the spec passes a self-review (a stranger could author all the lessons from this spec without asking questions).
6. After the lessons are built and shipped: bump to `shipped`. Optionally trim the spec down to a retrospective record.

When updating an existing spec for a build pass: §3.3 (Numbered Lesson List) is the most likely thing to be missing or stale. Fix that first.

## 7. History

| When | What |
|------|------|
| Pre-2.2 | Each sub-module spec ended with a "Build Outputs (what Builder AI generates)" section listing 3-5 markdown deliverables (assignment doc + video manifest + lesson metadata updates). The actual 2.2 build produced 12 numbered in-app lessons; the spec section never matched what shipped. |
| Post-2.2 / unit-2.3 prep | Spec convention codified (this doc). Required: §3.3 Numbered Lesson List replacing the legacy Build Outputs section, §3.2 Reading content guidance per reading, §3.1 Description-hook column on videos, §3.4 Carry-over migration notes per pre-existing slug. Slug naming rule §4 made explicit (`<U>-<M>-<L>-<descriptor>`) and tied to the DB / `parseNumberedIdFromTitle` constraints. |
