// POST /api/issue-reports/check — "is this already known?" before a report is filed.
//
// Any signed-in user. Body {kind, title, message}. Answers {match: CheckMatch | null, checked}.
// The rules are lib/issue-check-core.ts: a word-overlap shortlist of the reports a
// student may see (never a withdrawn one) and the What's New features of the
// caller's audience, then a Workers AI DECISION model (Clef) picks the one that
// is the same problem or request, or "none", with a probability. No shortlist =
// no model call. No binding = the word overlap alone, and only when it is
// unmistakable.
//
// It never refuses a report: every failure (model down, timeout, quota spent,
// bad body) answers 200 {match: null}, and the dialog files as it always did.
// What it hands back is only what the /issues page already shows a student
// (title, status, the teacher's reply), never a reporter or their context.

import {
  buildCheckPrompt,
  buildDecisionRequest,
  isDecisionModel,
  parseCheckVerdict,
  parseDecision,
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
  /** Workers AI model for the check; a small one on purpose (it runs before every report). */
  ISSUE_CHECK_MODEL?: string;
  ISSUE_CHECK_DAILY_LIMIT?: string;
  ISSUE_CHECK_GLOBAL_DAILY_LIMIT?: string;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

/**
 * Cloudflare's decision model: a probability per option, no text to parse, a few
 * hundred ms. (The first choice, @cf/meta/llama-3.1-8b-instruct-fp8, is retired by
 * Workers AI on 2026-11-20.) A chat model id in ISSUE_CHECK_MODEL uses the JSON prompt.
 */
export const DEFAULT_CHECK_MODEL = '@cf/cloudflare/clef';
const DEFAULT_DAILY_LIMIT = 25;
/**
 * The free 10,000 neurons a day are shared with the grader and CODY. A check is
 * ~1,000 input tokens: on Clef ($0.24/M) about 22 neurons, so 200 is at most ~4,400.
 */
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

  if (!env.AI) {
    const top = wordsOnlyVerdict(list);
    return json({ match: top ? toMatch(top, 'words') : null, checked: true });
  }

  if (!(await spend(env, data))) return json({ match: null, checked: false, limited: true });

  const model = env.ISSUE_CHECK_MODEL || DEFAULT_CHECK_MODEL;
  let match: CheckMatch | null = null;
  try {
    let picked;
    if (isDecisionModel(model)) {
      const out = await withTimeout(env.AI.run(model, buildDecisionRequest(query, list, model)));
      picked = parseDecision(out, list).pick;
    } else {
      const { system, user } = buildCheckPrompt(query, list);
      picked = parseCheckVerdict(await callModel(env.AI, model, system, user), list);
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
