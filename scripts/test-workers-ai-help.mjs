// The tutor (POST /api/ai-help, which also serves the flowchart hints) goes through Cloudflare
// Workers AI whenever the deploy has the `AI` binding, the same transport the grader uses
// (scripts/test-workers-ai-grader.mjs). Ollama stays only as the fallback when there is no binding.
//
//   1. With the binding, the tutor calls it (default gemma-4-26b-a4b-it, GRADE_WRITTEN_WORKERS_MODEL
//      overrides) with stream:true, and never touches Ollama even when a key is set.
//   2. Both frame shapes a model streams ({response} and OpenAI-style choices[].delta.content) come out
//      as plain text, reasoning is dropped, [DONE] and junk frames are ignored.
//   3. A binding that fails is a plain student-readable error, never a stack or an account name.
//   4. No binding and no key is an honest 503; no binding with a key still works through Ollama.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (c, m) => {
  if (c) console.log('  PASS ' + m);
  else { failures++; console.log('  FAIL ' + m); }
};
const DEFAULT_MODEL = '@cf/google/gemma-4-26b-a4b-it';

const out = mkdtempSync(path.join(tmpdir(), 'shcode-workers-help-'));
try {
  try {
    execFileSync(process.execPath, [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'functions/api/ai-help.ts', 'lib/ollama.ts', 'lib/workers-ai.ts',
      '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--moduleResolution', 'node',
      '--skipLibCheck', '--resolveJsonModule',
    ], { cwd: root, stdio: 'pipe' });
  } catch { /* ambient Cloudflare types; the JS is still written */ }
  const require = createRequire(import.meta.url);
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const aiHelp = require(path.join(out, 'functions', 'api', 'ai-help.js'));
  const wai = require(path.join(out, 'lib', 'workers-ai.js'));

  const enc = new TextEncoder();
  const sse = (...frames) => new ReadableStream({
    start(c) { for (const f of frames) c.enqueue(enc.encode(f)); c.close(); },
  });
  const drain = async (res) => (await res.text());

  const db = () => ({
    prepare() {
      const s = { bind: () => s, first: async () => ({ count: 0 }), run: async () => ({}), all: async () => ({ results: [] }) };
      return s;
    },
  });
  const makeEnv = ({ run, model, key, ai = true } = {}) => {
    const seen = [];
    return {
      seen,
      env: {
        DB: db(),
        ...(ai ? { AI: { async run(m, inputs) { seen.push({ model: m, inputs }); return run ? run(m, inputs) : sse('data: {"response":"A hint."}\n\n', 'data: [DONE]\n\n'); } } } : {}),
        ...(model ? { GRADE_WRITTEN_WORKERS_MODEL: model } : {}),
        ...(key ? { OLLAMA_API_KEY: key, OLLAMA_HOST: 'http://127.0.0.1:9' } : {}),
        AI_HELP_DAILY_LIMIT: '10',
        AI_HELP_GLOBAL_DAILY_LIMIT: '99999',
        ASSETS: { fetch: async () => new Response(JSON.stringify({ lessons: [] }), { headers: { 'Content-Type': 'application/json' } }) },
      },
    };
  };
  const ask = (env) => aiHelp.onRequestPost({
    request: new Request('https://example.test/api/ai-help', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'let x = 1;', query: 'Why is this wrong?' }),
    }),
    env, data: { email: 'kid@example.test', role: 'student' }, params: {}, waitUntil: () => {},
    next: async () => new Response(''), functionPath: '/api/ai-help', providedRoles: [],
  });

  // 1: the binding is the transport
  {
    const { env, seen } = makeEnv({ key: 'unused' });
    const res = await ask(env);
    const text = await drain(res);
    ok(res.status === 200 && text === 'A hint.', `binding answers (HTTP ${res.status}, "${text}")`);
    ok(seen.length === 1 && seen[0].model === DEFAULT_MODEL, `default model is ${DEFAULT_MODEL}`);
    ok(seen[0]?.inputs.stream === true, 'asks for a stream');
    ok(seen[0]?.inputs.chat_template_kwargs?.enable_thinking === false, 'thinking is switched off');
    const user = (seen[0]?.inputs.messages || []).find((m) => m.role === 'user')?.content || '';
    ok(user.includes('let x = 1;'), "the student's code reaches the model");
  }
  {
    const { env, seen } = makeEnv({ model: '@cf/meta/other-model' });
    await drain(await ask(env));
    ok(seen[0]?.model === '@cf/meta/other-model', 'GRADE_WRITTEN_WORKERS_MODEL overrides the model');
  }

  // 2: frame shapes
  {
    const frames = [
      'data: {"choices":[{"delta":{"reasoning_content":"thinking..."}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"First "}}]}\n\n',
      'data: not json\n\n',
      'data: {"response":"second "}\n\n',
      'data: {"choices":[{"delta":{"content":"third."}}]}\n\ndata: [DONE]\n\n',
    ];
    const s = await wai.workersChatStream({ ai: { run: async () => sse(...frames) }, messages: [] });
    const text = await drain(new Response(s));
    ok(text === 'First second third.', `both frame shapes, reasoning dropped, junk skipped ("${text}")`);
    // a frame split across two chunks
    const split = await wai.workersChatStream({ ai: { run: async () => sse('data: {"respo', 'nse":"joined"}\n', '\n') }, messages: [] });
    ok((await drain(new Response(split))) === 'joined', 'a frame split across chunks is joined');
    // a non-stream answer
    const whole = await wai.workersChatStream({ ai: { run: async () => ({ response: 'whole answer' }) }, messages: [] });
    ok((await drain(new Response(whole))) === 'whole answer', 'a whole (non-stream) answer is passed through');
  }

  // 3: failure
  {
    const { env } = makeEnv({ run: async () => { throw new Error('3021: rate limiting, account acme-school'); } });
    const res = await ask(env);
    const body = await res.json();
    ok(res.status === 503 && /usage limit/i.test(body.error) && !/acme|3021/.test(body.error), `rate limit is a plain 503 (${res.status}: ${body.error})`);
  }
  {
    const { env } = makeEnv({ run: async () => { throw new Error('boom internal detail'); } });
    const res = await ask(env);
    const body = await res.json();
    ok(res.status === 502 && !/boom/.test(body.error), `other failure is a plain 502 (${res.status}: ${body.error})`);
  }

  // 4: no binding
  {
    const { env } = makeEnv({ ai: false });
    const res = await ask(env);
    ok(res.status === 503, `no binding and no key is a 503 (got ${res.status})`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) { console.error(`\n${failures} failure(s)`); process.exit(1); }
console.log('workers-ai tutor: all checks passed');
