// /api/issue-reports
//
// GET   — any signed-in user. Staff get the full report queue, newest first,
//         same as before, plus each report's up/down/score/myVote. Students
//         get the same reports run through publicReport() (reporter identity
//         and raw context stripped, screenshot withheld unless staff opted
//         it in), worst-first by vote score, minus any report withdrawn by
//         someone other than the viewer -- see visibleToStudent().
//         `?format=md` streams a markdown handoff file instead of JSON —
//         staff only, regardless of who is asking.
// POST  — any signed-in user: file a new report.
//         Body {kind, title, message, context, screenshotId}.
// DELETE — see [id]/index.ts. Staff only; removes the report, its votes, and
//          its screenshot.
//
// Reports are site-wide notes, not class-scoped: any staff member can triage
// all of them. Rate limiting is a simple per-reporter open-report cap, enough
// to stop a stuck loop from flooding the queue without punishing legitimate
// use.

import { isUploadId } from '../../_shared/uploads';
import {
  publicReport,
  rankReports,
  tallyVotes,
  visibleToStudent,
  type ReportRow,
} from '../../_shared/issue-reports';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

const KINDS = new Set(['bug', 'quirk', 'enhancement']);
const MAX_TITLE = 120;
const MAX_MESSAGE = 4000;
const MAX_CONTEXT = 16000;
const MAX_OPEN_PER_REPORTER = 20;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data, request } = context;

  const format = new URL(request.url).searchParams.get('format');
  if (format === 'md' && data.role === 'student') return json({ error: 'Staff only' }, 403);

  const result = await env.DB.prepare(
    `SELECT id, reporter_email, kind, title, message, status, triaged_by, triaged_at, context_json,
            screenshot_id, screenshot_shared, withdrawn_at, created_at
       FROM issue_reports
      ORDER BY created_at DESC`,
  ).all<ReportRow>();

  const reports = result.results ?? [];

  if (format === 'md') {
    const md = renderMarkdown(reports);
    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="issue-reports-${new Date().toISOString().slice(0, 10)}.md"`,
      },
    });
  }

  // One query for every report's tally, not one per report.
  const voteResult = await env.DB.prepare(
    `SELECT report_id, voter_email, vote FROM issue_report_votes`,
  ).all<{ report_id: number; voter_email: string; vote: number }>();

  const tallies = tallyVotes(voteResult.results ?? [], data.email);
  const zeroTally = { up: 0, down: 0, myVote: 0 as const };

  if (data.role === 'student') {
    const publicReports = rankReports(
      reports
        .filter((r) => visibleToStudent(r, data.email))
        .map((r) => publicReport(r, tallies.get(r.id) ?? zeroTally, data.email)),
    );
    return json({ reports: publicReports });
  }

  const staffReports = reports.map((r) => {
    const t = tallies.get(r.id) ?? zeroTally;
    return {
      ...r,
      context: parseContext(r.context_json),
      up: t.up,
      down: t.down,
      score: t.up - t.down,
      myVote: t.myVote,
    };
  });

  return json({ reports: staffReports });
};

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data, request } = context;

  let body: {
    kind?: unknown;
    title?: unknown;
    message?: unknown;
    context?: unknown;
    screenshotId?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const kind = typeof body.kind === 'string' ? body.kind : '';
  if (!KINDS.has(kind)) {
    return json({ error: 'kind must be one of: bug, quirk, enhancement' }, 400);
  }

  // Title is required on new reports. Old rows can be NULL (migration 0020),
  // but nothing should be able to create another one.
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 3) {
    return json({ error: 'Please give this a short title (at least 3 characters).' }, 400);
  }
  if (title.length > MAX_TITLE) {
    return json({ error: `That title is too long. The limit is ${MAX_TITLE} characters.` }, 413);
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
    `INSERT INTO issue_reports (reporter_email, kind, title, message, status, context_json, screenshot_id, created_at)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`,
  )
    .bind(data.email, kind, title, message, contextJson, screenshotId, Date.now())
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
    '| # | Title | Kind | Status | Reporter | When |',
    '| --- | --- | --- | --- | --- | --- |',
  ];

  for (const r of reports) {
    lines.push(
      `| ${r.id} | ${cell(headline(r))} | ${KIND_ICON[r.kind] ?? r.kind} ${r.kind} | ${STATUS_LABEL[r.status] ?? r.status} | ${r.reporter_email} | ${new Date(r.created_at).toISOString()} |`,
    );
  }

  lines.push('');

  for (const r of reports) {
    lines.push(
      `## #${r.id} — [${r.kind.toUpperCase()}] ${headline(r)}`,
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

/**
 * The report's headline. `title` is required on anything filed after
 * migration 0020; older rows fall back to the first line of the body, which
 * is exactly what the UI used to derive on every render.
 */
function headline(r: ReportRow): string {
  const t = (r.title || '').trim();
  return t || firstLine(r.message);
}

/** Table-cell safe: a pipe would silently add a column and shift the row. */
function cell(text: string): string {
  return text.split('|').join('\u2758');
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