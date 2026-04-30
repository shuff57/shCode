// POST /api/grade-written — proxies the AI essay grading call to Ollama's
// hosted cloud API. Runs on Cloudflare Pages Functions, not in the static
// Next bundle, so the OLLAMA_API_KEY secret stays server-side.
//
// Set the secret once per project:
//
//   npx wrangler pages secret put OLLAMA_API_KEY --project-name shcode
//
// The middleware at functions/_middleware.ts already gates this on a valid
// session cookie, so only signed-in students hit this.

import {
  buildPrompt,
  parseModelJson,
  shapeResult,
  validateRequest,
  type GradeRequest,
} from '../../lib/grade-written-core';
import { isLessonAccessible, lockedResponse, type SessionData } from '../_shared/lessonAccess';

interface Env {
  DB: D1Database;
  OLLAMA_API_KEY: string;
  // Optional override — defaults to https://ollama.com when unset.
  OLLAMA_HOST?: string;
  ASSETS?: Fetcher;
}

type Ctx = EventContext<Env, string, SessionData>;

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env, data } = context;

  if (!env.OLLAMA_API_KEY) {
    return json(
      {
        ok: false,
        error: 'Server is missing OLLAMA_API_KEY. Ask your teacher to configure it.',
        offline: true,
      },
      503,
    );
  }

  let body: GradeRequest;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const invalid = validateRequest(body);
  if (invalid) return json({ ok: false, error: invalid }, 400);

  if (!(await isLessonAccessible(env, request, data.role, data.email, body.lessonId))) {
    return lockedResponse();
  }

  const host = env.OLLAMA_HOST || 'https://ollama.com';
  const model = body.model || 'qwen3-coder-next:cloud';
  const { system, user } = buildPrompt(body);

  // 180s timeout — the cloud can be slow on a cold model. Cloudflare Pages
  // Functions on the free plan allow up to 30s of CPU but wall-clock can be
  // longer while awaiting an external fetch; if this consistently times out
  // we'll need to switch to a faster model or a streamed response.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000);

  let raw: string;
  try {
    const res = await fetch(`${host}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        stream: false,
        format: 'json',
        options: { temperature: 0.2 },
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      return json(
        { ok: false, error: `Ollama ${res.status}: ${text.slice(0, 300)}` },
        502,
      );
    }
    const data = (await res.json()) as { message?: { content?: string } };
    raw = data.message?.content || '';
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return json({ ok: false, error: `Ollama call failed: ${msg}` }, 502);
  } finally {
    clearTimeout(timeout);
  }

  const parsed = parseModelJson(raw);
  if (!parsed) {
    return json(
      { ok: false, error: 'Model did not return JSON. Try again.', raw: raw.slice(0, 500) },
      502,
    );
  }

  return json(shapeResult(parsed, body.rubric));
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
