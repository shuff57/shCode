# Handoff — 2026-08-28 · moSHion and reSHape extracted to public repos

**shuff57/moshion** and **shuff57/reshape-3d** now exist as standalone public
repos (fresh history, MIT), extracted byte-identically from
`public/moshion/` and `public/reshape/`. Each has a root `LICENSE`, `README`,
and `index.html` demo page deployed to GitHub Pages:

- https://shuff57.github.io/moshion/
- https://shuff57.github.io/reshape-3d/   (name taken: `shuff57/reshape` is the STL→STEP converter)

The runners' "This preview only runs inside shCode" top-level guard and the
postMessage storage bridge were kept as-is — the demo page implements the
host side (storage-init responder, console pipe), so no engine edits were
needed. shCode keeps its vendored copies; these are extracts, not moves.
If either engine changes here, re-copy `public/<name>/` into the public repo
(and leave `svg.js`'s shCode-specific header comment — it shipped unchanged).
`demo.html`→`index.html` rename was needed because GitHub Pages serves the
site root from `index.html`.

---

# Handoff — 2026-08-25 · shPlay is now moSHion; two engine outages fixed; q5play removed

Started as "run the six new answer keys in a browser". Running them found two
defects that had nothing to do with the keys, and pulling on those ended in an
engine rename and the removal of a vendored library we should not have been
hosting. Everything below is **shipped and verified on production**.

| Commit | What |
| --- | --- |
| `b2b3303` | `feat(solutions): answer keys for the last six lessons` |
| `1309460` | `feat(moshion): rename the engine, drop the vendored q5play` — 393 files, +2453/-27099 |

Migration `0017_rename_q5play_lesson_ids.sql` is **applied to prod and local**.
`npm test` green, `tsc --noEmit` clean, tree clean, `cs-3d` pushed.

---

## 1. The two engine defects — both were live, both pre-existing

Neither was in the answer keys. Both had been shipping for as long as the
features existed.

**Unit 6.5 could not run at all.** The preview iframe is sandboxed *without*
`allow-same-origin` (deliberately — student code must not reach `/api/*` with
the viewer's cookie). That gives it an opaque origin, where merely *reading*
`window.localStorage` throws `SecurityError`. So the first `storeItem()` killed
the sketch: black canvas, red `Error: Script error.` bar. **42 lesson files call
`storeItem`/`getItem`** — all of unit 6.5 (Save & Load), parts of 6.6 and 7.1,
and 4.1.4. Confirmed by running the course's *own* 6.5.4 content, not mine.

Fixed with a hydrate-from-parent bridge. The host page keeps the store on its
real origin and hands the frame a populated copy *before* the sketch runs, so
`getItem()` stays a synchronous read:

```
parent (app origin)          iframe (opaque origin)
  localStorage  ---- init --->  window.__moshionStorage
      ^                                  |
      +---------- set/remove/clear ------+
```

`lib/moshion-storage.ts` (host), the boot block in `public/moshion/runner.html`
(frame), `public/moshion/moshion.js` (the four storage functions). One shared
namespace, `moshion.store.v1`, with a 64 KB per-value / 512 KB total cap so a
runaway sketch cannot evict the student's lesson drafts from the same
localStorage.

**`camera.x = player.x` did not centre the player.** 6.4.12/13/16/17 all say it
"re-centers the viewport", and 6.4.12's table said the camera defaults to
`(canvas.w/2, canvas.h/2)`. The engine said `camera = {x: 0, y: 0}` and did
`translate(-camera.x, -camera.y)` — a top-left offset. Running 6.4.16's own
example and walking right:

| | player.x | camera.x | rendered |
| --- | --- | --- | --- |
| as the course teaches it | 535 | 535 | half off the **left edge** |
| with `- canvas.w/2` | 535 | 335 | dead centre |

Fixed in the **engine**, not the docs, so every existing lesson became true as
written and moSHion matches the API it is modelled on. All nine world/screen
conversions now go through `_camLeft()` / `_camTop()`, so the centre-vs-corner
question is answered in one place. No lesson had compensated for the old
behaviour, so nothing regressed.

---

## 2. Names: shPlay → moSHion, q5play gone

**The engine was always ours** — exactly one substantive line is shared with
`q5play.js`, and it is `return this.vel.x != 0 || this.vel.y != 0`.

**But `public/q5play/` held a real copy of upstream q5play v4.0 + q5.js v4.5**,
1.3 MB, and because it sat under `public/` it was *served*: `/q5play/q5play.js`
answered 200 with 194,498 bytes on shcode.pages.dev. q5play's licence is not
open source, and clause 1d forbids use "for the purpose of teaching computer
science… includes… use in schools". Nothing in the app loaded it — only a parity
report read one typings file. Directory and report both deleted; `/q5play/*` now
404s in production.

**The example art was the harder half.** All six sprite sheets were
byte-identical to q5play's (SHA-256), while our own `LICENSE.md` called them
"original work written for this course" under an MIT notice. Four are
load-bearing — 6.4.4, 6.4.5, 6.4.6 and 6.4.7 load them by URL to teach `addAni`
and `sprite.image`. They are now redrawn from primitives by
`scripts/make-moshion-assets.py` (deterministic; re-run to regenerate), same
geometry and frame counts so no lesson content moved. `monster.webp` and
`questKid.webp` had zero references and were deleted rather than redrawn.

**One credit line survives, by decision:** `LICENSE.md` §3 says moSHion is
*inspired by q5play* and contains none of its code. For an acknowledged
reimplementation, removing attribution reads worse than keeping it. The only
other occurrences are two pointers to that line and `_redirects` naming the old
path.

Slug is `moshion`, display name **moSHion Game Design**. `/docs/shplay/*` →
`/docs/moshion/*` via `public/_redirects` (verified 301 on prod).

---

## 3. Migration 0017 — and the 65 rows it rescued

Five lesson ids carried `q5play`. They now read `moshion`, and prod is migrated:

```
5-1-11-q5play-intro           -> 5-1-11-moshion-intro
5-1-20-q5play-move-keys       -> 5-1-20-moshion-move-keys
5-3-14-q5play-sprite-showcase -> 5-3-14-moshion-sprite-showcase
q5play-bounce                 -> moshion-bounce
q5play-gravity                -> moshion-gravity
```

**The rescue.** An earlier renumber moved these lessons onto the title numbering
in `lesson_state` and `commits` but never touched `lesson_submissions`. Prod held
65 submission rows under the pre-numbering ids (`q5play-intro` 29,
`q5play-move-keys` 35, `q5play-sprite-showcase` 1) — a real submit history for
lessons that could no longer find it, so
`GET /api/lesson-submissions?lessonId=5-1-11-…` had been returning nothing for
months. 0017 folds them onto the new ids. Zero students held both an old and a
new id, so nothing merged two real histories.

0017 also covers `lesson_modes` and `class_due_dates`, which `0013` predates.
**`class_due_dates` keeps lesson ids in `scope_id`, not `lesson_id`** — a grep
for the obvious column name walks straight past it. Both were empty; the
statements are there for a database where they are not.

Verified after applying: **201 rows moved, zero q5play left**, counts matching
the pre-flight exactly (state 29/28/31, submissions 29/35/1, commits 22/26).

**Still open, not touched:** production has **97** lesson ids with no matching
lesson folder, mostly the old `2-x-y` numbering from the unit renumber. Three
were ours and are fixed. The other 94 are a separate question nobody has asked
yet.

---

## 4. Traps measured this session

- **A repo-wide rename corrupts migrations.** The sweep rewrote 0017's SQL
  string literals into `'the reference API-intro'` — valid SQL that matches zero
  rows. It would have applied, printed ✅, and stranded all 201 rows. 169
  literals were hit. **Exclude `migrations/` from any string sweep and re-read
  the SQL.** `migrations apply` reporting ✅ means the statements ran, not that
  they matched anything: always count rows on the new ids afterwards.
- **"0 errors" is not "it worked".** After the storage change every sketch came
  up black with a clean console and the run reported six greens. The bridge had
  pushed injection past `_tryAutoBoot()`, so `window.setup` did not exist when
  the engine looked and it never started — silently. Caught only because 7.1.1's
  three startup `PASS` lines had vanished. The engine now exposes
  `_moshionAutoBoot` and the runner calls it after injecting.
- **Cloudflare edges disagree mid-rollout.** Polling for the deploy returned 200
  for `/moshion/moshion.js` and then 404 for the same URL seconds later.
  Applying the migration on that first 200 would have put D1 ahead of the site —
  which is exactly how the 65 orphans were created. Require several consistent
  samples with cache-busting before treating a deploy as live.
- **`ImageDraw` replaces pixels, it does not composite.** Translucent shapes
  punch holes through whatever they overlap: the star's highlight came out a
  grey smudge and the burst's core ate the spokes behind it. Draw translucent
  elements on their own layer and `alpha_composite` them.
- **A `git mv` loop with `set -e` does not abort on failure inside a function.**
  One untracked file silently failed to move and the loop carried on.

---

## 5. Verified green

- `npm test` end to end: **moSHion gate PASS**, JSCAD 675/675, 144
  grader-tolerance cases, 19 version-control assertions, no solution leaks, 510
  lessons with no id collisions, `check-reachable` clean.
- `npx tsc --noEmit` clean (clear `.next` first — stale route types for the old
  `/docs/shplay` path fail the check).
- All six reference sketches run headless with zero errors; 7.1.1 prints its
  three `PASS` lines; 6.5.27's save survives a full page reload.
- The storage bridge round-trips in the **real app**, not just the rig: parent
  localStorage read `{"bridgeProbe":"1"}`, then `"2"` after a reload.
- Nine numeric camera checks in a browser (HUD identity, world-origin-to-
  top-left, pan direction, culling), plus 6.4.18 and 6.5.25 — the latter running
  for the first time.
- New sprite sheets load, slice and animate through the engine at the right
  frame counts.
- Production: `/moshion/moshion.js` 200, `/q5play/*` 404, `/docs/shplay/overview`
  301 → `/docs/moshion/overview`, four new assets 200, two deleted assets 404.

---

## 6. What is NOT done

- **Nobody has played the four animation lessons by hand.** The sheets are
  verified to load, slice and animate — not to look good in motion.
- **Three gate expectations were rewritten by the same person who changed the
  behaviour** (`moshion-checks.mjs`, `moshion-checks-surface.mjs`). Each new
  number is derived from the documented rule in a comment rather than copied
  from the code's output, and an independent browser probe asserted the same
  values first — but it is still builder-owns-gate and worth a second pair of
  eyes.
- **The 94 remaining orphaned lesson ids** in prod (see §3).
- **`curriculum/modules/_build-spec-1.2-1.4.md`** and other archived specs were
  swept along with everything else. They are historical documents; the rename is
  correct but nobody re-read them for sense.

---

# Handoff — 2026-08-24 · reSHape shipped; no lesson uses it yet

reSHape — a plain-words surface over `@jscad/modeling`, the JSCAD equivalent of what
moSHion is to planck — was designed, built, gauntleted three times and committed on
2026-08-24. The gate is green and a student can reach every part of it. **What does
not exist is a single Q3 lesson that uses it.** The layer is done; the curriculum
work it was built for has not started. That is the handoff.

Two commits, both on `cs-3d`, neither pushed:

| Commit | What |
| --- | --- |
| `e5056e5` | `feat(jscad): reSHape, a plain-words surface over @jscad/modeling` — 10 files, +8133/-30 |
| `2892e67` | `fix(jscad): give /portable a way in` — 4 files, +61/-1 |

This section sits above the module-1.3 review of the same date; the two are unrelated
and both are current.

---

## 1. What reSHape is

Twelve names, additive only, in their own file: `box rect disc ball tube extrude
revolve turn sit cone ring poly`. Positional arguments for what a shape cannot exist
without, everything else in a trailing options object keyed with the textbook's own
words. `reshape.js` loads beside the bare-name shim and skips any name already taken,
reporting into `window.__reshapeNamesSkipped` the way the shim reports into
`__jscadBareNamesSkipped`.

The design decision the operator made, and it drives everything else: **reSHape
everywhere in Q3, with the real API as the "why"** — not reSHape-as-fallback. So the
real names stay fully reachable, every reSHape call has a proven real-API equivalent,
and a student's program can be converted to portable form and pasted into jscad.app.

| Path | What it is |
| --- | --- |
| `public/reshape/reshape.js` | the layer itself, ~934 lines, IIFE, banner carries the REFUSALS list |
| `public/reshape/svg.js` | geom2 to SVG, hand-rolled, ~139 lines |
| `lib/reshape-portable.mjs` | source-text in, portable source-text out, ~1016 lines |
| `app/portable/page.tsx` | the `/portable` converter page |
| `scripts/reshape-simple-checks.mjs` | expectations as data — the builder must not own the gate |
| `scripts/test-reshape.mjs` | SIMPLE + PORTABLE groups appended; nothing existing weakened |
| `public/reshape/docs/reference.md` | the reSHape section, the graduation table, the reading table |

### `turn` is the one that is not a rename

Every other reSHape name maps onto one real call. `turn` does not: it rotates a shape
**in place** (bbox centre to origin, rotate, back) and takes **degrees**, where
`transforms.rotate` orbits the world origin in radians. The slogan in the docs is
**"turn for shapes, rotate for frames"**, and it is load-bearing — a student who
reads `turn` as a rename of `rotate` will build a scene that flies apart. The
portable converter emits a `turnInPlace()` helper rather than inlining the
translate-rotate-translate, so the exported program still reads.

### SVG export

The save bar shipped `stl`, `3mf` and `obj` — all three serialize polygons, and a
`geom2` has none. So every 2D design in §8.2 and §8.3 could be built, rendered and
graded in shCode and **never leave it**, while A8.2.1 asks in so many words for an
SVG file. `svg.js` closes that. It is hand-written rather than vendored because
`public/reshape/lib/jscad-io.min.js` contains no SVG serializer and is already the one
entry in `EXPECTED_BUNDLES` with `verified: false` — a second unverified binary to
solve a fifty-line problem is the wrong trade.

## 2. Constraints that must not be broken

These are the things a future change will step on. Each one is enforced by the gate,
but the gate failure will not explain why.

- **`EXPECTED_BARE_NAME_COUNT = 124` counts the shim, not reSHape.** reSHape lives in its
  own file precisely so it does not move that number. If a reSHape name ever needs to
  come from the shim, the count and the reasoning both change.
- **`taughtFromReference()` derives the taught set from the module tables in
  `reference.md`.** Restructuring those tables silently redefines what the API group
  tests. Add sections around them; do not reformat them.
- **`scripts/reshape-checks.mjs` is not editable to make a red check go green.** Its
  header says so. The same rule applies to `reshape-simple-checks.mjs`: the builder
  does not own the gate.
- **The API group asserts every taught function is the SAME REFERENCE bare as
  namespaced.** A facade is legal only as additive new names — never as a wrapper
  replacing a taught one.
- **`REACH_CHAIN` and `REACH_PORTABLE` fail the build if a page loses its last inbound
  link.** `REACH_PORTABLE` exists because `/portable` shipped in `e5056e5` with no nav
  link and no docs link, while its own header comment described three ways a student
  arrives. Do not delete either link and leave the page.
- **`check-runner-hoisting.mjs`** anchors on the "Running your code…" status line in
  `runner.html`. The three reSHape edits there (script tag, `FORMATS` entry, Save SVG
  button) were made above it deliberately.

## 3. Verified green

`npm test` exit 0, `npx tsc --noEmit` exit 0, working tree clean, re-run after the
peer's later commits landed.

```
  JSCAD gate ...........................  675/675
    BUNDLE 7 · SHIM 11 · API 5 · RENDERER 6 · DOCS 227
    SYNC 2 · REACH 9 · SIMPLE 42 · PORTABLE 126
```

SVG checks live inside the PORTABLE group (the `at('svg')` subsection), not a group
of their own. The rendering was also checked by eye in a real browser — see §5, that
is not decoration.

## 4. What is NOT done

1. **No Q3 lesson uses reSHape.** The layer, the docs, the converter and the export all
   exist; §8.2 and §8.3 still teach the raw API. This is the whole remaining job and
   it is curriculum work, not build work.
2. **A8.2.1's assignment text has not been re-read against what shipped.** It says
   "Export as SVG". That now works. Nobody has checked that the rest of the wording
   matches the button the student will actually see.
3. **`model-codegen` was retargeted to reSHape** at the operator's confirmation; the
   sandbox generator now emits reSHape. Two of its assertions are borrowed by the JSCAD
   gate (`BORROWED_ASSERTIONS` in `reshape-simple-checks.mjs`) so a change in one place
   fails in both. Worth knowing before editing either file.
4. **Nothing is pushed.** Both commits are local on `cs-3d`.

## 5. Traps measured this session

All three are now memory files, but they cost real cycles here and the specific
instances are worth keeping:

- **A green check whose fixture cannot fail.** The first "turn rotates in place" test
  translated along x and tilted about **X** — the offset lay on the rotation axis, so
  the counter-case commuted too and the row would have passed on a `turn` that had
  stopped rotating entirely. Fixed by tilting about **y**. Before trusting a new
  check, ask what value would make a broken implementation pass it.
- **A correct-looking SVG with an invisible hole.** `svg.js` first emitted one
  `<path>` per loop with `fill-rule="evenodd"`. Both assertions — "two paths" and
  "fill-rule is present" — were true, and the hole in a plate rendered as a filled
  shape in the fill colour on top of what it should have cut. `evenodd` resolves
  subpaths *within* one `<path>` and does nothing across elements. Found only by
  rendering the file and looking at it. The real check (paths = shapes, subpaths =
  loops) exists because of the looking.
- **A test-harness bug that blamed the product.** `test-reshape.mjs` interpolated a
  degrees value into source text raw, so an array angle became four positional
  arguments and `turn` correctly refused — which read as a `turn` defect.
  `JSON.stringify` fixed it. *Coverage of a feature is not coverage of its forms*: a
  29-row form sweep found a latent bug that per-feature rows had passed over.

## 6. Two process notes for the next parallel session

- **`msg.mjs release --as <name> --all` is per-identity and the identity is
  unauthenticated free text.** A peer probing the guard under the identity
  `claude-reshape` released all six of this session's claims as collateral. Claims are
  a coordination convention, not a lock.
- **The ownership guard path in `settings.json` was wrong** (`shuff57` where the home
  directory is `shuff`), so it had never blocked anything while looking configured.
  `PreToolUse` blocks on exit **2**; a bad path throws MODULE_NOT_FOUND and exits 1,
  which is a non-blocking error. Fixed, but re-prove it on any new machine — the
  probe is in the global `CLAUDE.md`.

---

# Handoff — 2026-08-24 · Module 1.3 review, all six items shipped and verified

Module 1.3 (Documentation and Coding Conventions, 21 lessons) was reviewed end to end
on 2026-08-24: static audit of every lesson and all routing, plus two browser passes —
one walking the module as a student, one exercising the teacher surfaces. The three
settled fixes (section B) and the three operator decisions (section C) are **all
applied, committed as `0eb175a`, and pushed to `origin/cs-3d`**. `npm test`,
`npx tsc --noEmit` and `npm run build` are green, and a browser pass against
real Functions has since been run — see section G, which also supersedes that
commit's `Not-tested: no browser pass` trailer. Sections B and C are kept only
as a record of what changed and why; delete them when they stop being useful.

The 2026-08-23 handoff below is still current — branches, deploy traps, R2 — and is
unchanged. Read it too if you are on a fresh machine.

---

## A. Rebuilding the test harness

The review ran against real Cloudflare Functions, not the Express dev server. This
matters: `node server.js` (port 3002) stubs `/api/me` as `dev@local` role `teacher`
and fakes lesson-state, so **no student-role behaviour can be observed on it at all**.

```bash
# 1. Stop the dev server first — it and `next build` both own .next.
#    pkill does NOT work from Git Bash on this box; use PowerShell:
#    Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
#      Where-Object CommandLine -like '*server.js*' | Stop-Process -Force
rm -rf .next && npm run build            # ~1100 pages, several minutes

# 2. .dev.vars at repo root (gitignored). AUTH_SECRET is any random hex.
#    OLLAMA_API_KEY: the `ollama-cloud` entry in
#    ~/.local/share/opencode/auth.json — the prod Pages secret cannot be read back.
#    TEACHER_EMAILS is the allowlist that promotes a signup to role=teacher.

# 3. Bindings come from wrangler.toml. Do NOT pass --d1/--r2 on the CLI:
#    that creates a DIFFERENT local namespace and every query fails with
#    "no such table: students" against a database that is in fact migrated.
npx wrangler pages dev out --port 8788
```

Local D1 is already migrated. Query it directly for ground truth — this is how several
UI claims were checked and one was overturned:

```bash
npx wrangler d1 execute shcode-commits --local --command "SELECT ..."
```

Test accounts created 2026-08-24, both password `TestPass123!`, both live in local D1:
`teacher.test@shcode.local` (role teacher, owns class `WSJTB4`) and
`student.test@shcode.local` (role student, enrolled in it). Recreate by POSTing to
`/api/auth/signup`; the teacher one only gets its role if it is in `TEACHER_EMAILS`.

**Grading a lesson offline against the shipped grader** — this is the instrument that
found most of the regex defects, and it is worth more than reading patterns by eye:

```bash
node node_modules/typescript/bin/tsc lib/grader.ts --outDir $OUT \
  --module commonjs --target es2022 --skipLibCheck
echo '{"type":"commonjs"}' > $OUT/package.json
# then: require($OUT+'/grader.js').grade(requirements, files, passingScore)
# files = every file in the lesson dir except lesson.json and solution.js,
# with script.js swapped for solution.js to test the reference answer.
```

Always run the **untouched starter** through it as a must-fail case. A requirement set
that the starter satisfies is worth nothing, and this repo has shipped that before
(`scripts/test-capstone-requirements.mjs` exists because of it).

Two traps that cost time on 2026-08-24, both already documented and both hit anyway:

- **A quoted heredoc still eats one level of backslash.** Writing a regex test harness
  with `<<'EOF'` turned `[\\s\\S]` into `[\s\S]` → `[sS]`, and the harness reported
  every patch as failing. It looked like the patches were wrong; the test was wrong.
  Use the Write tool and `String.raw`, and assert the patch is not a no-op.
- **`npm run build` rewrites `public/lessons-manifest.json` with CRLF**, producing a
  tracked modification whose `git diff --numstat` is empty. Do not commit it;
  `git checkout --` it.

## B. Findings that are settled — ALL THREE APPLIED, committed as 0eb175a

> **Status: done.** All three fixes below are committed as `0eb175a` and verified.
> `npm test` is green and now includes `scripts/test-version-control.mjs`, a new
> regression gate for fix 1 — confirmed to FAIL against the pre-fix code, so it is
> not hollow. The backtick and comment-length fixes were re-checked offline against
> the compiled `lib/grader.ts`: all three reference solutions score full marks
> (1.3.19 is now 10/10, see C1), all three untouched starters still score zero,
> backticks now pass, `// tax rate` now passes, `// a` still fails. Keep this
> section only until the work is committed, then delete it.

Verified twice each (once offline against `lib/grader.ts`, once in a browser), so these
need no further investigation:

1. **`getChangedFiles` ignores the diff it is handed.** `lib/version-control.ts:17-28`
   receives `currentContents` and `lastCommitted` and then iterates only `dirtyFileIds`
   — which `lib/store.ts:113` resets to an empty Set on every lesson mount.
   `commitChanges` (`lib/store.ts:219-226`) therefore no-ops, and `confirmSubmit`
   (`components/LessonWorkspace.tsx:506-508`) only `console.warn`s it.

   **Reproduced deliberately**: edit → reload → Run → Submit gives a passing, completed,
   graded lesson with **zero rows in `commits`**. Confirmed in D1 — 1.3.11 finished with
   2 submissions and 0 commits; 1.3.16, the one lab worked without a remount, is the
   only lesson with a student commit. Consequence: the teacher can never push into that
   lesson for that student, and nothing anywhere says why. "Close the tab, come back
   later, finish it" is the most ordinary student pattern there is.

   Fix is a deletion: compare the two content maps and drop the `dirtyFileIds`
   dependency. Highest-value change in this list.

2. **Backtick string literals are rejected in all three labs.** Patterns use
   `["'][^"']+["']`, so `` let subjectName = `Math` `` fails — using a construct taught
   in 1.2.13. Submit is all-or-nothing for zero-point lessons
   (`components/LessonWorkspace.tsx:552`), so the student is stuck, and the requirement's
   own text ("Declares subjectName holding the subject text") reads as true, giving them
   nothing to diagnose. Files: `1-3-11/lesson.json` r1, `1-3-16/lesson.json` r2,
   `1-3-19/lesson.json` r2. Fix: add a backtick character to both character classes, so
   they accept all three JavaScript string delimiters instead of two. The backtick needs
   no escaping inside a JSON regex string. Verified — backticks pass, reference solutions
   still pass, untouched starters still score zero.

3. **`1-3-19` r8 rejects short real comments.** Needs ≥10 characters after `//`, so
   `// tax rate` (9) fails, and the message never mentions length. Verified safe at a
   threshold of 6: `// tax rate` passes, `// a` still fails, starter still scores zero.

## C. The three decisions — ANSWERED AND SHIPPED, committed as 0eb175a

All three were decided by the operator and implemented in the same session, then
committed as `0eb175a`. Nothing here is still open.

### C1 — 1.3.19 had no full-credit reference path → solution/ directory built

Decision: extend the solution mechanism to a directory (the "correct fix" option).
The model README is authored once, in `solution/README.md`, rather than also being
pasted into `solution.js` as a comment block — two copies of a reference answer
drift, and the directory delivers the same teacher outcome.

- `lessons/1-3-19-*/solution.js` → `lessons/1-3-19-*/solution/script.js` (git mv),
  plus a new `solution/README.md`.
- `scripts/generate-solutions.mjs` now emits `Record<id, Record<path, text>>`,
  reading `solution/` when present and falling back to `solution.js` recorded as
  `script.js`. It **exits non-zero** if a lesson has both.
- `/api/lesson-solution/[id]` returns `{ files, solution }`; `solution` stays the
  script text for older callers.
- `SolutionPanel` shows every file with its path and inserts all of them;
  `LessonWorkspace`'s `onInsert` loops over the map instead of hardcoding
  `updateFile('script.js', code)`.

**The trap this created, and the guard for it.** `lib/lessons.ts` and
`scripts/generate-lesson-starters.mjs` both recurse into subdirectories and only
skipped files literally named `solution.js`. A `solution/` folder would therefore
have shipped the answer key to every student with nothing failing. Both now
exclude a directory named `solution`, and `scripts/check-solution-leak.mjs` — new,
wired into **both** `prebuild` and `npm test` — measures it: no `solution/` path
appears as a key in the starters bundle, no solution file's full text appears
there, and the answer *is* present in `solutions.generated.ts` so the guard cannot
pass because the answer went missing. Proven real by deleting the exclusion and
watching it fail 4 ways. It deliberately does not compare line by line; that first
attempt produced 79 false alarms, because a scaffold legitimately shares lines with
its solution.

Verified: reference now scores **10/10**, Submit reachable; `out/` contains none of
the solution's distinctive strings after a full `npm run build`.

### C2 — r9 rejected a bullet-list README → starter rewritten, then r9 relaxed

Decision: the two-part fix. Both halves are in.

- `lessons/1-3-19-*/README.md` is now four short headings and nothing else. Its
  longest run of prose is 10 characters, so it cannot satisfy the new pattern.
  The old starter's two long prose lines are gone — those were what made a
  regex-only relaxation a false-accept.
- r9 is now `(?:[\s\S]*?[A-Za-z][^\n.!?]{19,}(?:[.!?]|\n|$)){3}` — three answers,
  each ≥20 characters of running text, ended by `.` `!` `?` a line break, or end of
  file. The length floor is what keeps the starter's headings out. Title and
  description reworded to stop promising "sentences".
- `steps[3]` now says to answer the three headings, and **mentions the tax rate** —
  r10 requires it and s4 never said so, which was its own undiagnosable fail.

Verified against the compiled grader: untouched starter fails (LF *and* CRLF —
`\r` counts toward the run length), bullets pass, bullets with no trailing newline
pass, prose still passes, two answers still fail, bare headings still fail, r10
still satisfied.

### C3 — A1.3.2 does not exist → both docs corrected, not built

Decision: correct the docs; module 1.3 ships **two** assignments, A1.3.1 (1.3.19)
and A1.3.3 (1.3.21).

- `curriculum/modules/1.3_documentation-conventions.md`: the 1.3.5 row no longer
  claims A1.3.2, the "all three now exist" paragraph is replaced with what is
  actually true plus a note that `scripts/check-assignment-codes.mjs` cannot detect
  a missing code. Two adjacent errors in the same table fixed while there: the
  missing `1-3-20-video-names-are-for-readers` row (20 rows for 21 folders), and
  A1.3.3 placed at 1.3.20 when it is at 1.3.21.
- `curriculum-plan.md`: the A1.3.2 bullet is marked **NOT BUILT**, and the in-app
  paragraph now says 21 lessons, names the real assignment lesson ids, and drops
  the "all three exist" claim.

Not fixed, not verified by this session: the same table still calls the 1.3.1 slide
deck a placeholder. Section D says it is live; nobody re-checked.

## D. Also found, lower priority, no decision needed

- **`teacher-edit` blocks a push the API accepts.** `app/teacher-edit/page.tsx`'s
  `hasCommits = commits.length > 0` gate shows "Student hasn't saved any work yet on this
  lesson — cannot edit", but `functions/api/classes/[id]/students/[email]/commits`
  checks only `canManageClass` plus active enrollment. Probed directly: a first-ever
  teacher push to a never-opened lesson returns 201 with correct author stamping. Blocks
  pre-seeding starter code or pushing a correction ahead of a student.
- **No teacher undo for a teacher's own push.** `functions/api/commits/[id].ts` scopes
  DELETE to `student_email = data.email`. Push to the wrong student and there is no
  in-app remedy — cleanup required a raw D1 DELETE.
- **`/progress` is orphaned.** A 295-line student progress dashboard with zero inbound
  links anywhere in `app/`, `components/`, `lib/`. `scripts/check-reachable.mjs` does not
  cover it — worth adding a rule there, since that script exists for exactly this class
  of defect.
- **`TeacherOnly` is cosmetic on a static export.** `components/TeacherOnly.tsx` gates
  client-side, but `output: 'export'` ships the children in the page payload. An
  unauthenticated `curl http://localhost:8788/module/1.3/` returns the full teacher
  reference. Pedagogy prose only — real answer keys stay properly gated server-side by
  the role check in `functions/api/lesson-solution/[id].ts`.
- **Requirement feedback is color-only.** `components/RequirementCard.tsx` encodes
  pass/fail as border colour with no text or icon, and `lib/grader.ts:139` always sets
  `messages: []`, so the mechanism that could explain a failure is never populated. This
  is why the backtick trap is undiagnosable from the student's side.
- **Module doc drift**, `curriculum/modules/1.3_documentation-conventions.md`: the lesson
  table omits `1-3-20-video-names-are-for-readers` entirely (20 rows, 21 folders), line
  74 says A1.3.3 is at 1.3.20 when it is at 1.3.21, and the table calls the 1.3.1 slide
  deck "placeholder; no deck built yet" when it is live (162 KB, sends
  `Access-Control-Allow-Origin: *`, so the HEAD probe in `ContentLessonView.tsx:60`
  embeds it).
- **1.3.18 contradicts itself.** Its parenthetical calls `TAX_RATE`/UPPER_SNAKE_CASE
  "something you have not been taught yet" while citing 1.3.2 in the same sentence —
  taught 16 lessons earlier in the same module. Only `.toFixed(2)` is genuinely new.
- **Unexplained syntax in read-only demos is a course-wide convention, not a 1.3 bug.**
  1.3.3 shows `if/else` before 2.1.3 teaches it, but `lessons/1-1-14/content.md` already
  shows a `for` loop with `continue`. If this gets addressed, address it as a convention
  (label future syntax the way 1.3.7 does for the loop-counter `i`), not per-lesson.

## E. What is verified green

Routing is sound: all 510 lessons build on both `/lesson/` and `/assignment/` prefixes,
every static `href` resolves, nothing constructs a route prefix by hand, module 1.3
lists all 21 lessons in numeric order, and all nine quiz reread pointers resolve.
Sequential gating works client-side (`LessonAccessGate`) and server-side
(`functions/_shared/lessonAccess.ts:132`); teachers bypass both.

1.3.11 and 1.3.16 reference solutions score 7/7 and 6/6, both starters score zero, and
both accept correct-but-different work (`const`, single quotes, reversed operand order,
labelled `console.log`). The quiz boundary is exact: 6/9 fails, 7/9 passes and
auto-advances, retry works, no lockout. The AI grader is live and grading loosely as
intended. Teacher class management, gradebook, CSV export (real 14.7 KB download),
push author stamping, and lesson-mode persistence through the real route all pass.

Per-lesson teacher gates only render for `preview === 'reshape'` lessons
(`app/teacher/page.tsx:1433`) and no 1.3 lesson is jscad — so that gate cannot touch
this module. Not a defect; noted so "no gate row on 1.3.11" is not read as one.

## F. Environment left behind

- `wrangler pages dev` (:8788) and the Ollama stub (:8899) were started for the
  section G and H passes and **stopped again**. Nothing is listening on :8788,
  :8899 or :3002.
- **`.dev.vars` exists at repo root and contains a real Ollama key.** Gitignored, but it
  is on disk on this machine. `TEACHER_EMAILS=teacher.tester@shcode.local` was
  appended to it during the section G pass. Note `OLLAMA_HOST` in that file
  points at the local stub on :8899, NOT ollama.com — see section H.
- Local D1 now holds several throwaway accounts: `teacher.tester@`,
  `student.tester@`, and `student.walk@` / `walk2@` / `walk3@` / `walk4@`
  (all `@shcode.local`, password `TestPass123!`). **`student.walk4@` is the
  clean one** — 21/21 module 1.3 lessons, 6 submissions, 3 commits, nothing
  flagged `gradingFailed`. The walk2/walk3 accounts are half-finished runs
  from a stub that was returning the wrong criterion ids; delete them if the
  clutter matters.

## G. Browser pass, run after 0eb175a was pushed

`npx wrangler pages dev out --port 8788` against local D1 + R2, Playwright
(Python — it is not in `node_modules`). Accounts `teacher.tester@shcode.local`
and `student.tester@shcode.local`, both `TestPass123!`. `TEACHER_EMAILS` was
absent from `.dev.vars` and was added there (gitignored, local only) —
without it a signup cannot become a teacher and none of this is reachable.

**Verified green, 15 checks:**

- The multi-file solution works end to end. `/api/lesson-solution/<id>` returns
  `{ files, solution }` with both `script.js` and `README.md`; the dialog lists
  both paths and renders two code blocks; the button reads "Insert all files";
  after inserting, `script.js` holds the reference code **and `README.md` holds
  the reference prose**, which is the thing that was impossible before.
- **A1.3.1 reaches full marks in the browser.** All 10 requirement cards carry
  the Dracula-green border `rgb(80,250,123)` and **Submit is enabled** — it was
  disabled at 8/10 before. The relabelled r9 ("README answers all three
  prompts") renders correctly.
- **The commit regression is fixed for real.** Edit → reload → Commit now lands
  a row: `/api/commits` went 0 → 1 → 2 across two runs, and the stored commit
  lists `script.js` as changed. No console errors.

**Two things the browser pass could NOT establish, stated plainly:**

- **It ran as a teacher, not a student.** A fresh student account cannot open
  1.3.19 at all — sequential gating shows "Lesson locked · Finish the prior
  lessons in this module", which is working as designed. The commit path is
  client-side store logic and is not role-specific, so what is proven is the
  store + API path, not the student role. Walking a student through 21 lessons
  to unlock it was not done.
- `SolutionPanel`'s fallback to the older `{ solution }` response shape is still
  untested — nothing serves that shape any more.

### The phantom dirty file — FOUND HERE, FIXED HERE

**Symptom:** `Commit (1)` on a lesson nobody had touched. Measured on 1.3.11,
1.3.16 and 1.3.19, each from cleared `localStorage`. The two content maps
differed on `script.js` by line endings alone:

```
fileContents        len 547   '...Mystery Variables\n\n// Two working snippets...'
lastCommitted       len 566   '...Mystery Variables\r\n\r\n// Two working snippets...'
```

Lesson bundles are authored on Windows and ship CRLF. CodeMirror normalises its
document to LF and fires `onChange` on mount
(`components/CodeEditor.tsx:90-93`), so `updateFile` wrote the LF copy into
`fileContents` while `lastCommittedFileContents` kept the CRLF original. The
2-second autosave then persisted the mismatch, so it survived every later load.

**It was NOT caused by the `getChangedFiles` fix.** That same `onChange` also
calls `markDirty`, so `script.js` was in `dirtyFileIds` under the old code too
and the old comparison counted it identically. Pre-existing; simply never
looked at.

**Fix:** `normalizeEol` / `normalizeContents` in `lib/version-control.ts`,
applied at all seven points where file text enters the store
(`lib/store.ts`): the bundle in `loadLesson` and `resetLesson`, the saved
draft on both sides, `updateFile`, `initVC`, `restoreCommit`, and
`restoreVersion`. `\r\n` and a lone `\r` both collapse to `\n`.

Normalised on the way **in**, deliberately, not inside `getChangedFiles`:
fixing only the comparison would have hidden the counter while still writing
CRLF snapshots into `commits`, and would have left grader patterns like
`//[^\n]{6,}` counting the stray `\r` as a character — which is a real
off-by-one, since `// abcd\r` would have satisfied a six-character floor.

The saved-draft branch calls `normalizeContents` rather than trusting storage,
which repairs drafts written before this change.

**Verified in the browser** (`crlf_verify.py`, 14 checks): all three lessons
open with no pending change, their persisted maps are byte-identical, no `\r`
survives anywhere in the store, and they are still clean after a reload. The
fix does not over-reach — a typed edit still shows exactly 1, before and after
a reload. `browser_test2.py` (13) and `submit_probe.py` (2) re-run green
afterwards, so B1 and C1 did not regress.

### Prod state

Cloudflare Pages **auto-deploys `cs-3d` on push** — `0eb175a` was live on
`shcode.pages.dev` without anyone running `wrangler pages deploy`. Do not
assume a push is inert.

Verified live against the deployed pages, 26 checks: backtick classes on all
three labs, `{6,}` and `{19,}` on 1.3.19 with the old `{10,}` and the old r9
title gone, the new starter README in place, step 4 mentioning the tax rate,
and no reference answer or `solution/` path in any page.
`GET /api/lesson-solution/<id>` unauthenticated returns **401** with no answer
content, so the new `files` shape did not widen the gate.

The `normalizeEol` regex was later read directly out of the deployed chunk:
`744-56959d57aa512cac.js` contains `/\r\n?/g` and the chunk it replaced,
`744-2a7230ad886bd024.js`, does not. So the store fix is confirmed live, not
inferred.

Pages rebuilt ~200 seconds after the push, and exactly one chunk changed —
consistent with a store-only diff.

**Trap worth keeping:** the RSC payload is double-escaped in the page HTML, so
a naive `grep` for the backtick character class counts **zero** on a page that
plainly contains it. Unescape twice before asserting anything about a deployed
pattern; the first attempt here read as a failed deploy and was not one.

---

## H. Student walk, end to end — the last open item, now closed

Every earlier pass ran as a **teacher**, because sequential gating locks a fresh
student out of 1.3.19. That caveat is gone: a real student account walked all
**21 lessons of module 1.3 in order**, in a browser, against real Functions and
local D1. **36 checks, 0 failures.**

`scripts/`-external harness lives in the session scratchpad
(`student_walk.py`); it is not committed, because it depends on a local stub
and two throwaway accounts.

### What was actually done, per lesson type

| Type | Count | How it was completed |
| --- | --- | --- |
| slides / reading / example / video | 15 | scrolled, clicked **Mark as complete** |
| console lab | 3 | real answer typed in, Run, Submit |
| AI-graded writeup | 2 | prose answer, graded through `/api/grade-written` |
| quiz | 1 | 9 questions answered, **Check my answers** |

**Ground truth in D1** for `student.walk4@shcode.local`: `role=student`,
**21 completed**, **6 submissions**, **3 commits**, quiz scored 9, and **no row
carries `gradingFailed`**.

### What this proves that nothing before it did

- **The gate is real and it opens.** 1.3.19 returned "Lesson locked · Finish the
  prior lessons in this module" on a fresh account, and opened only after the 18
  lessons before it were completed.
- **The backtick fix works for a student.** Every lab answer was typed with
  template literals — the construct 1.2.13 teaches and all three labs used to
  reject. 1.3.11 scored 7/7, 1.3.16 6/6, 1.3.19 **10/10**. The stored commit
  snapshot contains `` let bookTitle = `The Hobbit`; `` verbatim.
- **C2 works for a student.** 1.3.19's README was answered as a **bullet list** —
  the format the old r9 rejected and the old starter itself modelled — and it
  passed.
- **The commit fix works for a student.** Three `commits` rows, one per lab,
  `authored_by_email` = the student. The defect that opened this whole review
  was a student finishing a lesson with **zero** commits.
- **No `\r` reached the store.** The gzipped snapshot is LF throughout.
- **The teacher can recover the prose half.** `lesson_submissions.response`
  holds `script.js` only, but the commit snapshot holds all four files including
  `README.md`.

### Two things that looked like defects and are not

- **A grader outage completes the lesson with no score.** Deliberate, and the
  reasoning is in `WrittenGrader.recordFailedAttempt`: green-to-advance gates on
  `lesson_state`, so a failed grade used to leave a whole class behind a locked
  door for an outage that is ours, not theirs. The row goes in scoreless and
  flagged `gradingFailed`, the student is told "your answer has been saved and
  sent to your teacher for marking", and it lands in the teacher's review queue.
  Worth knowing it exists, because it is why the FIRST walk showed 21/21 while
  two lessons had never been graded.
- **`GET /api/lesson-drafts/<id>` 404s** for a lesson with no saved draft. Normal.

### Traps this cost, all environmental

- **`.dev.vars` sets `OLLAMA_HOST=http://127.0.0.1:8899`** — a local stub from an
  earlier session, not ollama.com. With nothing on that port, `/api/grade-written`
  returns 502 and the outage path above fires. **A green walk means nothing about
  the AI lessons unless the stub is actually running.**
- A stub must echo the rubric's criterion **ids** back. `buildPrompt` serialises
  them as `- [the-id] (N pts) Title`, and `shapeResult` credits only an id that
  matches the rubric exactly. A stub that returns a fixed blob scores every item
  `missing` and reads as a failing student rather than a broken stub.
- **`pkill` does not work from Git Bash on this box.** A stale stub kept :8899 and
  the corrected one exited 1 on EADDRINUSE, so a fixed harness reproduced the old
  failure exactly. Free a port from PowerShell (`Get-NetTCPConnection -State
  Listen -LocalPort N` → `Stop-Process -Force`) and re-check it before rerunning.
- The **File** sidebar tab **toggles**; calling it twice in one lesson closes the
  explorer and README.md reads as unreachable. Requirement cards live behind
  **Quest** and are absent from the DOM until it is opened — a count taken
  without it reads a meaningless 0/0.
- Quiz options are markdown, so `` `i` `` renders without its backticks; match
  option text with backticks stripped. Answers are `input[type=radio]` — clicking
  the `<label>` does not check them. The button says **Check my answers**, not
  Submit.

# Handoff — 2026-08-23

Written for a session picking this repo up on a **different machine**. It covers what
shipped over 2026-08-21/22 across four parallel Claude sessions working in one tree,
what is verified, what is not, and the traps that each cost a real debugging cycle.

`CLAUDE.md` is the durable project manual — architecture, API surface, conventions.
This file is a point-in-time state report. When it goes stale, delete it.

---

## 1. Where the code is

| Branch | Role |
| --- | --- |
| `cs-3d` | **Production.** Cloudflare Pages deploys this branch. 358 commits ahead of `main`. |
| `main` | Stale. Last touched by PR #8. Do not deploy from it. |
| `shallot-ge` | **Parked, and a genuine name collision — read the note below.** |
| `cloudflare-deploy`, `codex/*` | Dead. |

`shallot-ge` last moved 2026-05-08 and diverged 170 `cs-3d` commits ago. It holds a
**different** Unit 3 — 79 lessons of 3D graphics (coordinates & transforms, shapes &
composition, OOP foundations) — where `cs-3d`'s Unit 3 is functions and arrays. Those
lessons are **not** merged and were never deployed.

The trap: both branches have a file at `public/moshion/moshion.js`, and they are
unrelated libraries. On `cs-3d` moSHion is a 2D physics facade over planck.js. On
`shallot-ge` it is a 3D facade over three.js. A diff between them is meaningless and
a merge would be a rewrite. Treat the branch as an unfinished proposal, not as work in
flight, and ask the operator before touching it.

Deploy is `npx wrangler pages deploy out --project-name shcode --branch cs-3d`, and it
**uploads the working tree**, not the commit you think you are shipping. Build from a
throwaway `git worktree` at the sha you mean to ship. That is not paranoia — it is how
the CRLF defect in §5 was found.

Production right now serves the full 2026-08-22 state: `moshion.js` with the Web Audio
`Sound` class, `/api/uploads` (401 unauthenticated, as designed), and the vendored
JSCAD runtime at `/reshape/lib/`.

## 2. What is green

`npm test` — exit 0, re-run 2026-08-23 on this tree. Real counts from that run:

```
  lesson numbers / assignment codes ....  ALL PASS
  diagram ..............................  ALL PASS
  due dates, quiz (14/91), grader (17) .  ALL PASS
  runner timeout, capstone (19/11) .....  ALL PASS
  moSHion  corpus 271/271   semantic 85/85  PASS
  uploads ..............................  56 checks
  JSCAD gate ...........................  248/248
  JSCAD docs ...........................  208 examples, 94/94 exports, 1 warning
```

The one warning is deliberate: `jscad-io.min.js` is hash-pinned but its upstream
identity is unestablished, because `@jscad/io` publishes no such file at any version.
The gate prints that on every run rather than hiding it.

`npx tsc --noEmit` — exit 0.

## 3. What shipped, by cluster

Four sessions were in this tree at once. Their commit bodies are unusually detailed and
are the real record — `git log --format='%B'` on any sha below repays the read.

**moSHion game API** (`23aae49 78af477 d7c3b16 6524706 6afaaa3`)
The reference API parity 19% → 69%; the engine went 807 → 2,723 lines. Added: key-name
normalisation, camera on/off + `sprite.screenSpace` HUDs, joints, text layout,
`world.explodeAt`, group ops, and a Web Audio `Sound` class. 85 behavioural checks
now exist where there were zero.

**Student image uploads** (`4747224 b81c02b`)
R2 for bytes, D1 `uploads` table for ownership and quota, magic-byte type sniffing
(never the client's header), and a deliberately **public** serve route at
`/uploads/<id>.<ext>`. Read the DIRECTIVE in `migrations/0015_uploads.sql` before
touching any of it.

**JSCAD runtime** (`9c99e80 9c05573 2ee51c9 7dcb2b9 6d59997`)
The unpkg-backed preview was replaced with a vendored, network-free runtime — what a
classroom behind a content filter needs. Docs went 24 → 208 runnable examples at 100%
export coverage, bundle provenance is verified byte-for-byte against unpkg rather than
asserted in a comment, and webkit now blames the student's own line in an error.

**Grader resilience and teacher views** (`b1e47f6 c755b63 c68a2a1 ce7fcbe 7f33028`)
The worst bug of the four: an Ollama outage during one class period silently destroyed
every written answer submitted in it. Submissions are now recorded on failure with a
`gradingFailed` marker, the student is unblocked without being awarded a score, and
"Needs Attention" surfaces the row instead of letting an outage hide a struggling
student.

**Preview sandboxing** (`72491a4`)
Both runners executed `?code=<base64>` on the app's own origin. A link sent to a
logged-in teacher was a same-origin `/api/*` call with a teacher session, and
`/api/classes/[id]/delete` cascades. Now sandboxed. See §5 for how this bites testing.

## 4. What does NOT arrive with a fresh clone

This is the part a new machine gets wrong. Everything below is git-ignored and simply
will not be there.

| Missing | Consequence and fix |
| --- | --- |
| `_workspace/**` (ignored by `*`) | **The moSHion design record is lost.** `_workspace/gauntlet/DECISIONS.md`, 873 lines, D1–D32, is local to the machine it was written on. §6 distils it; the rest is gone unless copied over by hand. |
| `.dev.vars` | Local `wrangler pages dev` has no auth. Recreate with `AUTH_SECRET`, `ADMIN_EMAILS`, `OLLAMA_API_KEY`, `OLLAMA_HOST`. |
| `.wrangler/` | No local D1 or R2 state; every local test account is gone. `wrangler d1 migrations apply shcode-commits --local`, then sign up again. |
| `functions/_shared/*.generated.ts` | Solutions and starters resolve to nothing. Any `npm run build` or `npm test` regenerates them via prebuild. |
| `graphify-out/` | `graphify explain` has no graph. `graphify extract --force`. |
| `.msgbox/` | Cross-CLI message log and file claims reset. Nothing to do; that is correct. |

Cold start:

```bash
npm install
npm run build                                          # also runs prebuild generators
npx wrangler d1 migrations apply shcode-commits --local
npx wrangler pages dev out --port 8788                 # real Functions, real local D1 + R2
npm test
```

Verified on Node v25.8.2 / npm 11.11.1.

## 5. Traps, each measured

**A fresh clone had a red gate where the same commit was green here.** `core.autocrlf=true`
rewrites LF on checkout. The JSCAD harness cut a shim out of `runner.html` by matching
`<script>\n`, matched zero blocks against `\r\n`, and took 218 checks down with it —
248/248 in one tree, 30/248 in a worktree beside it. Fixed by normalising on read, plus
`.gitattributes`. **On a new machine, run `npm test` before believing anything.**
(The moSHion gate was separately measured under CRLF and is unaffected — `164f3ef`
retracts an earlier guess that it might have the same exposure.)

**The preview runners refuse to run at top level, on purpose.** Navigating Playwright
straight to `runner.html?code=…` yields no canvas and no console output at all. That is
`72491a4` working, not a dead engine. Embed it in an iframe with
`sandbox="allow-scripts allow-downloads"`, the way the app does, and read the result by
screenshotting pixels.

**Do not add `allow-same-origin` to the sketch iframe to "fix" an image 401.** Its
absence is what stops student code calling `/api/*` with the session cookie, and it is
the entire reason the upload serve route is unauthenticated. A 128-bit unguessable id is
the access control there.

**Playwright is installed under Python (1.58), not node.** `require('playwright')` fails.
Use `python -c "from playwright.sync_api import sync_playwright"`. Pillow 12.1 is there
for reading pixels back out of a screenshot.

**`npm run dev` caches `lesson.json` in memory** (`lib/lessons.ts`, cached on first
request). Restart the dev server after editing a lesson before trusting a browser check.

**Never `git add -A` in this repo.** Parallel sessions edit this tree. Uncommitted does
not mean abandoned; it means someone else is mid-task. Check mtimes and stage explicit
paths. Blanket staging has swept another session's work into a commit twice.

**Run `wrangler d1 migrations list --remote` before applying.** The ledger drifted once
because migration files were hand-run with `d1 execute`, which does not write it. As of
2026-08-22 the ledger is current through 0015 and matches the data.

## 6. moSHion decisions worth keeping (distilled from the file that stays behind)

Deliberate divergences from the reference API. The gate prints all of them as `DELTAS`, and none of
them gate the build:

- **`overlaps()` is level-triggered**, not edge-triggered — a curriculum choice. The
  The reference API-faithful edge semantics live on `collides()` / `overlapping()` / `overlapped()`.
- **Named key properties return `pressing()`'s value**, not the reference API's raw signed counter,
  so `if (kb.space)` cannot double-fire on key-up.
- **Defaults differ**: density 1 (not 5), friction 0, bounciness 0, gravity (0, 9.8).
- **The direction alias is reference-counted** — releasing `d` while ArrowRight is still
  held keeps `'right'` alive. The reference API has this bug; moSHion does not.
- **`rotateTowards` always turns the short way.** the reference API's number form does not.

And the method that actually found the defects, which is the part worth inheriting:

- **The builder must not own the gate.** The checks lived in a file the builder could
  neither read nor edit. Five of twenty failed on delivery; three were real defects.
- **Prove a check bites** by deleting the behaviour and watching it go red. The gate
  once reported 59/59 PASS when it should have said 79 — a stray backtick broke the
  checks file and a `try/catch` swallowed the load error.
- **Watch for a test value where right and wrong look identical.** Named three times:
  `kb.pressing('a')` needs no normalisation, `rotateTowards(90)` sits inside the arc
  where both implementations agree, and an explosion above the 60 px/frame solver
  ceiling saturates and hides whether falloff exists at all.
- **Five throwaway game sketches found three defects that 80 unit-style checks had
  passed over** — including a shipped assignment whose `collider: 'none'` goal sprite
  fell to y=1588. Two further rounds found nothing, which is what rules out the reading
  that this method always turns something up.

## 7. Open

**The production `UPLOADS` R2 binding has never been proven.** `wrangler.toml` declares
it; whether Pages picked that up, or whether the dashboard binding is also required, was
not established. It cannot be checked from outside — a missing binding makes
`GET /uploads/<id>` return 404, identical to "no such image", and the only real tell is
`POST /api/uploads` returning 500 *"Uploads are not configured"*, which sits behind auth.

Cheapest check: sign in and upload one image through the editor's **Images** button.
Or look at Pages → shcode → Settings → Functions → R2 bucket bindings.

The whole flow — upload, serve, headers, refusal of HTML-renamed-to-PNG and of SVG,
quota, cross-student delete — **is** verified end to end against a local
`wrangler pages dev` with real local D1 and R2. Only the production binding is open.

**Signing up accounts against production is blocked by the auto-mode classifier**,
correctly. Do not route around it. Ask the operator to test the authenticated path by
hand, or to approve the run.
