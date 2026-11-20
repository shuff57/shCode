// POST /api/clef-check -- the fast half of Check (lib/clef-check-core.ts).
//
// Body: { lessonId, response }. Answers { ok: true, cards: [{ id, verdict: 'met'|'missing'|'unsure', p }] }
// in about half a second. The browser colours the cards from it at once, decides the unsure ones with
// the lab's own pattern check, and then asks /api/grade-written for the notes as before.
//
// The model is Microsoft decision-1.1 through CheaperInference (lib/decision-check-core.ts), which replaced
// Cloudflare Clef 2026-11-21. The route keeps its name (the browser and the quota bucket are unchanged).
// Every request asks for zero data retention.
//
// Same trust rule as /api/grade-written: the questions, task and model come from the server's own
// config (functions/_shared/ai-graders.generated.ts) by lesson id, never from the body. The response
// text is the only client-controlled field. Without that rule this route would be a free model proxy.
//
// Refusals are plain: 503 { offline: true } when there is no CHEAPERINFERENCE_API_KEY or the model call fails
// for ANY reason, a 429 from the provider's per-minute limit included (the browser then runs today's Check
// unchanged), 404 when the lesson has no fast-check questions, 429 past
// the daily allowance. Its counter is its own bucket in ai_help_usage, so a fast Check never spends
// a student's grade-written allowance; the notes request still does, exactly as Check did before.

import { loadAiGrader } from '../_shared/aiGraders';
import { isLessonAccessible, lockedResponse, type SessionData } from '../_shared/lessonAccess';
import { DECISION_MODEL, askDecision } from '../../lib/decision-check-core';
import { MAX_RESPONSE_CHARS } from '../../lib/grade-written-core';

interface Env {
  DB: D1Database;
  /** Bearer key for CheaperInference (POST /v1/decisions). Unset = the fast Check answers 503 offline. */
  CHEAPERINFERENCE_API_KEY?: string;
  /** Optional model id for the fast Check; default `decision-1.1`. */
  DECISION_CHECK_MODEL?: string;
  /** Per-student daily cap on fast Checks. Default 400: each costs about $0.00004, so this is a runaway stop. */
  CLEF_CHECK_DAILY_LIMIT?: string;
  /** Deploy-wide daily ceiling. Default 40000 (about $2 a day at the measured cost). */
  CLEF_CHECK_GLOBAL_DAILY_LIMIT?: string;
  ASSETS?: Fetcher;
}

type Ctx = EventContext<Env, string, SessionData>;

const BUCKET = 'clef-check';
const GLOBAL_BUCKET = 'clef-check:global';
// Same reserved identity as grade-written: an email never holds a NUL byte.
const GLOBAL_IDENTITY = '\x00GLOBAL';
const DEFAULT_DAILY_LIMIT = 400;
const DEFAULT_GLOBAL_DAILY_LIMIT = 40000;
const TIMEOUT_MS = 8000;

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

const limitOf = (v: string | undefined, d: number) => Math.max(1, parseInt(v || '', 10) || d);

async function count(db: D1Database, who: string, bucket: string, day: string): Promise<number> {
  const row = await db
    .prepare('SELECT count FROM ai_help_usage WHERE student_email = ? AND unit = ? AND day = ?')
    .bind(who, bucket, day)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

async function bump(db: D1Database, who: string, bucket: string, day: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO ai_help_usage (student_email, unit, day, count) VALUES (?, ?, ?, 1)
       ON CONFLICT(student_email, unit, day) DO UPDATE SET count = count + 1`,
    )
    .bind(who, bucket, day)
    .run();
}

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;

  let body: { lessonId?: unknown; response?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }
  const lessonId = typeof body.lessonId === 'string' ? body.lessonId : '';
  const response = typeof body.response === 'string' ? body.response : '';
  if (!lessonId) return json({ ok: false, error: 'lessonId is required' }, 400);
  if (!response.trim()) return json({ ok: false, error: 'There is no code to check yet.' }, 400);
  if (response.length > MAX_RESPONSE_CHARS) {
    return json({ ok: false, error: `Your code is too long to check (${response.length} characters, limit ${MAX_RESPONSE_CHARS}).` }, 400);
  }

  if (!(await isLessonAccessible(env, request, data.role, data.email, lessonId))) return lockedResponse();

  const cfg = (await loadAiGrader(env, request, lessonId))?.clef;
  if (!cfg) return json({ ok: false, error: 'This lesson has no fast check.', offline: true }, 404);
  if (!env.CHEAPERINFERENCE_API_KEY) return json({ ok: false, error: 'The fast check is not set up on this server.', offline: true }, 503);

  if (data.role === 'student') {
    const day = new Date().toISOString().slice(0, 10);
    const globalLimit = limitOf(env.CLEF_CHECK_GLOBAL_DAILY_LIMIT, DEFAULT_GLOBAL_DAILY_LIMIT);
    const limit = limitOf(env.CLEF_CHECK_DAILY_LIMIT, DEFAULT_DAILY_LIMIT);
    // Over a ceiling, the browser falls back to today's Check, which has its own allowance: a
    // student is never stopped here, only sent the slow way.
    if ((await count(env.DB, GLOBAL_IDENTITY, GLOBAL_BUCKET, day)) >= globalLimit) {
      console.error('clef-check global daily ceiling reached');
      return json({ ok: false, error: 'The fast check is busy today.', rateLimited: true, offline: true }, 429);
    }
    if ((await count(env.DB, data.email, BUCKET, day)) >= limit) {
      return json({ ok: false, error: `You have used today's ${limit} fast checks.`, rateLimited: true, offline: true }, 429,
        { 'X-RateLimit-Limit': String(limit), 'X-RateLimit-Remaining': '0' });
    }
    await bump(env.DB, data.email, BUCKET, day);
    await bump(env.DB, GLOBAL_IDENTITY, GLOBAL_BUCKET, day);
  }

  // askDecision returns null for every failure (a 429 from the provider's per-minute limit, a 5xx, a refusal of
  // the zero-data-retention route, a timeout, a body it cannot read), and the browser then runs today's Check.
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let cards: Awaited<ReturnType<typeof askDecision>>;
  try {
    cards = await askDecision((url, init) => fetch(url, init), env.CHEAPERINFERENCE_API_KEY, cfg, response, env.DECISION_CHECK_MODEL || DECISION_MODEL, ctl.signal);
  } finally {
    clearTimeout(timer);
  }
  if (!cards) {
    console.error('clef-check: the decision model could not answer');
    return json({ ok: false, error: 'The fast check could not answer.', offline: true }, 503);
  }
  return json({ ok: true, cards });
};
