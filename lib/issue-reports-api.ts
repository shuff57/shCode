// Client wrappers for the issue-report endpoints. Same-origin; the session
// cookie rides along automatically.

export type IssueKind = 'bug' | 'quirk' | 'enhancement';
export type IssueStatus = 'open' | 'in-progress' | 'fixed' | 'deferred';

export interface IssueReport {
  id: number;
  /** Staff only — GET /api/issue-reports omits this for a student caller. */
  reporter_email?: string;
  kind: IssueKind;
  /** One-line summary. NULL only for reports filed before migration 0020. */
  title: string | null;
  message: string;
  status: IssueStatus;
  /** Staff only, like reporter_email. */
  triaged_by?: string | null;
  triaged_at?: number | null;
  /** Staff only — students get the derived `withdrawn` boolean instead. */
  withdrawn_at?: number | null;
  created_at: number;
  /** Full auto-captured context for staff; only {path, lessonId} for a
   *  student caller — see publicReport() in functions/_shared/issue-reports.ts. */
  context: Record<string, unknown> | null;
  /** Upload id (32 hex) of the attached screenshot, when there is one. Null
   *  for a student caller until staff opts it in — see share-screenshot.
   *  The public URL is /uploads/<id>.<ext> — build it with screenshotUrl. */
  screenshot_id: string | null;
  /** Staff only. Whether screenshot_id is currently exposed to students. */
  screenshot_shared?: number;
  up: number;
  down: number;
  score: number;
  /** The signed-in caller's own vote on this report, 0 if none. */
  myVote: -1 | 0 | 1;
  /** Student payloads only — true when the signed-in caller filed this
   *  report themselves. Absent (not false) on a staff payload; a staff
   *  member reads reporter_email directly instead. */
  mine?: boolean;
  /** Student payloads only — true once the reporter (or staff) has
   *  withdrawn this report from the public queue. */
  withdrawn?: boolean;
}

/** The serve route is public and id-keyed; the extension is cosmetic. */
export function screenshotUrl(id: string): string {
  return `/uploads/${id}.png`;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    return body.error || `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}

export async function createIssueReport(
  kind: IssueKind,
  title: string,
  message: string,
  context?: Record<string, unknown>,
  screenshotId?: string | null,
): Promise<number> {
  const res = await fetch('/api/issue-reports', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, title, message, context, screenshotId: screenshotId ?? null }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { id: number };
  return data.id;
}

export async function listIssueReports(): Promise<IssueReport[]> {
  const res = await fetch('/api/issue-reports', { credentials: 'same-origin' });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { reports: IssueReport[] };
  return data.reports ?? [];
}

/** The headline to show for a report, with the pre-0020 fallback. */
export function reportHeadline(r: IssueReport): string {
  const t = (r.title || '').trim();
  if (t) return t;
  const first = r.message.split('\n')[0].trim();
  return first.length > 120 ? `${first.slice(0, 117)}...` : first || '(no text)';
}

/**
 * Delete a report outright. Staff only, and irreversible: it takes the
 * attached screenshot with it. For a real report that is finished, set the
 * status to 'fixed' instead — this is for reports that were never real
 * (duplicates, misfires, your own testing).
 */
export async function deleteIssueReport(id: number): Promise<void> {
  const res = await fetch(`/api/issue-reports/${encodeURIComponent(String(id))}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) throw new Error(await readError(res));
}

/** Withdraw (or restore) one's own report from the student-visible queue.
 *  Staff may also call this on behalf of a reporter. Not a delete — see
 *  functions/api/issue-reports/[id]/withdraw.ts. */
export async function setIssueReportWithdrawn(id: number, withdrawn: boolean): Promise<void> {
  const res = await fetch(`/api/issue-reports/${encodeURIComponent(String(id))}/withdraw`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ withdrawn }),
  });
  if (!res.ok) throw new Error(await readError(res));
}

/** Staff only — opt a report's screenshot in or out of student visibility.
 *  See functions/api/issue-reports/[id]/share-screenshot.ts for why this
 *  defaults to off and can't be set on a report with no screenshot. */
export async function setScreenshotShared(id: number, shared: boolean): Promise<void> {
  const res = await fetch(`/api/issue-reports/${encodeURIComponent(String(id))}/share-screenshot`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shared }),
  });
  if (!res.ok) throw new Error(await readError(res));
}

export async function setIssueReportStatus(id: number, status: IssueStatus): Promise<void> {
  const res = await fetch(`/api/issue-reports/${encodeURIComponent(String(id))}/status`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await readError(res));
}

export interface VoteTally {
  up: number;
  down: number;
  score: number;
  myVote: -1 | 0 | 1;
}

/** Cast (1 | -1) or clear (0) the caller's vote on a report. Any signed-in
 *  user, students included. Returns the fresh tally. */
export async function voteOnReport(id: number, vote: -1 | 0 | 1): Promise<VoteTally> {
  const res = await fetch(`/api/issue-reports/${encodeURIComponent(String(id))}/vote`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vote }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as VoteTally;
}