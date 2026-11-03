# Release branch `release-ch5`: Chapter 5 only, onto production (`cs-3d`)

Written 2026-11-02 while preparing the branch. Owner decision: ship modules 5.1 through 5.11
to production; 6.9 Grids, 6.10 Breakout, 6.11 Sound and every other unfinished 6.x/7.x change
stays on `codehs-inspiration`.

- Base: `origin/cs-3d` = `ddeced2b`. Source: `codehs-inspiration` = `c3533aae` (72 commits, 792 paths).
- Worktree: `/home/shuff57/Documents/GitHub/shCode-release` (branch `release-ch5`, tracking `origin/cs-3d`).
  `node_modules` is a symlink to the main tree's; `public/reshape/kernel/` and `pa-pseudocode/` are
  copied in (both git-ignored).
- Not pushed, not deployed. `shCode-deploy/` (the owner's cs-3d checkout) untouched.

## 1. Classification of the 792 changed paths

| Category | Paths | What |
| --- | --- | --- |
| A. Chapter 5 content | 403 | `lessons/5-*` (all new 5.2-random, 5.3-pinball, 5.4-flappy, 5.5-snake, 5.5-*, 5.9/5.10/5.11-defender folders plus edits to every existing 5.1/5.2/5.3 folder), `lessons/moshion-bounce`, `lessons/moshion-gravity`, `curriculum/modules/5.*` (two renames: `5.3_classes-objects.md` -> `5.6_...`, `5.4_writing-your-own-classes.md` -> `5.7_...`), `curriculum/groups/5.*`, `public/slides/5.2_physics_feel.paper.html` |
| B. Shared infrastructure Chapter 5 needs | 123 | `lib/` (6), `components/` (3), `app/` (3), `functions/_shared/*.generated.ts` (2, regenerated), `public/moshion/**` (vendored moSHion d8068bb + textures + assets), `public/videos/**` (two papermorph videos, 5.1.2 and 5.1.12), `public/_headers`, `server.js`, `package.json`, the three generated JSON files under `public/`, `scripts/` (18), `curriculum/groups/README.md`, `curriculum/resources/*.md` (2) |
| C. Chapter 6/7 and other-unit content | 173 | 96 new-folder files (6.9 grids 36, 6.10 breakout 34, 6.11 sound 26), 3 new module docs + 3 group files for them, 69 edits to live 6.x/7.x lesson folders, `curriculum/modules/6.{1,2,3,4,5,8}`, `curriculum/modules/8.1` |
| D. Notes only | 93 | `codehs-review/` (89, 1.9 MB), `HANDOFF.md`, `CODEHS-INSPIRATION.md`, `CODEHS-MAP.md`, `CODEHS-SEEDING.md` |

No lesson folder that exists on `origin/cs-3d` was deleted or renamed on the branch
(`comm` of the two `lessons/` trees: empty). Folder ids, which key student progress, due dates,
open dates and solution releases, are all stable.

## 2. Decisions per mixed-concern file

| File | Decision |
| --- | --- |
| `public/lessons-manifest.json`, `public/lesson-requirements.json`, `public/quiz-stems.json` | regenerate (`generate-lessons-manifest`) |
| `functions/_shared/module-docs.generated.ts`, `functions/_shared/ai-graders.generated.ts` | regenerate (`generate-module-docs`, `generate-ai-graders`) |
| `lib/grader.ts`, `lib/js-source-clean.ts` | carry (see section 4; measured safe) |
| `lib/js-docs.ts` | carry: one added sentence in the 3.8 localStorage reading saying moSHion's `getItem` returns the saved type. True on the engine already in production (`getItem` has done `JSON.parse` since before this branch). |
| `lib/moshion-docs.ts` | carry: in-app docs for the vendored engine (sound, textures, math origin, gravity-starts-at-0 sentences) |
| `lib/curriculum.ts`, `lib/lesson-groups.ts`, `components/ModuleLessonsList.tsx`, `app/module/[moduleId]/page.tsx` | carry: lesson groups (presentational headings from `curriculum/groups/<id>.json`) and the `hidden` module flag. The flag is inert unless a module doc sets it; `8.1`'s `hidden: true` is HELD BACK (below). |
| `app/page.tsx` | carry (reads `hidden`; no module on the release sets it) |
| `components/MoshionPreview.tsx` | carry: `allow-modals` on the sketch iframe so `prompt()`/`alert()` work. Adds no origin access. 5.x labs use `prompt` in 6.10 only, but the runner error fix and the engine ship together. |
| `components/LessonWorkspace.tsx`, `app/globals.css` | carry (copy tweak "Check"; `.step-instructions pre` wraps, needed by 5.11.9) |
| `public/moshion/**` | carry whole (vendored engine d8068bb: default gravity 0, opt-in `world.origin = 'math'`, `showGrid`, `showMouse`, sound assets, new textures). Chapter 5 lessons are written against it (5.1.25, 5.11.9, and every 5.x sketch measured in `codehs-review/loop/gravity-default-audit.md`). |
| `public/moshion/runner.html` | carry ("Script error." fix, d0136c82) |
| `public/_headers`, `server.js` | carry (CORS headers for `/moshion/assets/*` so `loadSound` works; production already sends them, this makes it explicit) |
| `package.json` | carry (adds `check-lesson-groups` to `prebuild` and `test`, `test-runner-errors` to `test`) |
| `scripts/*` | carry all 18: `check-lesson-groups.mjs` (new, in prebuild), `test-runner-errors.mjs` (new, in test), `check-lesson-citations.mjs` (adds waivers; the 6-9 ones are inert here), `audit-grader-tolerance.mjs` (mutation fix), `test-grader-tolerance.mjs` (5.1.25 cases), six `apply-criterion-pointers-batch*.mjs` (records of the help pointers; renumbered to match), `renumber-plans/*.json` (records), three `make-moshion-*.py` (texture sources) |
| `curriculum/resources/*.md` | carry (authoring conventions: WASD-or-arrows rule the 5.x labs follow; a title example) |
| `curriculum/groups/README.md` | carry (documents the groups feature) |
| `codehs-review/`, `HANDOFF.md`, `CODEHS-*.md` | leave out (notes; 1.9 MB) |

## 3. Chapter 6/7 edits: carried vs held back

### Carried (95 paths), with the reason

1. **Every `lesson.json` under `lessons/6-*` and `lessons/7-*` except `6-5-5` and `6-5-6`** (66 files). Two kinds of edit, both forced by Chapter 5:
   - `Help: 5.1.14 (Keyboard Movement)` -> `5.1.15`, `5.2.2 (Gravity)` -> `5.2.6`, `5.2.6` -> `5.2.11`, `5.2.8` -> `5.2.13`, `5.1.15` -> `5.1.16`, `5.3.3` -> `5.6.3`. Chapter 5 was renumbered (5.1 gained 5.1.14 Key names and the 5.1.24 example moved to 5.2.7; 5.2 gained the random-and-timers lesson; 5.3/5.4 became 5.6/5.7). Without these, 7 live lessons point at the wrong Chapter 5 screen and `check-help-pointer-titles` grows new mismatches.
   - `"week": 13` -> `15` etc. (and `week` added where a slides/chart lesson had none). Chapter 5 grew from 3 modules to 11, so the schedule weeks for 6.1-6.8 moved by two. Display only (`LessonCard` "Week N" badge).
   - 6-3-9, 6-3-10, 6-1-11, 6-4-9, 6-7-27, 7-1-1 carry pointer renumbers inside requirement descriptions; nothing else in them changed except 6-7-27 below.
2. **`lessons/6-7-27-a17-1-pong-sumo/{lesson.json,content.md,script.js}`** (6.8.14 Pong-Sumo): the gravity-default edits from the audit. `r4` ("no gravity") also passes when the file never sets `world.gravity` (an honest shape now that the world starts at 0); step 1, the table row and the starter's STEP 1 comment say gravity starts at 0 and still ask for the line. Reference full, starter below full (gates below).
3. **`curriculum/modules/6.{1,2,3,4,8}_*.md`**: `weeks:` only (same schedule shift as the lesson `week` fields).

### Held back (78 paths), with the reason

- All new folders `lessons/6-9-grids-*` (36), `lessons/6-10-breakout-*` (34), `lessons/6-11-sound-*` (26), with `curriculum/modules/6.{9,10,11}_*.md` and `curriculum/groups/6.{9,10,11}.json`: not done, owner decision.
- `lessons/6-5-{5,6,7,9,10,11,12,13}*/content.md` and `lessons/6-5-{5,6}*/lesson.json`, `curriculum/modules/6.5_game-saves.md`: the getItem rewrite. Not gravity-related and not needed by Chapter 5. NOTE for the lead: the live 6.5.5/6.5.6 text says `getItem` returns a string and the 6.5.6 live block "prints 51"; the engine in production already returns the saved type (it `JSON.parse`s), so that text is wrong today, with or without this release. The rewrite is a self-contained 12-file correctness fix worth cherry-picking separately.
- `lessons/6-4-19-challenges/content.md`: one bullet corrected (moSHion has no `camera.follow`). Unrelated to Chapter 5; small, safe to cherry-pick later.
- `curriculum/modules/8.1_solid-shapes.md`: `hidden: true` plus the "PAUSED" note. Hiding the 3D track from the course list is a product decision outside this release; the code support (`lib/curriculum.ts`) ships inert.

### Gravity default on live 6.x lessons

`codehs-review/loop/gravity-default-audit.md` (2026-11-01) ran all 504 sketches on both engines.
Of the 117 sketches whose frame-180 state changed, every one set no gravity and in every one the old
default was a bug (sprites fell off the canvas while the text said they sat still). Every live lesson
that relies on falling (5.2, 6.3 platformers, 6.8 joints) already sets `world.gravity.y` itself.
Live 6.x sketches that change: 6.1.3, 6.1.4, 6.2.3, 6.4.9 solution, 6.4.13-15, 6.5.4, 6.5.12/13/17/18/22/25/26,
6.6.11/13/18/20/22/24/25/26, 6.7.10: all now keep their sprites on the canvas as their text says.
Requirements demanding gravity ON (6.3.9 r4, 6.3.10 r4) are unchanged and still met by their references.
The one live 6.x lesson whose text or regex needed an edit is 6.8.14 Pong-Sumo (carried). 6.9.2 is not live.

## 4. Grader changes (`lib/grader.ts`, `lib/js-source-clean.ts`)

`readableSource()` now calls `stripJsComments(raw, isJs)` and skips the `<!--`/`-->`/`#!` HTML-style
comment forms for `.md`/`.txt` requirement files (a README plan line may start with `-->`).
`js-source-clean.ts` became a single-pass scanner (strings, templates, regex literals, comments).
Evidence is in section 7 (audit-grader-tolerance --gate, test-grader-tolerance, test-grader-tolerance-3x,
check-starters: every live lesson's reference still scores full and every starter stays below full).

## 5. Chapter 5 dependencies on Chapter 6

`grep '6\.[0-9]+\.[0-9]+' lessons/5-*/ lessons/moshion-*/` finds nothing. Module docs 5.5, 5.8 and 5.11
mention "6.1 teaches groups" in prose only. `check-lesson-citations`, `check-prompt-pointers`,
`check-help-pointer-titles`, `check-lesson-numbers`, `check-lesson-groups`, `check-concept-order` and
`check-reachable` results are in section 7.

## 6. Schedule, ids, migrations

- **Module ids 5.3 and 5.4 change meaning.** On production, module `5.3` is Classes and Objects and `5.4`
  is Writing Your Own Classes. On the release, `5.3` is Pinball, `5.4` is Flappy, and the old modules are
  `5.6` and `5.7`. Lesson FOLDER ids did not change (`5-3-3-reading-classes` is still the same folder, now
  titled `5.6.3 ...`), so lesson-level progress, drafts, submissions and lesson-scoped due/open/release rows
  are untouched. But `class_due_dates`, `class_open_dates` and `class_solution_releases` rows with
  `scope = 'module'` and `scope_id IN ('5.3', '5.4')` would now apply to Pinball and Flappy instead of
  the classes modules, and the classes modules (`5.6`, `5.7`) would inherit nothing. Before deploying:
  `SELECT * FROM class_due_dates WHERE scope='module' AND scope_id IN ('5.3','5.4');` and the same on the
  other two tables; move any row found to `5.6`/`5.7` (and decide whether Pinball/Flappy want one).
- `week` values are display only. Class open dates live in the DB, not in code. A module-level open date
  on `5.1` or `5.2` already set in a class will now also lock/unlock the NEW screens in those modules
  (5.1.14, 5.1.24, 5.1.25, 5.2.1-5.2.4 random/timers, 5.2.7). New folders with no inherited open date are
  open to every class immediately and appear in every class's lesson list as soon as the deploy lands.
- Migrations: none on the branch (`migrations/` unchanged in the diff). `check-pending-migrations` result in section 7.

## 7. Results

Commits on `release-ch5` (base `ddeced2b`):

| Commit | Content |
| --- | --- |
| `3f53a709` | infra (B): lib/, components/, app/, server.js, package.json, public/_headers, public/moshion/**, scripts/**, curriculum/groups/README.md, curriculum/resources/* |
| `45473c66` | Chapter 5 (A): lessons/5-*, lessons/moshion-*, curriculum/modules/5.*, curriculum/groups/5.*, public/slides/5.2*, public/videos/** |
| `47c038df` | live 6.x/7.x edits (C carried, 58 paths) |
| `187f4c0b` | regenerated: manifest, requirements, quiz stems, module docs, AI graders |

`git diff --name-only codehs-inspiration` on the release is exactly the held-back set (6.9-6.11 folders
and docs, the 6.5 rewrite, 6.4.19, 8.1) plus the notes (codehs-review/, HANDOFF.md, CODEHS-*.md) and the
generated files that differ by that content. Manifest: 723 -> 812 lessons (89 new, all 5.x); 6.x/7.x
count unchanged at 129; no `6-9-`/`6-10-`/`6-11-` id or `6.9`/`6.10`/`6.11` module key in any generated file.

Gates run in the worktree (all `node --import ./scripts/register-ts.mjs scripts/<name>`):

| Gate | Result |
| --- | --- |
| check-lesson-numbers | exit 0 |
| check-lesson-groups | exit 0 |
| check-prompt-pointers | exit 0 |
| check-help-pointer-titles (full) | exit 1 with the SAME 10 known mismatches as origin/cs-3d (1.4.14, 2.5.24, 3.4.19 x4, 6.3.10, 6.6.24 x2, 6.7.28); zero new |
| check-lesson-citations | exit 0 |
| check-hints | exit 0 |
| check-live-blocks | exit 0 |
| check-concept-order | exit 0 |
| check-reachable | exit 0 |
| check-solution-leak | exit 0 |
| test-quiz | exit 0 |
| test-runner-errors | exit 0 |
| check-starters | exit 0 (48 s): every reference full, every starter below full, on every lesson in the tree |
| audit-grader-tolerance --gate | exit 0 (51 s) |
| test-grader-tolerance | exit 0 (38 s) |
| tsc --noEmit | exit 0 |
| check-pending-migrations | "D1 migrations: none pending" |
| check-pa-attempts --require-pseudocode | ok: 23 PA lessons, 3 tries each, 19 of 19 pseudocode files present |
| stamp-tries-applied --check | exit 1: stamp (2026-10-04) older than 24 h, as on every deploy since go-live; passes with `TRIES_STAMP_ALLOW_OLD=1` (the way the owner deploys, per memory) |

| test-grader-tolerance-3x | exit 0 (396 s): "grader tolerance 3.4-3.8: 953 cases OK (418 accepted, 535 rejected, 35 labs)" |
| test-moshion | exit 0 (27 s): "moSHion gate: PASS" |

Grader safety (section 4): check-starters (every reference full, every starter below full, whole tree),
audit-grader-tolerance --gate, test-grader-tolerance (349 cases) and test-grader-tolerance-3x (953 cases)
all pass on the release tree, which holds every live lesson plus Chapter 5 and the new `lib/grader.ts` /
`lib/js-source-clean.ts`. The grader changes are safe to carry.

Full `npm test`, `npm run build` and `check-ai-grader-leak --require-build`: see section 8.

## 8. Full test, build, preflight

- **`npm test` in the worktree** (owner's dev server stopped by pid 3625759 first, restarted afterwards
  with `cd /home/shuff57/Documents/GitHub/shCode && DEV_ROLE=teacher PORT=3002 nohup npm run dev`):
  log `/tmp/claude-1000/-home-shuff57-Documents-GitHub-shCode/60ad380a-7fba-4db0-b15a-d9dc4a9239e7/scratchpad/npm-test.log`,
  4518 lines, last line **`EXIT 0`**. No step reran. The only "Error:" lines are the login-lockout test's
  own expected stub failures ("no such table: login_attempts"). The run dirtied `.gauntlet/occt-checks.json`
  in the worktree (known side effect); restored with `git checkout`, worktree clean.
- **Dev server restarted** and answered HTTP 200 on :3002 after ~10 s (new pid 760356; log
  `.../scratchpad/dev.log`).
- **`npm run build` in the worktree**: prebuild (kernel + PII models staged from the main tree's copies, all
  checks and generators) then `next build`: "Compiled successfully in 41s", 1730/1730 static pages,
  **BUILD EXIT 0**. `out/` = 165 MB (25 MB of it `out/reshape` kernel wasm, 2.9 MB videos, 1.4 MB moshion,
  4.5 MB `_next`), 3737 files, 1757 HTML, 812 lesson pages, 46 module pages (5.1-5.11 present; no 6.9/6.10/6.11).
- **`check-ai-grader-leak --require-build`**: ok, 798 probes, 113 files in public/, 3646 in out/.
- **Deploy preflight** (what `npm run deploy` runs before wrangler), each run by hand, nothing deployed:
  1. `check-pending-migrations`: none pending (pass).
  2. `check-pa-attempts --require-pseudocode`: 23 PA lessons, 19/19 pseudocode files present (pass; needs
     `pa-pseudocode/` copied into the worktree, which it now is).
  3. `stamp-tries-applied --check`: **FAILS** as is (stamp 2026-10-04 is 701 h old). This is the guard that
     would stop `npm run deploy`; it has stopped every deploy since go-live and the owner deploys with
     `TRIES_STAMP_ALLOW_OLD=1 npm run deploy` (checked: passes with the flag, prints the warning).
  4. `npm run build` + `check-ai-grader-leak --require-build`: pass (above).
  5. `npx wrangler pages deploy out --project-name shcode --branch cs-3d`: NOT run. Note the deploy script
     pins `--branch cs-3d`; run from the `release-ch5` worktree it would still publish to the production
     branch alias, which is the intent here.

## 9. What the lead must decide before `npm run deploy`

1. **Module ids 5.3/5.4 changed meaning** (section 6). Query production for `scope='module'` rows with
   `scope_id IN ('5.3','5.4')` in `class_due_dates`, `class_open_dates`, `class_solution_releases`; move any
   to `5.6`/`5.7` first, or accept that they will govern Pinball/Flappy. Unit-level and lesson-level rows are
   unaffected (folder ids are stable; 62 live 5.x lessons change TITLE only: 10 within 5.1, 15 within 5.2,
   1 moves 5.1.24 -> 5.2.7 (`moshion-gravity`), 14 go 5.3 -> 5.6, 22 go 5.3/5.4 -> 5.7).
2. **89 new 5.x screens appear in every class immediately** (list: `scratchpad/new-lessons.json`; counts by
   module: 5.1 +2, 5.2 +4, 5.3 Pinball 12, 5.4 Flappy 11, 5.5 Snake 11, 5.6 +2, 5.8 Inside a Class 20,
   5.9 Defender 8, 5.10 Defender 9, 5.11 Defender 10). None carries an `assignmentCode` (no new PA part, so
   no new "missing" assignment in any gradebook). A class with a module-level open date on 5.1 or 5.2 locks
   the new 5.1/5.2 screens under it; new modules have no inherited open date and are open at once. Set open
   dates for 5.3-5.11 in each class before deploying if students should not see them yet.
3. **Gravity default 0 on live 6.x lessons**: audited, no lesson needed a line; 6.8.14 is the one text/regex
   edit and it is carried. Students' saved 6.x sketches that silently relied on falling with no
   `world.gravity.y` line would now float; the audit found no course sketch of that shape.
4. **Grader changes** carried; evidence in section 7. Risk: a student file that uses `<!--` inside a `.js`
   requirement file is now treated as a comment (JavaScript semantics), which is the intended rule.
5. **Held back but already wrong in production**: 6.5.5/6.5.6 (and the 6.5.7-6.5.13 notes) say `getItem`
   returns a string; the live engine returns the saved type. A separate 12-file cherry-pick from
   `codehs-inspiration` fixes it (`lessons/6-5-{5,6,7,9,10,11,12,13}*`, `curriculum/modules/6.5_game-saves.md`).
   Likewise `lessons/6-4-19-challenges/content.md` (one bullet) and `curriculum/modules/8.1_solid-shapes.md`
   (`hidden: true`, hides the paused 3D track from the course list).
6. `TRIES_STAMP_ALLOW_OLD=1` is required for the deploy to pass guard 3, as before.
