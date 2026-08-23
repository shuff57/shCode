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
