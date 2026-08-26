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

## D1 schema

Applied in migration order. Every ALTER/CREATE uses `IF NOT EXISTS` so re-applies
are safe. Apply with `npx wrangler d1 migrations apply shcode-commits --remote`.

| # | File | What it adds |
| --- | --- | --- |
| 0001 | `commits.sql` | `commits` table — per-student lesson snapshots |
| 0002 | `students.sql` | `students` table — email + password_hash + created_at |
| 0003 | `add_role_to_students.sql` | `students.role TEXT DEFAULT 'student'` |
| 0004 | `lesson_state.sql` | `lesson_state` — per-student lesson progress (`started` / `completed`) |
| 0005 | `lesson_drafts_submissions.sql` | `lesson_drafts` + `lesson_submissions` — free-response autosave + grade history |
| 0006 | `classes_and_enrollments.sql` | `classes` + `enrollments` + `class_teachers`; seeds a Legacy class + bulk-enrolls pre-existing students |
| 0007 | `gzip_commits_files.sql` | Adds `commits.files_gz BLOB`, makes `files_json` nullable. New rows write gzipped snapshots via `CompressionStream`; read path prefers `files_gz`, falls back to `files_json` for legacy rows |
| 0008 | `commit_author.sql` | `commits.authored_by_email TEXT` (nullable). Lets students distinguish teacher pushes from their own commits. Legacy NULLs coerce to `student_email` on read |
| 0009 | `ai_help_usage.sql` | `ai_help_usage` — per-student per-unit per-UTC-day request counter for `POST /api/ai-help` rate limiting |
| 0015 | `uploads.sql` | `uploads` — ownership + quota ledger for student image uploads. Bytes live in R2 (binding `UPLOADS`), never in D1 |

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

### Auth
- `POST /api/auth/signup` — creates account, role assigned by allowlist
- `POST /api/auth/login`  — returns session cookie
- `POST /api/auth/logout`
- `GET  /api/me` — current user

### Lesson state + grader
- `GET /api/lesson-state` — bulk per-student
- `POST/DELETE /api/lesson-state/[lessonId]` — POST body `{state:'started'|'completed', score?}`.
  There is no PUT and no per-lesson GET; read state from the bulk endpoint above.
- `GET/POST/DELETE /api/lesson-drafts/[lessonId]` — latest-draft-per-lesson autosave.
  POST body `{response}`. Used by the written grader and by diagram lessons,
  which store the serialized diagram here.
- `GET /api/lesson-submissions?lessonId=X` — append-only submit history for the caller
- `POST /api/grade-written` — Ollama-backed essay grader. Text in, rubric out;
  diagram lessons send Mermaid plus a prose walk of the graph as the `response`.
- `POST /api/ai-help` — streaming Socratic-tutor help; pulls keyword-matched moSHion docs into the prompt. Per-student per-unit daily quota (`AI_HELP_DAILY_LIMIT`, default 10); teachers/admins exempt. Output is streamed `text/plain` with code blocks trimmed to ≤3 lines so a successful jailbreak still can't deliver a copy-pasteable solution. `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers expose remaining quota.

### Commits (student's own)
- `GET  /api/commits?lessonId=X` — own history
- `POST /api/commits` — commit own work (gzipped + author-stamped)
- `GET/DELETE /api/commits/[id]`

### Classes
- `GET/POST /api/classes`
- `GET /api/classes/[id]` — detail + roster + co-teachers
- `POST /api/classes/[id]/archive` — owner-only toggle
- `POST /api/classes/[id]/regenerate-code` — owner-only rotate
- `POST /api/classes/[id]/delete` — owner-only; cascades to progress data for
  students whose only enrollment was in this class
- `POST /api/classes/[id]/enrollments` + `DELETE /api/classes/[id]/enrollments/[email]`
- `POST /api/classes/[id]/teachers` + `DELETE /api/classes/[id]/teachers/[email]`
  — owner-only co-teacher management

### Class progress (teacher-only)
- `GET /api/classes/[id]/progress` — per-student roster counters
- `GET /api/classes/[id]/students/[email]` — per-lesson state + latest submission
- `GET /api/classes/[id]/gradebook` — full matrix for CSV export

### Teacher pushes (into a student's commit pool)
- `GET/POST /api/classes/[id]/students/[email]/commits` — view/push commits on
  behalf of a student. Server stamps `authored_by_email = session.email`.

### Student-facing
- `POST /api/join-class` — join by 6-char code
- `GET  /api/my-enrollments` — active classes for the caller

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

Eight shapes, and the Mermaid each maps to. The first four are the starter set
— the book's three (`terminal`, `process`, `decision`; Table 1.5.2) plus `io`,
which is shCode's own — and the only ones the palette shows until a student
presses **+ more shapes**:

| Shape | Mermaid | For |
| --- | --- | --- |
| `terminal` | `A([Start])` | start / end |
| `process` | `A[do it]` | a task |
| `decision` | `A{age < 13}` | yes/no branch |
| `io` | `A[/print x/]` | input / output |
| `subroutine` | `A[[drawScore()]]` | function call — module 3.1 |
| `preparation` | `A{{i = 0 to 9}}` | loop setup — module 2.2 |
| `connector` | `A((A))` | a jump; same label = same point |
| `comment` | `A>a note]` | annotation, outside the flow |

Two of those are not ordinary flow nodes, and `lib/diagram-check.ts` collapses
the graph before any rule runs: a `comment` is dropped entirely (otherwise it
reads as a floating shape and a second start), and `connector`s sharing a
label merge into one logical node (otherwise the shape after a jump is
reported unreachable). Offenders are expanded back to real node ids so
highlighting still lands on the canvas.

**In a reading or slides `content.md`** — a fence beside the existing
```` ```js live ````:

````
```flow readonly caption="Figure 2.2.1 — the largest-of-three algorithm"
flowchart TD
  A([Start]) --> B[get the age]
  B --> C{age >= 18}
  C -- yes --> D[/print "You may vote"/]
  C -- no --> E[print Too young]
```
````

`readonly` renders a figure; without it the student gets a scratch canvas whose
rearrangement persists per block. `height=520` pins the frame, otherwise it is
sized to the diagram.

**As an assignment** — `preview: "diagram"` plus a `diagram` block in
`lesson.json`: `starter` (Mermaid), `rules` (structural checks, see
`lib/diagram-check.ts`; omit for `DEFAULT_RULES`), and an optional `aiGrader`
with the same rubric shape the written grader uses. See
`lessons/2-2-12-a5-2-flowchart-decision/`.

Grading is two-stage and the order matters: the structural rules run in the
browser and **gate** the Ollama call, so a model call is never spent on a
diagram with a floating box in it. The submission stores the diagram JSON in
`lesson_drafts` / `lesson_submissions` — no diagram-specific table.

`npm test` runs `scripts/test-diagram.mjs` over the parser and the rules.

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
`aiGrader.model` field (e.g. `qwen3-coder-next:cloud`). The key lives server-side
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
  renderer.
