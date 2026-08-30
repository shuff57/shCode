// Shared types and pure helpers for issue reports. No D1 import here — this
// is where the privacy rule that turns a staff row into what a student may
// see lives, so it can be tested without a server (scripts/test-issue-votes.mjs).
// functions/api/issue-reports/* imports ReportRow from here rather than
// redeclaring it, so the two can never drift apart.

export interface ReportRow {
  id: number;
  reporter_email: string;
  kind: 'bug' | 'quirk' | 'enhancement';
  /** NULL only for reports filed before migration 0020 added the column. */
  title: string | null;
  message: string;
  status: 'open' | 'in-progress' | 'fixed' | 'deferred';
  triaged_by: string | null;
  triaged_at: number | null;
  context_json: string | null;
  screenshot_id: string | null;
  /** 1 once staff has opted the attached screenshot into student visibility,
   *  0 (the default) otherwise. See publicReport() for why this gates
   *  screenshot_id rather than the presence of screenshot_id alone. */
  screenshot_shared: number;
  /** Set by the reporter (or staff) withdrawing the report from the public
   *  queue; NULL means it is still visible. Staff keep seeing it either way. */
  withdrawn_at: number | null;
  created_at: number;
}

export interface VoteTally {
  up: number;
  down: number;
  myVote: -1 | 0 | 1;
}

/**
 * What a student may receive for one report. No `reporter_email`, no
 * `triaged_by`/`triaged_at`, and no raw `context_json` — that column also
 * carries a snapshot of the REPORTER's own code (see captureContext() in
 * components/ReportIssueButton.tsx), which is not this viewer's to read.
 */
export interface PublicReport {
  id: number;
  kind: ReportRow['kind'];
  title: string | null;
  message: string;
  status: ReportRow['status'];
  created_at: number;
  screenshot_id: string | null;
  up: number;
  down: number;
  score: number;
  myVote: -1 | 0 | 1;
  context: PublicContext | null;
  /** True when this viewer is the reporter. The only use of
   *  reporter_email anywhere in this module -- it never appears as a key. */
  mine: boolean;
  withdrawn: boolean;
}

export interface PublicContext {
  path?: string;
  lessonId?: string;
}

/**
 * Strip everything that identifies the reporter or a triager. Built by
 * naming each allowed field, never by spreading `row` and deleting a few —
 * a later migration that adds a column to `issue_reports` would otherwise
 * start leaking it to every student silently the moment it lands.
 *
 * `viewerEmail` is used exactly once, to compute `mine` — it never appears
 * anywhere in the returned object as `reporter_email` or otherwise. Passing
 * the viewer's own email into a "public" function reads like it could leak
 * it right back in, so keep that scoped to this one comparison if you touch
 * this function.
 */
export function publicReport(row: ReportRow, tally: VoteTally, viewerEmail: string): PublicReport {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    message: row.message,
    status: row.status,
    created_at: row.created_at,
    // Screenshots are staff opt-in: functions/uploads/[name].ts is
    // deliberately unauthenticated, so screenshot_id is the whole access
    // control for the image. Handing it out before screenshot_shared is set
    // publishes it to the entire internet, permanently.
    screenshot_id: row.screenshot_shared === 1 ? row.screenshot_id : null,
    up: tally.up,
    down: tally.down,
    score: tally.up - tally.down,
    myVote: tally.myVote,
    context: publicContext(row.context_json),
    mine: row.reporter_email === viewerEmail,
    withdrawn: row.withdrawn_at !== null,
  };
}

/**
 * Whether a student should see this row at all. A withdrawn report is
 * pulled from the public queue by its author -- staff still see it via the
 * unfiltered staff path in GET /api/issue-reports -- but the author needs it
 * to keep rendering for themselves, or Restore would have nothing to act on.
 */
export function visibleToStudent(row: ReportRow, viewerEmail: string): boolean {
  if (row.withdrawn_at === null) return true;
  return row.reporter_email === viewerEmail;
}

/**
 * Fold raw vote rows into a per-report tally. Moved out of
 * functions/api/issue-reports/index.ts so it can be unit tested directly --
 * `voter_email === viewerEmail` is the one line that decides whose vote is
 * "mine", and nothing exercised it before.
 *
 * Only report ids that appear in `voteRows` get an entry; a report with no
 * votes at all has none. Callers fall back to a zero tally for a missing id.
 */
export function tallyVotes(
  voteRows: { report_id: number; voter_email: string; vote: number }[],
  viewerEmail: string,
): Map<number, VoteTally> {
  const tallies = new Map<number, VoteTally>();
  for (const v of voteRows) {
    let t = tallies.get(v.report_id);
    if (!t) {
      t = { up: 0, down: 0, myVote: 0 };
      tallies.set(v.report_id, t);
    }
    if (v.vote === 1) t.up += 1;
    else if (v.vote === -1) t.down += 1;
    if (v.voter_email === viewerEmail) t.myVote = v.vote === 1 ? 1 : -1;
  }
  return tallies;
}

/**
 * Only `path` and `lessonId` survive out of the auto-captured context —
 * everything else (`currentFileContent`, `userAgent`, `url`, ...) is either
 * the reporter's own code or otherwise not another student's business.
 * Never throws: a malformed or unparsable `context_json` just yields null.
 */
function publicContext(raw: string | null): PublicContext | null {
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const c = parsed as Record<string, unknown>;
  const out: PublicContext = {};
  // `path` is client-supplied and stored verbatim, and app/issues/page.tsx
  // renders it as a Link -- an off-site or javascript: URL here would put a
  // hostile link in front of every student reading the queue. Keep the
  // resolved path rather than the raw string, so what is stored and what was
  // checked cannot differ.
  if (typeof c.path === 'string') {
    const safe = sameSitePath(c.path);
    if (safe !== null) out.path = safe;
  }
  if (typeof c.lessonId === 'string') out.lessonId = c.lessonId;
  return Object.keys(out).length ? out : null;
}

/**
 * Resolve `candidate` against a fixed origin and keep it only if it lands back
 * on that origin. Returns the normalised path, or null.
 *
 * This deliberately does NOT test the string. The previous version did —
 * `startsWith('/') && !startsWith('//')` — and it was bypassable: a browser
 * normalises a backslash to a forward slash while resolving, so `/\evil.example`
 * passed that test and loaded https://evil.example. Enumerating the tricks is
 * the losing side of that game; asking the URL parser where a link actually
 * goes is the winning one, and it costs the same.
 */
function sameSitePath(candidate: string): string | null {
  let url: URL;
  try {
    url = new URL(candidate, SAME_SITE_BASE);
  } catch {
    return null;
  }
  if (url.origin !== SAME_SITE_BASE) return null;
  return url.pathname + url.search + url.hash;
}

/** Any fixed origin works — only the round-trip comparison matters. */
const SAME_SITE_BASE = 'https://shcode.invalid';

/**
 * Worst first: highest score first, ties broken newest-first. Returns a new
 * array — callers relying on the original row order (staff, chronological
 * triage) are unaffected because they never call this.
 */
export function rankReports<T extends { score: number; created_at: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => b.score - a.score || b.created_at - a.created_at);
}
