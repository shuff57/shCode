// /api/issue-reports
//
// GET   — staff (teacher/admin) only: the full report queue, newest first.
//         `?format=md` streams a markdown handoff file instead of JSON.
// POST  — any signed-in user: file a new report. Body {kind, message, context}.
//
// Reports are site-wide notes, not class-scoped: any staff member can triage
// all of them. Rate limiting is a simple per-reporter open-report cap, enough
// to stop a stuck loop from flooding the queue without punishing legitimate
// use.

import { isUploadId } from '../../_shared/uploads';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

const KINDS = new Set(['bug', 'quirk', 'enhancement']);
const MAX_MESSAGE = 4000;
const MAX_CONTEXT = 16000;
const MAX_OPEN_PER_REPORTER = 20;

interface ReportRow {
  id: number;
  reporter_email: string;
  kind: 'bug' | 'quirk' | 'enhancement';
  message: string;
  status: 'open' | 'in-progress' | 'fixed' | 'deferred';
  triaged_by: string | null;
  triaged_at: number | null;
  context_json: string | null;
  screenshot_id: string | null;
  created_at: number;
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data, request } = context;

  if (data.role === 'student') return json({ error: 'Staff only' }, 403);

  const result = await env.DB.prepare(
    `SELECT id, reporter_email, kind, message, status, triaged_by, triaged_at, context_json, screenshot_id, created_at
       FROM issue_reports
      ORDER BY created_at DESC`,
  ).all<ReportRow>();

  const reports = result.results ?? [];

  const format = new URL(request.url).searchParams.get('format');
  if (format === 'md') {
    const md = renderMarkdown(reports);
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="issue-reports-${new Date().toISOString().slice(0, 10)}.md"`,
      },
    });
  }

  return json({ reports: reports.map((r) => ({ ...r, context: parseContext(r.context_json) })) });
};

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data, request } = context;

  let body: { kind?: unknown; message?: unknown; context?: unknown; screenshotId?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const kind = typeof body.kind === 'string' ? body.kind : '';
  if (!KINDS.has(kind)) {
    return json({ error: 'kind must be one of: bug, quirk, enhancement' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (message.length < 3) {
    return json({ error: 'Please describe the issue (at least 3 characters).' }, 400);
  }
  if (message.length > MAX_MESSAGE) {
    return json({ error: `That message is too long. The limit is ${MAX_MESSAGE} characters.` }, 413);
  }

  // Context is client-captured and untrusted: it is stored verbatim for the
  // teacher's eyes and rendered escaped in the markdown export. Anything over
  // the cap is dropped rather than truncated, so the JSON always parses.
  let contextJson: string | null = null;
  if (body.context !== undefined && body.context !== null) {
    try {
      const serialized = JSON.stringify(body.context);
      if (serialized.length <= MAX_CONTEXT) contextJson = serialized;
    } catch {
      /* circular or otherwise unserializable — ship without it */
    }
  }

  // The screenshot, when one is attached, must be an upload the REPORTER
  // already stored via POST /api/uploads — the client uploads the file first
  // and sends its id here. Checking shape, then ownership (the id alone would
  // let a reporter staple someone else's image to their report), then storing
  // only the id: the bytes never move through this route, so a report can
  // never become a backdoor way to write into R2.
  let screenshotId: string | null = null;
  if (body.screenshotId !== undefined && body.screenshotId !== null) {
    if (typeof body.screenshotId !== 'string' || !isUploadId(body.screenshotId)) {
      return json({ error: 'screenshotId does not look like an upload id.' }, 400);
    }
    const owned = await env.DB.prepare(
      `SELECT id FROM uploads WHERE id = ? AND owner_email = ?`,
    )
      .bind(body.screenshotId, data.email)
      .first<{ id: string }>();
    if (!owned) {
      return json({ error: 'That screenshot upload does not exist or belongs to another account.' }, 400);
    }
    screenshotId = body.screenshotId;
  }

  // Flood guard: count the reporter's open/in-progress reports. Resolved ones
  // don't count, so a student who reports one thing per lesson is never near
  // the cap.
  const usage = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM issue_reports
      WHERE reporter_email = ? AND status IN ('open', 'in-progress')`,
  )
    .bind(data.email)
    .first<{ n: number }>();

  if ((usage?.n ?? 0) >= MAX_OPEN_PER_REPORTER) {
    return json(
      { error: 'You have a lot of open reports already. They will be triaged soon — try again later.' },
      429,
    );
  }

  const result = await env.DB.prepare(
    `INSERT INTO issue_reports (reporter_email, kind, message, status, context_json, screenshot_id, created_at)
     VALUES (?, ?, ?, 'open', ?, ?, ?)`,
  )
    .bind(data.email, kind, message, contextJson, screenshotId, Date.now())
    .run();

  return json({ id: result.meta.last_row_id, ok: true }, 201);
};

// ---------------------------------------------------------------------------
// Markdown export
// ---------------------------------------------------------------------------

const KIND_ICON: Record<string, string> = { bug: 'bug', quirk: 'quirk', enhancement: 'enhancement' };
const STATUS_LABEL: Record<string, string> = {
  open: 'Open — needs triage',
  'in-progress': 'In progress — being worked on',
  fixed: 'Fixed',
  deferred: 'Deferred',
};

/**
 * The handoff file. Deliberately plain markdown: one section per report, the
 * auto-captured context as a fenced json block, and a summary table at the
 * top so a skim answers "how many, what kind, how many still open".
 */
export function renderMarkdown(reports: ReportRow[]): string {
  const now = new Date();
  const open = reports.filter((r) => r.status === 'open').length;
  const inProgress = reports.filter((r) => r.status === 'in-progress').length;
  const fixed = reports.filter((r) => r.status === 'fixed').length;
  const deferred = reports.filter((r) => r.status === 'deferred').length;

  const lines: string[] = [
    `# Issue reports — ${now.toISOString().slice(0, 10)}`,
    '',
    `Exported from shCode. ${open} open, ${inProgress} in progress, ${fixed} fixed, ${deferred} deferred (${reports.length} total).`,
    '',
    '| # | Kind | Status | Reporter | When |',
    '| --- | --- | --- | --- | --- |',
  ];

  for (const r of reports) {
    lines.push(
      `| ${r.id} | ${KIND_ICON[r.kind] ?? r.kind} ${r.kind} | ${STATUS_LABEL[r.status] ?? r.status} | ${r.reporter_email} | ${new Date(r.created_at).toISOString()} |`,
    );
  }

  lines.push('');

  for (const r of reports) {
    lines.push(
      `## #${r.id} — [${r.kind.toUpperCase()}] ${firstLine(r.message)}`,
      '',
      `- **Kind:** ${r.kind}`,
      `- **Status:** ${r.status}`,
      `- **Reporter:** ${r.reporter_email}`,
      `- **Filed:** ${new Date(r.created_at).toISOString()}`,
    );
    if (r.triaged_by) {
      lines.push(
        `- **Triaged:** by ${r.triaged_by}${r.triaged_at ? ` at ${new Date(r.triaged_at).toISOString()}` : ''}`,
      );
    }
    lines.push('', '### Report', '', r.message);

    if (r.screenshot_id) {
      // The public serve route needs the content-type extension to be honest;
      // the id alone is the key, and the extension in the URL is cosmetic
      // (functions/uploads/[name].ts). Link, don't inline: a markdown
      // handoff file gets read as text, and a wall of base64 it can't render
      // is worse than a path to open.
      lines.push('', `### Screenshot`, '', `/uploads/${r.screenshot_id}.png`);
    }

    const ctx = parseContext(r.context_json);
    if (ctx) {
      lines.push('', '### Auto-captured context', '', '```json', JSON.stringify(ctx, null, 2), '```');
    }
    lines.push('', '---', '');
  }

  return lines.join('\n');
}

function firstLine(message: string): string {
  const line = message.split('\n')[0].replace(/[\r|]/g, ' ').trim();
  return line.length > 80 ? `${line.slice(0, 77)}…` : line || '(no text)';
}

function parseContext(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return { unparsable: raw };
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}