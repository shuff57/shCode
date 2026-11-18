// POST /api/p5play-convert — turn a pasted p5play program into a moSHion one with an AI rebuild.
//
// Body: { code }. Answer: { code, notes[], warnings[], model, remaining } or { error } with a plain reason.
// An answer that still calls a p5-only function (leftoverP5Calls) gets ONE repair round; what is still
// left after it is named in `warnings`.
//
// The one AI route that goes to OpenRouter rather than Workers AI (owner's choice, 2026-11-17): model
// DeepSeek V4.1 Flash (`deepseek/deepseek-v4.1-flash`, override P5PLAY_CONVERT_MODEL), key in the
// OPENROUTER_API_KEY secret. No key = 503, never a silent fallback to another provider.
//
// What leaves the site: the pasted program and the moSHion API file, nothing else. No email, name or
// lesson id goes to OpenRouter; the request asks OpenRouter for providers that do not keep or train on
// prompts (`provider.data_collection: 'deny'`), and a paste with a phone number, email or street
// address in it is refused before it is sent (findPII, the same check as messages).
//
// Quota: per person per UTC day (P5PLAY_CONVERT_DAILY_LIMIT, default 20; teachers and admins exempt)
// and per deploy (P5PLAY_CONVERT_GLOBAL_DAILY_LIMIT, default 500), in ai_help_usage under the
// 'p5play-convert' bucket. A request is counted when it is sent to the model, so a failed one still
// counts: the cost was spent.
//
// Auth: functions/_middleware.ts (session cookie required).

import { findPII } from '../../lib/pii-check';
import {
  CONVERT_BUCKET,
  DEFAULT_CONVERT_DAILY_LIMIT,
  DEFAULT_CONVERT_GLOBAL_DAILY_LIMIT,
  DEFAULT_CONVERT_MODEL,
  buildConvertSystem,
  buildConvertUser,
  buildRepairUser,
  convertInputProblem,
  leftoverP5Calls,
  maxTokensFor,
  parseConvertAnswer,
  type ConvertAnswer,
} from '../../lib/p5play-convert-core';

interface Env {
  DB: D1Database;
  OPENROUTER_API_KEY?: string;
  P5PLAY_CONVERT_MODEL?: string;
  P5PLAY_CONVERT_DAILY_LIMIT?: string;
  P5PLAY_CONVERT_GLOBAL_DAILY_LIMIT?: string;
  ASSETS?: Fetcher;
}

type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL_TIMEOUT_MS = 120_000;
// The same unreachable identity trick as ai-help: no session email can hold a NUL byte.
const GLOBAL_IDENTITY = '\x00GLOBAL';
const GLOBAL_BUCKET = CONVERT_BUCKET + ':global';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function limitOf(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

async function usedToday(db: D1Database, who: string, bucket: string, day: string): Promise<number> {
  const row = await db
    .prepare('SELECT count FROM ai_help_usage WHERE student_email = ? AND unit = ? AND day = ?')
    .bind(who, bucket, day)
    .first<{ count: number }>();
  return row?.count ?? 0;
}

function bump(db: D1Database, who: string, bucket: string, day: string): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO ai_help_usage (student_email, unit, day, count) VALUES (?, ?, ?, 1)
       ON CONFLICT(student_email, unit, day) DO UPDATE SET count = count + 1`,
    )
    .bind(who, bucket, day);
}

/** The moSHion API file, read from the site's own static assets. '' when it cannot be read (the
 *  rules in the prompt still carry the differences). */
async function readApiDocs(env: Env, requestUrl: string): Promise<string> {
  try {
    if (!env.ASSETS) return '';
    const res = await env.ASSETS.fetch(new URL('/moshion/docs/moshion.d.ts', requestUrl).toString());
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;
  const session = data;
  if (!session?.email) return json({ error: 'Sign in to convert a program.' }, 401);

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'That request could not be read.' }, 400);
  }
  const problem = convertInputProblem(body.code);
  if (problem) return json({ error: problem }, 400);
  const code = String(body.code).replace(/\r\n/g, '\n');

  const pii = findPII(code);
  if (pii) {
    return json({
      error: `That program has what looks like ${pii} in it. Take it out first: the program is sent to an AI service outside shCode.`,
    }, 400);
  }

  const key = env.OPENROUTER_API_KEY;
  if (!key) return json({ error: 'Converting is not set up on this site yet. Ask your teacher.', offline: true }, 503);

  // Every guard that refuses runs before anything is spent.
  const day = new Date().toISOString().slice(0, 10);
  const exempt = session.role === 'teacher' || session.role === 'admin';
  const personal = limitOf(env.P5PLAY_CONVERT_DAILY_LIMIT, DEFAULT_CONVERT_DAILY_LIMIT);
  const global = limitOf(env.P5PLAY_CONVERT_GLOBAL_DAILY_LIMIT, DEFAULT_CONVERT_GLOBAL_DAILY_LIMIT);
  let remaining: number | null = null;
  try {
    if ((await usedToday(env.DB, GLOBAL_IDENTITY, GLOBAL_BUCKET, day)) >= global) {
      return json({ error: 'Converting is busy for today across the whole site. Try again tomorrow.' }, 429);
    }
    if (!exempt) {
      const used = await usedToday(env.DB, session.email, CONVERT_BUCKET, day);
      if (used >= personal) {
        return json({ error: `You have used all ${personal} conversions for today. More tomorrow.`, remaining: 0 }, 429);
      }
      remaining = personal - used - 1;
    }
    const writes = [bump(env.DB, GLOBAL_IDENTITY, GLOBAL_BUCKET, day)];
    if (!exempt) writes.push(bump(env.DB, session.email, CONVERT_BUCKET, day));
    await env.DB.batch(writes);
  } catch (err) {
    console.error('p5play-convert quota check failed:', err);
    return json({ error: 'Could not check today\'s conversions. Try again in a moment.' }, 503);
  }

  const model = (env.P5PLAY_CONVERT_MODEL || '').trim() || DEFAULT_CONVERT_MODEL;
  const apiDocs = await readApiDocs(env, request.url);
  const messages: ChatMessage[] = [
    { role: 'system', content: buildConvertSystem(apiDocs) },
    { role: 'user', content: buildConvertUser(code) },
  ];

  const maxTokens = maxTokensFor(code);
  const first = await askModel(key, model, messages, maxTokens);
  if ('error' in first) return json({ error: first.error }, 502);
  let answer = first.answer;

  // A program that still calls a p5-only function crashes ("loadImage is not defined"). Ask once more
  // with the names spelled out (seen live 2026-11-17: preload() + loadImage() kept). Same conversion,
  // not counted twice; if the second try fails or is worse, the first answer stands.
  let leftover = leftoverP5Calls(answer.code);
  if (leftover.length) {
    const second = await askModel(key, model, [
      ...messages,
      { role: 'assistant', content: first.text },
      { role: 'user', content: buildRepairUser(leftover) },
    ], maxTokens);
    if (!('error' in second)) {
      const again = leftoverP5Calls(second.answer.code);
      if (again.length < leftover.length) { answer = second.answer; leftover = again; }
    }
  }
  const warnings = leftover.length
    ? [`This program still uses ${leftover.join(', ')}, which moSHion does not have. It will stop with "is not defined" until you change those lines.`]
    : [];
  return json({ code: answer.code, notes: answer.notes, warnings, model, remaining });
};

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** One call to OpenRouter. Returns the parsed program, or a plain-words error. */
async function askModel(
  key: string,
  model: string,
  messages: ChatMessage[],
  maxTokens: number,
): Promise<{ answer: ConvertAnswer; text: string } | { error: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        'X-Title': 'moSHion converter',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        // Sized to the program (maxTokensFor): room for the thinking and the whole program, since an
        // answer cut off at the limit is a program cut off in the middle, but not so much that OpenRouter's
        // up-front hold on the balance refuses the request.
        max_tokens: maxTokens,
        reasoning: { effort: 'low', exclude: true },
        provider: { data_collection: 'deny' },
      }),
    });
  } catch (err) {
    clearTimeout(timer);
    const aborted = (err as Error)?.name === 'AbortError';
    console.error('p5play-convert fetch failed:', err);
    return { error: aborted ? 'The AI took too long. Try again, or try a shorter program.' : 'Could not reach the AI service. Try again in a moment.' };
  }
  clearTimeout(timer);

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 300);
    console.error('p5play-convert upstream', res.status, detail);
    if (res.status === 402) {
      // The site's OpenRouter account is out of credit: nothing a student can fix by retrying.
      return { error: 'Converting is paused: the site\'s AI account needs more credit. Tell your teacher.' };
    }
    const busy = res.status === 429 || res.status === 503;
    return { error: busy ? 'The AI service is busy. Try again in a minute.' : 'The AI service could not convert that program. Try again.' };
  }

  let out: { choices?: Array<{ message?: { content?: unknown }; finish_reason?: string }> };
  try {
    out = await res.json();
  } catch {
    return { error: 'The AI service sent back something that could not be read. Try again.' };
  }
  const choice = out.choices?.[0];
  const text = typeof choice?.message?.content === 'string' ? choice.message.content : '';
  if (choice?.finish_reason === 'length') {
    return { error: 'The converted program came out too long and was cut off. Try converting a shorter program.' };
  }
  const answer = parseConvertAnswer(text);
  if (!answer) {
    console.error('p5play-convert: no program in the answer', { finish: choice?.finish_reason, length: text.length });
    return { error: 'The AI did not send back a program. Try again.' };
  }
  return { answer, text };
}
