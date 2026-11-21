// POST /api/issue-reports/check — "is this already known?" before a report is filed.
//
// Any signed-in user. Body {kind, title, message}. Answers {match: CheckMatch | null, checked}.
// The rules are lib/issue-check-core.ts: a word-overlap shortlist of the reports a
// student may see (never a withdrawn one) and the What's New features of the
// caller's audience, then the DECISION model decision-1.1 (CheaperInference,
// zero data retention on every request) picks the one that is the same problem or
// request, or "none", with a probability. No shortlist = no model call. No key =
// the word overlap alone, and only when it is unmistakable.
//
// The report text LEAVES Cloudflare (to CheaperInference, then the provider serving
// decision-1.1), exactly as a student's code does for the fast Check
// (lib/decision-check-core.ts). ISSUE_CHECK_MODEL set to a Workers AI chat model
// (an @cf/ id) keeps it on Cloudflare instead. Cloudflare Clef did this until
// 2026-11-21 and is retired.
//
// It never refuses a report: every failure (model down, timeout, quota spent,
// bad body) answers 200 {match: null}, and the dialog files as it always did.
// What it hands back is only what the /issues page already shows a student
// (title, status, the teacher's reply), never a reporter or their context.

import {
  buildCheckPrompt,
  buildIssueDecisionRequest,
  isIssueDecisionModel,
  ISSUE_DECISION_MODEL,
  ISSUE_DECISION_URL,
  parseCheckVerdict,
  parseIssueDecision,
  shortlist,
  toMatch,
  wordsOnlyVerdict,
  type CheckCandidate,
  type CheckMatch,
  type CheckStatus,
} from '../../../lib/issue-check-core';
import { WHATS_NEW } from '../../../lib/whats-new';
import { entriesFor } from '../../../lib/whats-new-state';

interface WorkersAi {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}
interface Env {
  DB: D1Database;
  AI?: WorkersAi;
  /** Bearer key for decision-1.1 (the same secret as the fast Check). */
  CHEAPERINFERENCE_API_KEY?: string;
  /** decision-1.1 (default) or a pinned build of it, or a Workers AI chat model id (@cf/...). */
  ISSUE_CHECK_MODEL?: string;
  ISSUE_CHECK_DAILY_LIMIT?: string;
  ISSUE_CHECK_GLOBAL_DAILY_LIMIT?: string;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

/**
 * A decision model: a probability per option, no text to parse, under a second.
 * Measured on scripts/issue-check-live.mjs 2026-11-21: 13/14, no wrong match, the
 * same as Clef before it. A Workers AI chat model id in ISSUE_CHECK_MODEL uses the
 * JSON prompt instead.
 */
export const DEFAULT_CHECK_MODEL = ISSUE_DECISION_MODEL;
const DEFAULT_DAILY_LIMIT = 25;
/** A check is ~800 input tokens on decision-1.1; 200 a day is a backstop, not a budget. */
const DEFAULT_GLOBAL_DAILY_LIMIT = 200;
/** Bucket in the shared ai_help_usage table (see functions/api/grade-written.ts). */
const RATE_BUCKET = 'issue-check';
/** Unreachable by any session email: an email never holds a NUL byte. */
const GLOBAL_IDENTITY = '\x00GLOBAL';
const GLOBAL_BUCKET = 'issue-check-global';
const MODEL_TIMEOUT_MS = 8000;
/** The newest reports only: an old fixed report is still worth matching, a thousand of them is not. */
const MAX_REPORTS = 400;

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { env, data, request } = context;

  let body: { kind?: unknown; title?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ match: null, checked: false });
  }
  const query = {
    kind: typeof body?.kind === 'string' ? body.kind.slice(0, 20) : 'bug',
    title: typeof body?.title === 'string' ? body.title.trim().slice(0, 120) : '',
    message: typeof body?.message === 'string' ? body.message.trim().slice(0, 4000) : '',
  };
  if (query.title.length < 3 || query.message.length < 3) return json({ match: null, checked: false });

  const candidates: CheckCandidate[] = [];
  try {
    const rows = await env.DB.prepare(
      `SELECT id, reporter_email, title, message, status, resolution_note
         FROM issue_reports
        WHERE withdrawn_at IS NULL
        ORDER BY created_at DESC
        LIMIT ${MAX_REPORTS}`,
    ).all<{
      id: number;
      reporter_email: string;
      title: string | null;
      message: string;
      status: CheckStatus;
      resolution_note: string | null;
    }>();
    for (const r of rows.results ?? []) {
      candidates.push({
        ref: `r${r.id}`,
        source: 'report',
        id: r.id,
        title: (r.title || '').trim() || r.message.split('\n')[0].slice(0, 120),
        text: r.message,
        status: r.status,
        note: r.resolution_note,
        mine: r.reporter_email === data.email,
      });
    }
  } catch (err) {
    console.error('issue-check: reading reports failed', err);
    return json({ match: null, checked: false });
  }
  entriesFor(WHATS_NEW, data.role).forEach((e, i) => {
    candidates.push({
      ref: `f${i + 1}`,
      source: 'feature',
      id: e.id,
      title: e.title,
      text: [e.summary, ...(e.steps ?? [])].join(' '),
      href: e.action?.href && e.action.href.startsWith('/') && !e.action.href.startsWith('//') ? e.action.href : '',
    });
  });

  const list = shortlist(query, candidates);
  if (list.length === 0) return json({ match: null, checked: true });

  const model = (env.ISSUE_CHECK_MODEL || '').trim() || DEFAULT_CHECK_MODEL;
  const decision = isIssueDecisionModel(model);
  // Only a Workers AI id (@cf/...) runs on the binding: anything else that is not
  // decision-1.1 (Clef's old selector, a typo) is not sent anywhere.
  const usable = decision ? !!env.CHEAPERINFERENCE_API_KEY : model.startsWith('@cf/') && !!env.AI;
  if (!usable) {
    const top = wordsOnlyVerdict(list);
    return json({ match: top ? toMatch(top, 'words') : null, checked: true });
  }

  if (!(await spend(env, data))) return json({ match: null, checked: false, limited: true });

  let match: CheckMatch | null = null;
  try {
    let picked;
    if (decision) {
      picked = parseIssueDecision(await askDecision(env.CHEAPERINFERENCE_API_KEY as string, buildIssueDecisionRequest(query, list, model)), list).pick;
    } else {
      const { system, user } = buildCheckPrompt(query, list);
      picked = parseCheckVerdict(await callModel(env.AI as WorkersAi, model, system, user), list);
    }
    match = picked ? toMatch(picked, 'ai') : null;
  } catch (err) {
    console.error('issue-check: model call failed', err);
    return json({ match: null, checked: false });
  }
  return json({ match, checked: true });
};

/** Students are capped per day, everyone counts toward the deploy-wide ceiling. False = do not call the model. */
async function spend(env: Env, data: SessionData): Promise<boolean> {
  const day = new Date().toISOString().slice(0, 10);
  const limit = Math.max(1, parseInt(env.ISSUE_CHECK_DAILY_LIMIT || '', 10) || DEFAULT_DAILY_LIMIT);
  const globalLimit = Math.max(1, parseInt(env.ISSUE_CHECK_GLOBAL_DAILY_LIMIT || '', 10) || DEFAULT_GLOBAL_DAILY_LIMIT);
  const read = (who: string, bucket: string) =>
    env.DB.prepare('SELECT count FROM ai_help_usage WHERE student_email = ? AND unit = ? AND day = ?')
      .bind(who, bucket, day)
      .first<{ count: number }>();
  const bump = (who: string, bucket: string) =>
    env.DB.prepare(
      `INSERT INTO ai_help_usage (student_email, unit, day, count) VALUES (?, ?, ?, 1)
       ON CONFLICT(student_email, unit, day) DO UPDATE SET count = count + 1`,
    ).bind(who, bucket, day);
  try {
    if (((await read(GLOBAL_IDENTITY, GLOBAL_BUCKET))?.count ?? 0) >= globalLimit) return false;
    if (data.role === 'student' && ((await read(data.email, RATE_BUCKET))?.count ?? 0) >= limit) return false;
    await env.DB.batch(
      data.role === 'student'
        ? [bump(data.email, RATE_BUCKET), bump(GLOBAL_IDENTITY, GLOBAL_BUCKET)]
        : [bump(GLOBAL_IDENTITY, GLOBAL_BUCKET)],
    );
    return true;
  } catch (err) {
    console.error('issue-check: quota read failed', err);
    return false;
  }
}

function withTimeout<T>(p: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    p,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('issue check timed out')), MODEL_TIMEOUT_MS);
    }),
  ]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

/** decision-1.1: one POST. A non-200 (a 429 at the key's per-minute limit, a 503 when no
 *  zero-retention provider is free) throws, which the caller answers as "no match". */
async function askDecision(key: string, body: unknown): Promise<unknown> {
  const controller = new AbortController();
  const res = await withTimeout(
    fetch(ISSUE_DECISION_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    }),
  ).catch((err) => {
    controller.abort();
    throw err;
  });
  if (!res.ok) throw new Error(`decision-1.1 answered ${res.status}`);
  return res.json();
}

/** A chat model (ISSUE_CHECK_MODEL set to one): the JSON prompt, answered as text. */
async function callModel(ai: WorkersAi, model: string, system: string, user: string): Promise<unknown> {
  const out = await withTimeout(
    ai.run(model, {
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0,
      max_tokens: 120,
    }),
  );
  if (typeof out === 'string') return out;
  if (out && typeof out === 'object') {
    const o = out as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
    return o.response ?? o.choices?.[0]?.message?.content ?? null;
  }
  return null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
