// Client wrappers for the issue-report endpoints. Same-origin; the session
// cookie rides along automatically.

export type IssueKind = 'bug' | 'quirk' | 'enhancement';
export type IssueStatus = 'open' | 'in-progress' | 'fixed' | 'deferred';

export interface IssueReport {
  id: number;
  reporter_email: string;
  kind: IssueKind;
  message: string;
  status: IssueStatus;
  triaged_by: string | null;
  triaged_at: number | null;
  created_at: number;
  context: Record<string, unknown> | null;
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
  message: string,
  context?: Record<string, unknown>,
): Promise<number> {
  const res = await fetch('/api/issue-reports', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, message, context }),
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

export async function setIssueReportStatus(id: number, status: IssueStatus): Promise<void> {
  const res = await fetch(`/api/issue-reports/${encodeURIComponent(String(id))}/status`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await readError(res));
}