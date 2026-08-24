# Handoff — 2026-08-24 · Module 1.3 review, three decisions pending

Module 1.3 (Documentation and Coding Conventions, 21 lessons) was reviewed end to end
on 2026-08-24: static audit of every lesson and all routing, plus two browser passes —
one walking the module as a student, one exercising the teacher surfaces. **Nothing was
fixed.** Three fixes are verified and ready to apply; three questions need an operator
decision first. This section exists so that decision can be made in a new session
without redoing the work.

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

## B. Findings that are settled — no decision needed, just fixes

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

## C. The three decisions

### C1 — 1.3.19 has no full-credit reference path

`components/LessonWorkspace.tsx:781` hardcodes the solution insert to
`updateFile('script.js', code)`, and the solution mechanism itself is single-file:
`scripts/generate-solutions.mjs` reads only `lessons/<id>/solution.js`, and
`functions/api/lesson-solution/[id].ts` serves only that string. But r9 and r10 grade
`README.md`. So the reference answer scores **8/10**, Submit stays disabled, and there
is no way to demonstrate a passing submission of the module's main graded assignment
(A1.3.1). Browser-confirmed as a teacher.

This does not hurt students — they write their own README, and the student walkthrough
completed the lesson normally. It hurts the teacher, and it means the assignment has no
worked answer.

| Option | Cost | Consequence |
| --- | --- | --- |
| Append the model README to `solution.js` as a trailing `/* */` block | one edit, zero new machinery | Teacher can read and paste it. Submit still blocked until they paste. Grading-neutral: r8 counts `//` only, r6/r7 strip comments — but **re-run the offline harness to confirm**. |
| Extend the solution mechanism to a `solution/` directory | touches generator, Function, and `SolutionPanel`'s `onInsert` | Correct fix, benefits every future multi-file assignment. Real work. |
| Drop r9/r10 to advisory | one edit | Guts the README requirement, which is the point of A1.3.1 and of 1.3.18. Do not pick this without deciding the README no longer matters. |

Recommendation: option 1 now, option 2 when another multi-file assignment appears.

### C2 — r9 rejects a bullet-list README, and the regex cannot be fixed alone

`1-3-19` r9 requires three `[.!?]`-terminated sentences. A student who answers in
bullets — which is what the **shipped starter README models**, since it presents its
three prompts as a bullet list — fails.

**A regex-only relaxation is a regression, and this was tested, not assumed.** Accepting
line-terminated bullets makes the *untouched starter README* start passing r9, because
the starter contains two long prose lines ("Replace everything below with at least three
sentences of plain English" and "Delete these prompts when you write your answer") that
satisfy any line-based check. That trades a false rejection for a false acceptance,
which is worse.

The fix has to be two-part: **rewrite the starter README so it contains no long prose
lines and does not model bullets, then relax r9.** That changes what students are asked
to produce on a graded assignment, so it is a curriculum call, not a build one. Whoever
takes it must re-run the offline harness with the untouched starter as a must-fail case.

### C3 — A1.3.2 does not exist

`curriculum/modules/1.3_documentation-conventions.md:57` lists `1-3-5-why-documentation`
as an assignment carrying **A1.3.2**, and line 74 states all three of the plan's
assignments now exist. `curriculum-plan.md:271,279` says the same. They are wrong:
`lessons/1-3-5-why-documentation/lesson.json` is `type: lesson`, `preview: reading`, no
`aiGrader`, no `requirements`, no `assignmentCode`. A repo-wide sweep of
`assignmentCode` finds A1.3.1 and A1.3.3 only.

`curriculum-plan.md:271` specifies what it should be: *"1 paragraph: why does
documentation matter in professional software development? Use one specific example."*
The reading at 1.3.5 already teaches exactly that, including the six-months-later story
that would serve as the specific example.

Either **build it** — an AI-graded writeup modelled on 1.3.12/1.3.17, which are working
well (a weak plain-words beginner answer scored 4/4 on both) — or **correct both docs**
to admit only two of the three assignments exist. Do not leave the docs claiming a
lesson that isn't there; that is what made this take an afternoon to notice.

Note `scripts/check-assignment-codes.mjs` validates codes that exist and cannot detect a
missing one. If A1.3.2 gets built, that gap stays open for the next module.

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

Per-lesson teacher gates only render for `preview === 'jscad'` lessons
(`app/teacher/page.tsx:1433`) and no 1.3 lesson is jscad — so that gate cannot touch
this module. Not a defect; noted so "no gate row on 1.3.11" is not read as one.

## F. Environment left behind

- `wrangler pages dev` may still be serving on **:8788**. The Express dev server on
  **:3002 was stopped** to get a clean build and was not restarted.
- **`.dev.vars` exists at repo root and contains a real Ollama key.** Gitignored, but it
  is on disk on this machine.
- Local D1 holds the two test accounts, one class, and the student walkthrough's
  progress and submissions. A probe commit pushed into 1.3.19 during the teacher pass
  was deleted; `commits` holds only 1.3.16's two rows.

---

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

The trap: both branches have a file at `public/shplay/shplay.js`, and they are
unrelated libraries. On `cs-3d` shPlay is a 2D physics facade over planck.js. On
`shallot-ge` it is a 3D facade over three.js. A diff between them is meaningless and
a merge would be a rewrite. Treat the branch as an unfinished proposal, not as work in
flight, and ask the operator before touching it.

Deploy is `npx wrangler pages deploy out --project-name shcode --branch cs-3d`, and it
**uploads the working tree**, not the commit you think you are shipping. Build from a
throwaway `git worktree` at the sha you mean to ship. That is not paranoia — it is how
the CRLF defect in §5 was found.

Production right now serves the full 2026-08-22 state: `shplay.js` with the Web Audio
`Sound` class, `/api/uploads` (401 unauthenticated, as designed), and the vendored
JSCAD runtime at `/jscad/lib/`.

## 2. What is green

`npm test` — exit 0, re-run 2026-08-23 on this tree. Real counts from that run:

```
  lesson numbers / assignment codes ....  ALL PASS
  diagram ..............................  ALL PASS
  due dates, quiz (14/91), grader (17) .  ALL PASS
  runner timeout, capstone (19/11) .....  ALL PASS
  shPlay  corpus 271/271   semantic 85/85  PASS
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

**shPlay game API** (`23aae49 78af477 d7c3b16 6524706 6afaaa3`)
q5play parity 19% → 69%; the engine went 807 → 2,723 lines. Added: key-name
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
| `_workspace/**` (ignored by `*`) | **The shPlay design record is lost.** `_workspace/gauntlet/DECISIONS.md`, 873 lines, D1–D32, is local to the machine it was written on. §6 distils it; the rest is gone unless copied over by hand. |
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
(The shPlay gate was separately measured under CRLF and is unaffected — `164f3ef`
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

## 6. shPlay decisions worth keeping (distilled from the file that stays behind)

Deliberate divergences from q5play. The gate prints all of them as `DELTAS`, and none of
them gate the build:

- **`overlaps()` is level-triggered**, not edge-triggered — a curriculum choice. The
  q5play-faithful edge semantics live on `collides()` / `overlapping()` / `overlapped()`.
- **Named key properties return `pressing()`'s value**, not q5play's raw signed counter,
  so `if (kb.space)` cannot double-fire on key-up.
- **Defaults differ**: density 1 (not 5), friction 0, bounciness 0, gravity (0, 9.8).
- **The direction alias is reference-counted** — releasing `d` while ArrowRight is still
  held keeps `'right'` alive. q5play has this bug; shPlay does not.
- **`rotateTowards` always turns the short way.** q5play's number form does not.

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
