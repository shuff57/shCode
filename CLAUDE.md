# shCode — project notes for Claude

A Next.js 15 (app router, `output: 'export'`) classroom app for a JavaScript + shplay
high-school CS course. Static site served from Cloudflare Pages; every `/api/*`
route is a Pages Function in `functions/`, backed by a single D1 database
(`shcode-commits`, binding `DB`).

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
- `GET/PUT/DELETE /api/lesson-state/[lessonId]`
- `POST /api/grade-written` — Ollama-backed essay grader
- `POST /api/ai-help` — streaming Socratic-tutor help; pulls keyword-matched shplay docs into the prompt. Per-student per-unit daily quota (`AI_HELP_DAILY_LIMIT`, default 10); teachers/admins exempt. Output is streamed `text/plain` with code blocks trimmed to ≤3 lines so a successful jailbreak still can't deliver a copy-pasteable solution. `X-RateLimit-Limit` / `X-RateLimit-Remaining` headers expose remaining quota.

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
```

## Static-export gotcha

`next.config.js` has `output: 'export'` + `trailingSlash: true`. Dynamic route
segments need `generateStaticParams()` at build time. For runtime-only IDs
(classes, per-student views), use **query-string routing** on a single static
page — e.g. `/teacher?class=<id>`, `/teacher-edit?class=X&student=Y&lesson=Z`.

## Ollama grader

The essay grader at `POST /api/grade-written` calls `https://ollama.com/api/chat`
with `Authorization: Bearer $OLLAMA_API_KEY`. Model comes from the lesson's
`aiGrader.model` field (e.g. `qwen3-coder-next:cloud`). The key lives server-side
only — never exposed to the client.

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
