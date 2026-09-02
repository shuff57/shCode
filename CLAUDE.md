# shCode — project notes for Claude

A Next.js 15 (app router, `output: 'export'`) classroom app for a JavaScript + moSHion
high-school CS course. Static site served from Cloudflare Pages; every `/api/*`
route is a Pages Function in `functions/`, backed by a single D1 database
(`shcode-commits`, binding `DB`).

> **Check `HANDOFF.md` at the repo root before starting work.** Nothing loads it
> automatically, so this line is the only pointer to it. It is a point-in-time state
> report — open questions, unapplied fixes, and traps that each cost a real debugging
> cycle. The top section is the most recent. When a section is stale or its decisions
> are made, delete that section; when the file is empty, delete the file and this note.

## JSCAD is retired. Do not build new modelling work on it.

**Decision, 2026-09-01.** JSCAD is the engine reSHape currently runs on and it
is the thing being replaced. It is not a target. Anything new that needs
geometry should be written so that the swap does not have to touch it.

This note exists because the tree does not say so on its own: `HANDOFF.md`
describes reSHape as "a plain-words surface over `@jscad/modeling`", the
vendored bundle sits in `public/reshape/lib/`, and 227 doc examples run against
it in `npm test`. Read only the code and you would reasonably conclude JSCAD is
the direction. It is not.

**It cannot simply be deleted.** Every preview goes through it, the whole
reference teaches its API, and removing it breaks the app. Retired here means
*no new dependence*, not *gone*.

### Where the line already falls

Measured 2026-09-01 across the 55 files that round of work touched:

| Layer | Couples to JSCAD? |
| --- | --- |
| `lib/least-squares.ts`, `lib/sketch-solve.ts`, `lib/sketch-arc.ts` | **no** -- zero mentions |
| `components/model/*` (Rules panel, handles, overlay) | **no** -- zero mentions |
| `lib/model-types.ts` (`ModelDoc`, the Feature kinds) | comments only |
| **`lib/model-codegen.ts`** | **yes -- 11 real call sites. This is the translation layer** |
| `public/reshape/reshape.js` + `public/reshape/lib/` | yes -- the shim and the bundle |
| `public/reshape/docs/reference.md` + its 227 examples | yes -- they teach JSCAD's API by name |

`ModelDoc` is the interface and it is already the right one. Everything above it
is first-party and portable; `model-codegen.ts` is the one file that turns a
document into engine calls. **Keep it that way.** A new feature that reaches
past `ModelDoc` into JSCAD directly is the thing this note is trying to prevent.

### What has already moved off it

The sketch solver. `lib/sketch-solve.ts` was relaxation and is now least
squares over `lib/least-squares.ts` -- first-party, MIT, no payload, and able to
express tangency, which relaxation could not. That is the pattern for the rest:
own the layer, keep `ModelDoc` as the seam.

### What has NOT moved, and why

A B-rep kernel was measured and refused on 2026-09-01: the only browser option
is OpenCascade at **21.9 MB and LGPL-2.1-only**, against **0.41 MB and MIT**
today, to lift 34 refused tools of which 28 are sheet metal and surfacing this
course does not want. Full reasoning is in `.gauntlet/parity.json` on all four
kernel-blocked refusal groups, and in `~/.claude/plans/reshape-fusion-parity.md`.
Retiring JSCAD does not mean OpenCascade is the answer.

## Runtime layout

- **Client** — React 19 (+ CodeMirror, Zustand, lucide-react). Builds to `out/` via
  `next build`. No server-side rendering at runtime; everything is static HTML +
  static-exported RSC chunks.
- **API** — Cloudflare Pages Functions under `functions/api/*`. Auto-routed from
  filename. Every `/api/*` path (except `/api/auth/*`) is gated by the auth
  middleware at `functions/_middleware.ts`.
- **DB** — Cloudflare D1 (SQLite). Bindings declared in `wrangler.toml`.
- **AI grader** — Ollama cloud via `functions/api/grade-written.ts` (reads
  `OLLAMA_API_KEY` secret).

## Role model

`students.role` is one of `'admin' | 'teacher' | 'student'`.

- **admin** — full power (promoted via `ADMIN_EMAILS` env allowlist at signup).
- **teacher** — can own classes, push commits to students' pools (promoted via
  `TEACHER_EMAILS` env allowlist, or manually via a DB update).
- **student** — default; can join classes by 6-char code.

Session JWT (HS256) carries `{email, role}`. Role is trusted from the JWT in
middleware/route handlers; the DB is the source of truth at login time.

## Environment variables / secrets

Set via `wrangler pages secret put ... --project-name shcode` (secrets) or the
Cloudflare dashboard env vars pane (plain vars):

| Name | Kind | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | secret | HS256 signing key for session JWTs |
| `OLLAMA_API_KEY` | secret | Bearer token for `https://ollama.com/api/chat` |
| `OLLAMA_HOST` | var (optional) | Override Ollama endpoint (defaults to `https://ollama.com`) |
| `ADMIN_EMAILS` | var | Comma-separated allowlist; matches at signup → `role='admin'` |
| `TEACHER_EMAILS` | var | Comma-separated allowlist; matches at signup → `role='teacher'` |
| `AI_HELP_DAILY_LIMIT` | var (optional) | Per-student per-unit daily quota for `POST /api/ai-help`; default `10`. Each unit gets its own bucket. Teachers/admins are exempt. |
| `GRADE_WRITTEN_DAILY_LIMIT` | var (optional) | Per-student daily submission cap for `POST /api/grade-written`; default `30`. Teachers/admins are exempt. A runaway-cost stop, not a pedagogical one — the course allows unlimited retries, so raise it rather than let a student hit it. |

## D1 schema

Applied in migration order. Every ALTER/CREATE uses `IF NOT EXISTS` so re-applies
are safe. Apply with `npx wrangler d1 migrations apply shcode-commits --remote`.

### Table highlights

- `enrollments`: composite PK `(class_id, student_email)` — a student can be in
  multiple classes across years. `expires_at` is an epoch-ms June-30 cutoff for
  auto-rollover. The Legacy class's enrollments use `expires_at = 4102444800000`
  (2100) so they never age out.
- `classes`: `code TEXT UNIQUE` is the 6-char join code generated from the safe
  alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789`.
- `commits.files_gz`: compressed JSON of the `fileContentsSnapshot`. Gzipping
  buys ~10× on student code.
- `commits.authored_by_email`: teacher email on teacher pushes; NULL or
  `student_email` for own commits.

## API surface

All under `/api/`, all JSON, all gated by the session cookie except `/api/auth/*`.
Paths follow filenames under `functions/api/`.

Non-obvious bits (the rest is filename-routed — `find functions/api -name "*.ts"`):

- There is no `PUT /api/lesson-state` and no per-lesson GET — read state from
  the bulk `GET /api/lesson-state`.
- `lesson-drafts` doubles as diagram storage (the serialized `DiagramDoc`);
  there is no diagram-specific table.
- Teacher pushes to a student's pool stamp `authored_by_email = session.email`
  server-side; clients cannot set it. Legacy NULLs coerce to `student_email`.
- `POST /api/ai-help` streams `text/plain`, trims code blocks to <=3 lines, and
  is quota'd per student **per unit** per UTC day (`AI_HELP_DAILY_LIMIT`).
- `POST /api/grade-written` takes **only** `lessonId` and `response` from the
  client. The rubric, prompt, model and contextDocs are read server-side from
  `public/ai-graders.json` (generated by `scripts/generate-ai-graders.mjs`,
  wired into `prebuild`), because the system prompt declares them to the model
  as trusted teacher context — a client-supplied rubric took an off-topic answer
  to full marks. The lookup **fails closed**. Adding a field here that the model
  is told to trust reopens that hole. Also quota'd per student per UTC day, in
  the shared `ai_help_usage` table under the `grade-written` bucket.
- Owner-only class routes: `archive`, `regenerate-code`, `delete` (cascades to
  progress data for students enrolled nowhere else), and co-teacher management.

### Image uploads
- `GET /api/uploads` — caller's images + quota (40 files / 20 MB, 2 MB each)
- `POST /api/uploads` — store one image. Raw body with `X-Filename`, or
  multipart. Content type is decided by a **magic-byte sniff**, never the
  client's header; PNG/JPEG/GIF/WebP only. SVG is refused — it is a document
  and can carry script.
- `DELETE /api/uploads/[id]` — owner or admin. Ownership is in the SQL
  `WHERE`, and a missing id and someone else's id both 404 so ids can't be probed.
- `GET /uploads/[id].[ext]` — **public, no auth**, deliberately outside `/api/`.

  It has to be. The sketch iframe (`components/MoshionPreview.tsx`) is
  sandboxed *without* `allow-same-origin` so student code can't call the API
  as the student — which makes it an opaque origin, so the `SameSite=Lax`
  session cookie is never sent and an auth-gated image would 401 inside every
  sketch. The 128-bit random id is therefore the access control: unlisted and
  unguessable, but anyone with the link can view it.

  **Do not add `allow-same-origin` to that iframe to "fix" this.** Two things
  in the serve route are load-bearing: `Content-Type` comes from R2's stored
  metadata (set from the sniff), and `X-Content-Type-Options: nosniff`.
  Without both, a crafted file could be served as HTML from our origin.

  `scripts/test-uploads.mjs` covers the sniffer against renamed HTML, SVG,
  polyglots and near-miss signatures; it runs in `npm test`.

## Build + deploy

```bash
# Local dev (Next dev server + Pages Functions emulated)
npm run dev            # port 3002

# Prod build + deploy
npm run build                                                   # static export to ./out
npx wrangler pages deploy out --project-name shcode --branch cs-3d

# D1 migrations
npx wrangler d1 migrations apply shcode-commits --remote        # prod
npx wrangler d1 migrations apply shcode-commits --local         # local dev DB

# R2 bucket for image uploads — ONE TIME, before uploads will work at all.
# Without it POST /api/uploads returns 500 "Uploads are not configured".
npx wrangler r2 bucket create shcode-uploads
# ...then add the binding in the dashboard too: Pages project -> Settings ->
# Functions -> R2 bucket bindings -> binding name "UPLOADS". wrangler.toml
# alone covers local dev; production reads the dashboard binding.
```

## Static-export gotcha

`next.config.js` has `output: 'export'` + `trailingSlash: true`. Dynamic route
segments need `generateStaticParams()` at build time. For runtime-only IDs
(classes, per-student views), use **query-string routing** on a single static
page — e.g. `/teacher?class=<id>`, `/teacher-edit?class=X&student=Y&lesson=Z`.

## Flowchart diagrams

A `DiagramDoc` (`{nodes, edges}`, `lib/diagram-types.ts`) is the canonical form;
Mermaid is a projection of it, so authors never hand-write JSON.

Eight shapes: `terminal`, `process`, `decision`, `io` (the starter set the
palette shows), plus `subroutine`, `preparation`, `connector`, `comment`
behind **+ more shapes**. The Mermaid each maps to, the ```flow fence for
readings and slides, and the `preview: "diagram"` assignment format are in
`.claude/skills/flowchart-diagrams/SKILL.md`.

Two of those are not ordinary flow nodes, and `lib/diagram-check.ts` collapses
the graph before any rule runs: a `comment` is dropped entirely (otherwise it
reads as a floating shape and a second start), and `connector`s sharing a
label merge into one logical node (otherwise the shape after a jump is
reported unreachable). Offenders are expanded back to real node ids so
highlighting still lands on the canvas.

Routing note: `routeEdge` in `DiagramEditor.tsx` auto-picks which side an arrow
attaches to, but **only for edges with no stored handles** (Mermaid starters,
spliced edges). An arrow the student attached keeps the sides they chose —
do not "tidy" those.

The auto-routing convention, which is what keeps arrows from crossing:

| Arrow | Leaves on |
| --- | --- |
| the ordinary next step | bottom → top |
| a second way out of a branching shape (`no`, "leave the loop") | the side it leans toward |
| a loop's return arrow | the **left**, always — the right belongs to the branch exit |
| a bypass around an intervening shape | the right |

A shape with only **one** way out never takes a side exit, even when its target
sits well off to the side: the horizontal run would cut through whatever shape
is between them and read as a connection that isn't there.

`layout()` in `lib/diagram-mermaid.ts` is the other half. It puts each shape in
its first parent's column, so a straight run falls in one line and a decision's
*first-written* answer carries straight down while the second shifts right —
which is what gives `routeEdge` a side to route to. Back edges get no vote on
either rank or column; before that fix, a loop's return arrow dragged its own
body to the bottom of the canvas and the chart appeared to run upward.

## Ollama grader

The essay grader at `POST /api/grade-written` calls `https://ollama.com/api/chat`
with `Authorization: Bearer $OLLAMA_API_KEY`. Model comes from the lesson's
`aiGrader.model` field (e.g. `deepseek-v4-flash:0731-cloud`). The key lives server-side
only — never exposed to the client.

## Reference solutions

Two authoring forms, both admin/teacher-only, both served by
`GET /api/lesson-solution/[id]` as `{ files, solution }`:

| Form | When | Recorded as |
| --- | --- | --- |
| `lessons/<id>/solution.js` | the assignment only grades `script.js` | `{ "script.js": ... }` |
| `lessons/<id>/solution/` | the assignment grades more than one file | every file, keyed by path relative to `solution/` |

A lesson with both fails the build — two copies of an answer drift. The
directory form exists because A1.3.1 (`1-3-19`) grades `README.md` as well as
`script.js`, so a script-only reference scored 8/10 and Submit could never be
demonstrated.

**Adding a new exclusion is the dangerous part.** `lib/lessons.ts` and
`scripts/generate-lesson-starters.mjs` both walk the lesson tree *recursively*
and ship what they find to students. A `solution/` directory is kept out of
their output only by being skipped by name. `scripts/check-solution-leak.mjs`
(in `prebuild` and `npm test`) measures that it stays out — if you add another
private folder convention, teach that script about it too.

## Conventions

- Pages Functions: export `onRequestGet`/`onRequestPost`/`onRequestDelete`, use
  the `EventContext<Env, 'param', SessionData>` shape from `@cloudflare/workers-types`.
- Auth helper imports: always from `functions/_shared/auth.ts` (password hashing,
  JWT signing/verifying, `normalizeEmail`, role allowlists).
- URL path params with `@` or other non-alphanum characters: ALWAYS
  `decodeURIComponent` + `normalizeEmail` before using them. Pages doesn't
  auto-decode.
- Inline style convention for components, using the Dracula palette defined in
  `app/globals.css`. See `components/AuthButton.tsx`, `app/teacher/page.tsx` for
  the established look.
- **Before assuming an authored `lesson.json` field reaches a student, check that
  something imports the component that would render it.** `graphify explain
  <Symbol>` prints the import/call edges and answers that in one shot; plain
  `graphify query` is much weaker, so reach for `explain`. The graph under
  `graphify-out/` is a point-in-time snapshot — run `graphify extract --force` if
  it predates the code you are asking about. This is not hypothetical: `steps`
  and `aiGrader.prompt` both sat in `lesson.json` for months with no live
  renderer. Both are wired up now — `steps` through `components/LessonSteps.tsx`,
  mounted by `LessonWorkspace`, and `aiGrader.prompt` through
  `ContentLessonView` and `DiagramAssignmentView` — so check the current graph
  rather than trusting this sentence for the answer about any other field.
