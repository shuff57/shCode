// Client wrappers for the issue-report endpoints. Same-origin; the session
// cookie rides along automatically.

export type IssueKind = 'bug' | 'quirk' | 'enhancement';
export type IssueStatus = 'open' | 'in-progress' | 'fixed' | 'deferred';

export interface IssueReport {
  id: number;
  reporter_email: string;
  kind: IssueKind;
  /** One-line summary. NULL only for reports filed before migration 0020. */
  title: string | null;
  message: string;
  status: IssueStatus;
  triaged_by: string | null;
  triaged_at: number | null;
  created_at: number;
  context: Record<string, unknown> | null;
  /** Upload id (32 hex) of the attached screenshot, when there is one. The
   *  public URL is /uploads/<id>.<ext> — build it with screenshotUrl. */
  screenshot_id: string | null;
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

export async function setIssueReportStatus(id: number, status: IssueStatus): Promise<void> {
  const res = await fetch(`/api/issue-reports/${encodeURIComponent(String(id))}/status`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await readError(res));
}