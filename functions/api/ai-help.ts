// POST /api/ai-help — streams q5play coding help from Ollama. Builds the
// prompt from the student's current code, the most recent runtime error
// (if any), and a keyword-targeted slice of the q5play docs.
//
// Auth: gated by functions/_middleware.ts (session cookie required).
// Streaming: response is text/plain; chunks are the model's content tokens.

import { findRelevantDocs, type RelevantDoc } from '../../lib/q5play-docs';

interface Env {
  OLLAMA_API_KEY: string;
  OLLAMA_HOST?: string;
}

interface ErrorInfo {
  name?: string;
  message?: string;
  file?: string | null;
  line?: number | null;
  col?: number | null;
  snippet?: string;
}

interface HelpRequest {
  lessonTitle?: string;
  fileName?: string;
  code: string;
  error?: ErrorInfo | null;
  query?: string;
}

type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, string, SessionData>;

const STOPWORDS = new Set([
  'is', 'not', 'a', 'an', 'the', 'of', 'to', 'in', 'on', 'at', 'for', 'and',
  'or', 'but', 'with', 'as', 'be', 'been', 'cannot', 'can', 'do', 'does',
  'function', 'object', 'string', 'number', 'undefined', 'null', 'true',
  'false', 'this', 'that', 'it', 'if', 'else', 'return', 'var', 'let',
  'const', 'new', 'read', 'reading', 'properties', 'property', 'value',
  'values', 'type', 'typeerror', 'referenceerror', 'syntaxerror', 'rangeerror',
  'error', 'unhandled', 'rejection', 'help', 'me', 'my', 'how', 'why',
  'what', 'i', 'you', 'we', 'so', 'too', 'too', 'when', 'where',
]);

function extractKeywords(req: HelpRequest): string[] {
  const out: string[] = [];
  const push = (s: string | null | undefined) => {
    if (!s) return;
    const matches = s.match(/[A-Za-z_][A-Za-z0-9_]{1,}/g) || [];
    for (const m of matches) {
      const lower = m.toLowerCase();
      if (lower.length < 2) continue;
      if (STOPWORDS.has(lower)) continue;
      out.push(m);
    }
  };
  if (req.error) {
    push(req.error.message);
    push(req.error.snippet);
  }
  push(req.query);
  // Also pull a few identifiers from the source line nearest to the error so
  // we get q5play-specific terms (Sprite, kb, world, etc.).
  if (req.error?.line && req.code) {
    const lines = req.code.split('\n');
    const idx = Math.max(0, (req.error.line || 1) - 1);
    push(lines[idx]);
    push(lines[idx - 1]);
    push(lines[idx + 1]);
  }
  return out;
}

function buildPrompt(req: HelpRequest, docs: RelevantDoc[]): { system: string; user: string } {
  const system = [
    'You are a friendly tutor helping a high-school student debug a q5play sketch.',
    'q5play is q5.js (a p5-like drawing API) with Box2D physics. Sketches define setup(), update(), and draw() at the top level.',
    'Be concise and concrete. Point at the exact line. Quote q5play docs only when they are relevant.',
    'Prefer minimal fixes. Do not lecture. Use a short code block when showing a fix.',
    'If the error is a typo or missing variable, say so plainly.',
  ].join(' ');

  const parts: string[] = [];
  if (req.lessonTitle) parts.push(`Lesson: ${req.lessonTitle}`);
  if (req.fileName) parts.push(`File: ${req.fileName}`);

  parts.push('\n## Student code\n```js\n' + (req.code || '').slice(0, 8000) + '\n```');

  if (req.error && (req.error.message || req.error.line)) {
    const e = req.error;
    const loc = e.file ? `${e.file}:${e.line ?? '?'}${e.col ? `:${e.col}` : ''}` : '';
    parts.push(
      [
        '\n## Runtime error',
        `${e.name || 'Error'}: ${e.message || '(no message)'}`,
        loc ? `Location: ${loc}` : '',
        e.snippet ? `Source line: ${e.snippet}` : '',
      ]
        .filter(Boolean)
        .join('\n'),
    );
  }

  if (docs.length > 0) {
    parts.push('\n## Relevant q5play docs');
    for (const d of docs) {
      parts.push(`### ${d.pageTitle}  (${d.sectionTitle})`);
      parts.push(d.body);
      if (d.code) parts.push('```js\n' + d.code + '\n```');
    }
  }

  parts.push('\n## Student question');
  parts.push((req.query && req.query.trim()) || "What is wrong with my code, and how do I fix it?");

  return { system, user: parts.join('\n') };
}

export const onRequestPost: PagesFunction<Env, string, SessionData> = async (context: Ctx) => {
  const { request, env } = context;

  if (!env.OLLAMA_API_KEY) {
    return json(
      { error: 'Server is missing OLLAMA_API_KEY. Ask your teacher to configure it.' },
      503,
    );
  }

  let body: HelpRequest;
  try {
    body = (await request.json()) as HelpRequest;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!body || typeof body.code !== 'string') {
    return json({ error: 'code (string) is required' }, 400);
  }
  if (body.code.length > 60_000) {
    return json({ error: 'code is too large' }, 413);
  }

  const keywords = extractKeywords(body);
  const docs = findRelevantDocs(keywords, 6);
  const { system, user } = buildPrompt(body, docs);

  const host = env.OLLAMA_HOST || 'https://ollama.com';
  const model = 'qwen3-coder-next:cloud';

  const upstream = await fetch(`${host}/api/chat`, {
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
      stream: true,
      options: { temperature: 0.3 },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => '');
    return json(
      { error: `Ollama ${upstream.status}: ${text.slice(0, 300)}` },
      502,
    );
  }

  // Forward Ollama's NDJSON stream, unwrapping each line and emitting only
  // the .message.content piece as plain text.
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buf = '';
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          let nl = buf.indexOf('\n');
          while (nl >= 0) {
            const line = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            nl = buf.indexOf('\n');
            if (!line) continue;
            try {
              const obj = JSON.parse(line) as { message?: { content?: string } };
              const piece = obj.message?.content;
              if (piece) controller.enqueue(encoder.encode(piece));
            } catch {
              // skip malformed line
            }
          }
        }
        if (buf.trim()) {
          try {
            const obj = JSON.parse(buf) as { message?: { content?: string } };
            const piece = obj.message?.content;
            if (piece) controller.enqueue(encoder.encode(piece));
          } catch {
            /* ignore */
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
