# Sub-Module Spec Conventions

Canonical rules for the per-sub-module Markdown specs at `curriculum/modules/lessons/<U.M.Y>_<topic>.md`. A sub-module spec is the **teacher-facing planning doc for ONE pedagogical sub-module**. Its job is to drive lesson authoring downstream — when the user says "build 2.3.1," the spec is what Claude reads + acts on. The artifact-type conventions in this directory cover *how* to author each lesson; this doc covers *what a sub-module spec must contain to make that authoring possible.*

**Applies to:** every file under `curriculum/modules/lessons/*.md` (e.g. `2.3.1_groups-overlaps.md`, `2.3.2_physics-applications.md`).

**Canonical reference:** `curriculum/modules/lessons/2.3.1_groups-overlaps.md` after the post-2.2 convention overhaul.

**Distinct from:** `curriculum/modules/<U.M>_*.md` — those are short *unit-level* index docs, not per-sub-module build specs. Unit-level docs are out of scope here.

---

## 0. What a sub-module is

**One sub-module = one book section.** Not one week (operator, 2026-08-10). The book
section index carries straight through: book §3.7 becomes sub-module `1.3.7`. Two book
sections are never merged into one spec, and one book section never splits across two.

**Sub-modules are sized in DAYS of class, 1 to 3.** Three is the ceiling — that is a full
week. Most sub-modules are 1 or 2. Weeks are not a field on a spec at all; the calendar
groups sub-modules into weeks downstream, and that grouping can change without touching
any spec.

This replaces the older "a sub-module is typically one week" rule. Specs written under
that rule carry `week:`, `contactHours:` and `sessions:` — see §1.1 for how to migrate.

## 0.1 A sub-module id is NOT a lesson slot

Under the old scheme these were the same number: sub-module `2.3.1` began at lesson slot
`2.3.1`. Under one-section-per-sub-module they diverge, because the sub-module id now comes
from the **book section index** while lesson slots stay **flat across the unit**:

```
sub-module 1.1.1  (book §1.1)  →  lesson slots 1.1.1 – 1.1.19
sub-module 1.1.2  (book §1.2)  →  lesson slots 1.1.20 – ...
                  ▲                             ▲
        book section index              unit-flat lesson counter
        (fixed by the book)             (keeps counting up)
```

They coincide only for the first sub-module in a unit. Every spec records its own range in
`lessonSlots:` so the next author knows where to start.

**No parser change is required.** `parseNumberedIdFromTitle` reads only the leading
`<U>.<M>` to route a lesson to its module, and lesson titles still carry three dotted
numbers. The `localeCompare(..., { numeric: true })` sort still orders slots correctly.

Rejected alternative: four-part lesson numbering (`<U>.<M>.<Y>.<L>`). It reads better but
changes the title contract that 175 built Q2 lessons already satisfy, for no functional
gain.

## 1. YAML frontmatter — required shape

```yaml
---
id: "<U.M.Y>"               # e.g. "2.3.1" — three-part dotted id matching the filename
title: <Sub-Module Title>   # e.g. "Groups and Overlaps"
unit: "<U.M> <Unit Name>"   # e.g. "2.3 Collections and Physics Applications"
quarter: <1-4>
days: <1-3>                 # class days this sub-module takes. 3 is the ceiling.
bookSection: "<C.S>"        # the ONE book section this sub-module covers, e.g. "3.7"
lessonSlots: "<first>–<last>"  # the unit-flat lesson range this sub-module fills. See §0.1.
environment: shplay         # or "console", "html-css", etc.
slos:
  primary: [SLO-N]          # SLOs this sub-module owns. Omit if pure reinforcement.
  reinforce: [SLO-N, ...]   # SLOs this sub-module reinforces.
artifacts:
  - { id: A<W>.<N>, type: lab|written|challenge, slo: SLO-N, role: primary|support }
prerequisites:
  - "<plain-English prereq>"
externalSources:
  shplayDocsInApp: "/docs/shplay"   # only when relevant
status: draft|ready|shipped
---
```

`id` MUST match the filename's `<U.M.Y>` prefix. `title` MUST NOT include numbering (the file id encodes that). `bookSection` MUST name exactly one section — if a spec needs two, it is two specs.

### 1.1 Migrating a pre-2026-08-10 spec

Older specs carry `week:`, `contactHours:` and `sessions:`. Replace all three with `days:`
and add `bookSection:`. A day is roughly 1.75 contact hours, so the old `sessions: 2`
(3.5 hours) is `days: 2`. Do not keep the old fields alongside the new one — two
scheduling fields is how a spec starts disagreeing with the calendar.

## 2. Required sections, in order

1. **Header banner** — one or two block-quote lines stating the book section, day count, environment, and SLO focus. For intro-level units, include a third line stating the granularity bar ("each lesson ships exactly one new concept"). See §2a.
2. **Context** — 1–3 paragraphs of *why this sub-module exists* + a `**Do NOT:**` bulleted list of pedagogical anti-patterns (the things teachers regret when they ignore them). For intro-level units, the Context block must also state the audience explicitly and reference the granularity bar (§2a).
3. **Learning Objectives** — numbered list ("Students will be able to: 1. … 2. …"). 4–7 items for advanced units; 8–12 items typical for intro-level units (one objective per atomic concept the unit owns).
4. **Topics Covered** — bulleted list of concepts and APIs introduced (no rubric content here — that's §Assignments). For intro-level units, **each bullet is a single atomic concept and corresponds 1:1 to a Numbered Lesson List slot** (§3.3). Group bullets under bold sub-headers when helpful (e.g. *Vocabulary*, *Methods, by shape*) but do not merge two concepts into one bullet.
5. **Prerequisites** — bullet list of prior sub-modules + cross-unit prereqs (e.g. "Q1 W8 arrays comfortable").
6. **Environment Setup** — anything beyond "standard shplay setup" (projector tabs, handouts, supporting tools).
7. **Videos** — table per §3.1.
8. **Readings** — table per §3.2 + per-reading **Reading content guidance** subsection per §3.2.
9. **In-App Lessons (carry-overs)** — list of pre-existing `lessons/<slug>/` to migrate, per §3.4. Skip the section entirely if nothing is being carried over.
10. **Worked Examples (teacher-led)** — numbered `### Worked Example N — <topic> (<minutes>)` blocks with full code samples in fenced ```js blocks. These are the live-in-class demos *and* the spec for the matching `preview: "example"` lessons.
11. **Challenges (optional stretch)** — bulleted list of stretch ideas. Becomes the `<U-M-L>-challenges` lesson's `content.md`.
12. **Day Plan** — one table per class day, matching the `days:` count. Columns: `Time | Activity | Notes`.
13. **Assignments** — for each `A<W>.<N>` artifact: type, est. time, due, task description, requirements, pass criteria. Lab assignments per `lab-assignment-conventions.md`; written per `written-assignment-conventions.md`. Do not author rubrics in points language — q5 lessons / labs / challenges are mastery-based (all-green Submit gate; see `shplay-lesson-conventions.md` §1 + §5).
14. **Vocabulary** — 5–10 row table `Term | Definition`. Doubles as the source rows for the closing glossary in matching reading lessons.
15. **Teacher Notes** — bullet list of pacing tips, common student bugs, retention rules (for SLO-evidence artifacts).
16. **Numbered Lesson List** — per §3.3. **This is the build target** — Claude reads this section when the user says "build 2.X.Y."
17. **Lab and Reading Specs (per-lesson detail)** — required for intro-level units that use the §2a one-concept-per-lesson rule. One block per net-new lesson in the Numbered Lesson List, giving the single concept isolated, the starter shape (for shplay labs) or try-it shape (for readings), and the pass criterion. Lets each lesson be authored independently from this section without re-reading the rest of the spec. Optional for advanced units where each Numbered Lesson List row is self-explanatory.
18. **Status** — one bullet matching the YAML `status` field.

## 2a. Granularity bar (intro-level units)

For introductory-level units — units where most students are seeing a category of concept (OOP, recursion, async, etc.) for the first time — the spec MUST follow the **one new concept per lesson** rule.

**Definition.** A "new concept" is anything a student would have to be *told* (vocabulary), *shown* (a syntactic form, a runtime behavior), or *practiced in isolation* (e.g. "method that returns a value" is a different concept from "method with no params" because each requires its own first-encounter practice). If a lesson would introduce ≥2 such concepts, **split it**.

**How to apply when authoring a spec:**

1. List every atomic concept the sub-module owns. Do this *before* deciding lesson count.
2. Allocate one Numbered Lesson List slot per concept. Most slots will be 5–10 minute readings or 1-step shplay labs.
3. Vocabulary lessons come *before* any "write code from scratch" lesson on the same concept. Reading and try-it labs may pair (one concept can occupy a `reading` slot followed by a `lab` slot that practices it), but each slot still owns one concept.
4. Reserve at most one "integration" lesson per session — the lesson that composes prior atomic concepts (typically a `worked example` or a `shplay (assignment)`). The integration lesson is the *only* place compound demonstrations appear.
5. Pacing impact: an intro-level sub-module typically runs 8–15 lessons per class day. Treat the `days:` count as a function of concept count, not the other way around — count the concepts first, then say how many days they take.

**How to apply when reviewing a spec:**

- For each Numbered Lesson List row: ask "what is the single new concept this lesson teaches?" If the answer requires "and" or "plus", the row should be split.
- For each `reading` row: confirm the corresponding §17 Lab/Reading Spec block names *one* glossary term or syntactic form being introduced. Multi-concept readings get split into multiple rows even if they share a `content.md` source.

**Why.** Bundling concepts is the most common shCode authoring mistake on intro-level material — readings that try to cover class + instance + `new` + constructor + `this` + properties + methods in one go ("JavaScript classes — comprehensive intro") leave students with vocabulary they can't use because they never practiced it in isolation. The granularity bar is a hard rule for intro material, not a guideline.

**Where this rule does not apply.** Advanced units (assumed prior comfort with the concept category — e.g. a unit on "advanced React patterns" for students who already know React) may bundle. State the bundling explicitly in the spec's Context block when doing so.

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
| `Section` | yes | URL or chapter pointer (e.g. `/docs/shplay` for the in-app docs) |
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
| `<U.M.5>` | shplay (lesson) | `<U.M.5> <Lab Name>` | `<U-M-5-…>` | carry-over: `shplay-groups` | Migration: title, week, unit, draw()-only |
| … | … | … | … | … | … |
| `<U.M.N>` | shplay (challenge) | `<U.M.N> Challenges — Optional Stretch` | `<U-M-N>-challenges` | Challenges section (above) | |

A unit that spans multiple sub-modules numbers lessons **flat across the whole unit**, not per sub-module — so 2.3.1 (W13) might fill slots 2.3.1–2.3.12 and 2.3.2 (W14) continues at 2.3.13–2.3.21. The first sub-module owns the `<U.M.1>` slides slot; subsequent sub-modules in the same unit do **not** get their own slides row — they inherit the unit-level deck.

**Starter-file shape per type** — the spec's slot table assigns a `type`, and that determines whether `script.js` ships with content:

| Slot type | `script.js` shape | Convention |
|---|---|---|
| `shplay (lesson)` (`type: "lesson"`) | scaffold: header + lets + `setup()` / `draw()` skeletons + `// STEP N:` comments **describing each task in plain English**, empty function bodies | `shplay-lesson-conventions.md` §3 |
| `shplay (assignment)` (`type: "assignment"`) | scaffold: same shape as `lesson` — header + lets + skeletons + `// STEP N:` description-only comments. **No commented-out solution code.** | `lab-assignment-conventions.md` §2 + §3 |
| `shplay (challenge)` (`type: "challenge"`) | **fully empty** — zero bytes (or single trailing newline). Challenges deliberately remove the scaffold so the student structures the program themselves. | `shplay-challenge-conventions.md` §4 |
| `example` (`preview: "example"`) | fully working sketch (read-along) OR omitted entirely if `content.md` carries everything | `example-conventions.md` §4 |
| `slides`, `video`, `reading` | no `script.js` at all | per-type convention |

The split between scaffolded (lesson + assignment, with description-only STEP comments) and fully empty (challenge) is the structural difference. The split inside the scaffolded camp is the **commented-out-code rule**: comments may describe what to do, but never paste the line of code that does it. Authors get this wrong by carrying commented-out solutions into the scaffold "for clarity"; the result is an answer key, not a starter.

### 3.4 Carry-over migration notes

Pre-existing `lessons/<old-slug>/` directories that pre-date the post-2.2 conventions need migration. The spec's **In-App Lessons** section MUST list each one with:

- **Old slug** — current folder name.
- **New slug** — `<U-M-L>-<descriptor>` per the slug rule (§4).
- **Title** — new `<U.M.L> <Lesson Name>`.
- **Convention violations to fix** — bulleted list of what the existing `lesson.json` / `script.js` violates today (arrow keys vs WASD, `update()` separate from `draw()`, "BUILD THIS:" challenge starter, non-zero `points` / `totalPoints` / `passingScore`, stale unit/category, stale week, etc.).

Example:

```markdown
### `lessons/shplay-groups/` → `lessons/2-3-5-groups-sandbox/`

- **New title:** `2.3.5 Groups Sandbox`
- **Convention violations to fix:**
  - Title prefix `5.3.1 …` → `2.3.5 …`
  - `unit: "5.3 Groups & Overlaps"` → `"2.3 Collections and Physics Applications"`
  - `category: "Unit 5: shplay — Game Physics"` → `"Unit 2: shplay — Applied Game Development"`
  - `week: 15` → `13`
  - `script.js` uses `update()` separate from `draw()` — consolidate to `draw()` only (per §Do NOT in this spec).
  - `passingScore: 20` → set to `0` (along with `totalPoints` and every `requirements[].points`) per `shplay-lesson-conventions.md` §1 (no-points; Submit is all-green-gated).
- **Data continuity:** renaming the folder changes `lesson.json.id`, which breaks any existing student commits/progress under the old id. Acceptable in pre-launch state; flag if students are already enrolled.
```

## 4. Slug naming convention

Every `lessons/<slug>/` folder name (which is also `lesson.json.id`) MUST follow:

```
<U>-<M>-<L>[<letter>]-<descriptor>
```

- `<U>` = unit number (e.g. `2`)
- `<M>` = module number within the unit (e.g. `3`)
- `<L>` = sequential lesson position within the unit-module (e.g. `5`)
- `<letter>` = optional lowercase a–z, used **only** for retroactive granularity inserts (§4.1). Net-new units do not use letters.
- `<descriptor>` = kebab-case content hint (e.g. `groups-sandbox`, `reading-classes`, `a13-1-asteroid-field`)

**Why this format:** the `<U>-<M>-<L>` triple is what the database, the `parseNumberedIdFromTitle` helper, and the teacher reading the slug all use to locate the lesson within the curriculum. The descriptor exists for human readability. The optional `<letter>` is supported by the parser regex (`/^(\d+\.\d+\.\d+[a-zA-Z]?)/`) and by the `localeCompare(... { numeric: true })` sort, so `2.2.3 < 2.2.3a < 2.2.3b < 2.2.4` orders correctly without code changes.

**Examples:**

| Slug | Title | Type |
|---|---|---|
| `2-3-1-slides` | `2.3.1 Slides — Collections and Physics Applications` | slides |
| `2-3-3-reading-groups` | `2.3.3 Reading — shplay docs: Groups` | reading |
| `2-3-5-groups-sandbox` | `2.3.5 Groups Sandbox` | shplay (lesson) |
| `2-3-11-a13-1-asteroid-field` | `2.3.11 A13.1 Asteroid Field` | shplay (assignment) |
| `2-3-12-challenges` | `2.3.12 Challenges — Optional Stretch` | shplay (challenge) |
| `2-2-3a-reading-new-operator` | `2.2.3a Reading — The \`new\` operator` | reading (granularity insert under 2.2.3) |
| `2-2-7b-lab-method-no-params` | `2.2.7b Lab — Method with no params` | shplay (lesson) (granularity insert under 2.2.7) |

**For a graded artifact (`A<W>.<N>`)** include the artifact id in the descriptor (e.g. `a13-1-asteroid-field`, `a14-1-space-jumper`) so the slug self-documents its grading-system identity.

**Slug rename ⇒ data loss.** Renaming the folder changes `lesson.json.id`, which breaks the foreign-key that `commits` / `lesson_state` / `lesson_drafts` / `lesson_submissions` tables hold against the old id. The §3.4 migration notes MUST flag this when the lesson has shipped.

### 4.1 Sub-letter slugs (granularity inserts)

The optional `<letter>` suffix exists for **retroactive granularity inserts** — adding new lessons under an existing integer slot in a shipped unit, without renaming the slugs that the database already holds foreign keys against.

**When to use a sub-letter slug:**

- Splitting a shipped multi-concept lesson into atomic ones per the §2a granularity bar, *and* the original slug already has student commits / progress / drafts in production. Renaming would be data-destructive (§3.4).
- Inserting a new atomic concept between two shipped integer slots when re-numbering those slots is also data-destructive.

**When NOT to use a sub-letter slug:**

- Authoring a new unit from scratch. Use sequential integer slots only — sub-letters are for retro work.
- Pre-launch units with no student data yet. Renumber instead; integer-only slugs are simpler.
- More than ~6 inserts under a single integer slot. If you need 2.2.7a through 2.2.7h, that is a sign the unit needed integer renumbering and you took the retro path because launch already happened — flag it in the spec's Context for future cleanup.

**Pedagogical attachment.** A sub-letter slug attaches conceptually to its integer parent: 2.2.3a, 2.2.3b, 2.2.3c are *expansions of the topic* that 2.2.3 introduces. They share teacher framing, vocabulary, and source material; they do not introduce a new top-level topic. If you find a sub-letter row introducing a topic unrelated to its parent, promote it to a fresh integer slot instead.

**Numbered Lesson List shape.** Sub-letter rows appear in the Numbered Lesson List immediately after their integer parent, in alphabetical order, and the row's "Notes" column states "new" or names the trim/reposition relative to the parent. Example pattern is the canonical `2.2.1_classes-via-shplay.md` post-granularity revision.

**No code change required.** The parser at `lib/curriculum.ts:111` already accepts `[a-zA-Z]?` after the third dotted integer; sort is already `{ numeric: true }`. Adding sub-letter slugs needs no migration and no helper update.

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
| No-points + green-to-advance | The course is now mastery-based. §1 frontmatter `artifacts[]` shape dropped the `points: <n>` field. §2 Required Sections #13 (Assignments) reframed: rubrics must use pass-criteria language, not point columns. §3.4 migration example updated to require `passingScore` AND `totalPoints` AND every `requirements[].points` to be `0`. The convention violation list at §3.4 now treats any non-zero point value as a violation. See `shplay-lesson-conventions.md` for the canonical wording and the green-to-advance lesson-nav lock. |
| Granularity for intro-level units | §2a added: "one new concept per lesson" rule for intro-level material. §2 Required Sections gained #17 Lab/Reading Specs (per-lesson detail) for intro units. §4 slug rule now permits an optional lowercase `<letter>` suffix for retroactive granularity inserts under shipped integer slots (§4.1). The 2.2 OOP unit was the first to apply the granularity bar retroactively — its 13 shipped lessons were preserved by slug, with 13 new sub-letter inserts (2.2.3a, 2.2.3b, 2.2.4a–d, 2.2.5, 2.2.5a, 2.2.7a–h, 2.2.8a–c, 2.2.10a, 2.2.12a) splitting the dense readings and the Enemy-class worked example into atomic concept lessons. See `2.2.1_classes-via-shplay.md` for the canonical example. |
