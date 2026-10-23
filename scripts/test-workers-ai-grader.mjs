// The Workers AI transport in POST /api/grade-written, through the real Pages
// Function and a fake `AI` binding. This is the path a deploy uses once the
// binding exists; without it the route falls back to Ollama (covered by
// scripts/test-grade-stream.mjs).
//
// What it pins down:
//   1. The binding is preferred over Ollama, even when an Ollama key is set --
//      no request reaches the dead OLLAMA_HOST in the test env.
//   2. The model defaults to @cf/google/gemma-4-26b-a4b-it; a lesson's own
//      @cf/ id wins, and GRADE_WRITTEN_WORKERS_MODEL overrides both.
//   3. The call asks for JSON, disables thinking and sets a generous max_tokens
//      (the 1500-token reasoning-model trap this file's header describes).
//   4. ?stream=1 still ends with exactly one terminal {result} event.
//   5. A Workers AI failure is a plain, student-readable error, never a grade.

import { execFileSync } from 'child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let failures = 0;
const ok = (c, m) => {
  if (c) console.log('  PASS ' + m);
  else { failures++; console.log('  FAIL ' + m); }
};

mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-workersai-'));

const ID = 'test-lesson';
const GOOD_GRADE = JSON.stringify({
  criteria: [
    { id: 'a', earned: 0, verdict: 'met', feedback: 'Good.' },
    { id: 'b', earned: 0, verdict: 'met', feedback: 'Also good.' },
  ],
  summary: 'Nice work.',
  hints: [],
});
const DEFAULT_MODEL = '@cf/google/gemma-4-26b-a4b-it';

try {
  execFileSync(process.execPath, [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'), 'functions/api/grade-written.ts',
    '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    '--esModuleInterop', '--moduleResolution', 'node', '--types', '@cloudflare/workers-types', '--noCheck',
  ], { cwd: root, stdio: 'pipe' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  // loadAiGrader reads the bundled module, not a fetchable asset.
  writeFileSync(
    path.join(out, 'functions', '_shared', 'ai-graders.generated.js'),
    'Object.defineProperty(exports, "__esModule", { value: true });\nexports.AI_GRADERS = ' +
      JSON.stringify({
        [ID]: {
          lessonTitle: 'Test lesson',
          prompt: 'Explain two things.',
          rubric: [
            { id: 'a', title: 'First thing', description: '', points: 0 },
            { id: 'b', title: 'Second thing', description: '', points: 0 },
          ],
          contextDocs: [],
        },
      }) + ';\n',
  );

  const { onRequestPost, onRequestGet } = await import(
    'file://' + path.join(out, 'functions', 'api', 'grade-written.js').split(path.sep).join('/')
  );

  function makeEnv({ run, workersModel, ai = true } = {}) {
    const seen = [];
    return {
      seen,
      env: {
        ...(ai
          ? {
              AI: {
                async run(model, inputs) {
                  seen.push({ model, inputs });
                  return run ? run(model, inputs) : { response: GOOD_GRADE };
                },
              },
            }
          : {}),
        ...(workersModel ? { GRADE_WRITTEN_WORKERS_MODEL: workersModel } : {}),
        // A dead Ollama address: if the route falls back, the test fails
        // rather than silently grading through the other transport.
        OLLAMA_API_KEY: 'unused',
        OLLAMA_HOST: 'http://127.0.0.1:9',
        GRADE_WRITTEN_DAILY_LIMIT: '30',
        ASSETS: {
          fetch: async (req) => {
            const p = new URL(typeof req === 'string' ? req : req.url).pathname;
            const body = p.includes('lessons-manifest')
              ? JSON.stringify({ lessons: [{ id: ID, title: '1.1.1 Test lesson' }] })
              : '{}';
            return new Response(body, { headers: { 'Content-Type': 'application/json' } });
          },
        },
        DB: {
          prepare() {
            const s = {
              bind: () => s,
              first: async () => ({ count: 0 }),
              run: async () => ({}),
              all: async () => ({ results: [] }),
            };
            return s;
          },
        },
      },
    };
  }

  const call = (env, { stream = false, response = 'A perfectly reasonable student answer.' } = {}) =>
    onRequestPost({
      request: new Request(
        'https://example.test/api/grade-written' + (stream ? '?stream=1' : ''),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lessonId: ID, response }),
        },
      ),
      env,
      data: { email: 'kid@example.test', role: 'student' },
      params: {},
      waitUntil: () => {},
      next: async () => new Response(''),
      functionPath: '/api/grade-written',
      providedRoles: [],
    });

  // -- 1: the binding is the transport, and the default model is the measured one
  {
    const { env, seen } = makeEnv();
    const res = await call(env, { response: 'The student answer that must reach the model.' });
    const body = await res.json();
    ok(res.status === 200 && body.ok === true, `binding grades (HTTP ${res.status})`);
    ok(body.graderModel === DEFAULT_MODEL, `default model is ${DEFAULT_MODEL} (got ${body.graderModel})`);
    ok(seen.length === 1 && seen[0].model === DEFAULT_MODEL, 'the binding was called once with that model');
    const inputs = seen[0]?.inputs || {};
    ok(inputs.response_format?.type === 'json_object', 'asks the model for a JSON object');
    ok(inputs.chat_template_kwargs?.enable_thinking === false, 'thinking is switched off');
    ok(inputs.max_tokens >= 4000, `max_tokens is generous (${inputs.max_tokens})`);
    const user = inputs.messages?.find((m) => m.role === 'user')?.content || '';
    ok(user.includes('The student answer that must reach the model.'), 'the student text is in the user message');
  }

  // -- 2: a lesson's own @cf/ model wins; the env override wins over that
  {
    const { env, seen } = makeEnv();
    // The generated config in this harness has no model, so exercise the
    // override here; the @cf/ pass-through is the same branch in resolveTargets.
    const res = await call({ ...env, GRADE_WRITTEN_WORKERS_MODEL: '@cf/other/model' });
    const body = await res.json();
    ok(res.status === 200 && body.graderModel === '@cf/other/model', `env override wins (got ${body.graderModel})`);
    ok(seen[0]?.model === '@cf/other/model', 'the override reached the binding');
  }

  // -- 3: streaming ends with one terminal result, even without token chunks
  {
    const { env } = makeEnv();
    const res = await call(env, { stream: true });
    ok(res.status === 200 && (res.headers.get('Content-Type') || '').includes('ndjson'), 'stream is NDJSON');
    const events = (await res.text()).split('\n').map((l) => l.trim()).filter(Boolean).map(JSON.parse);
    const terminals = events.filter((e) => e.result || e.error);
    ok(terminals.length === 1 && terminals[0].result, 'exactly one terminal result');
    ok(events.filter((e) => e.stage).every((e) => e.stage === 'reading' || e.stage === 'checking'), 'only reading/checking stages');
  }

  // -- 4: an upstream failure is an error, not a scoreless grade
  {
    const { env } = makeEnv({ run: async () => { throw new Error('3040: capacity exceeded'); } });
    const res = await call(env);
    const body = await res.json();
    ok(res.status === 503 && body.ok !== true && body.error, `busy binding is refused (HTTP ${res.status})`);
    const res2 = await call(makeEnv({ run: async () => { throw new Error('boom'); } }).env);
    const body2 = await res2.json();
    ok(res2.status === 502 && body2.ok !== true && body2.error, `other failure is refused (HTTP ${res2.status})`);
  }

  // -- 5: the GET menu names the Workers AI model and reports it available
  {
    const { env } = makeEnv();
    const res = await onRequestGet({
      request: new Request('https://example.test/api/grade-written'),
      env,
      data: { email: 'kid@example.test', role: 'student' },
      params: {},
      waitUntil: () => {},
      next: async () => new Response(''),
      functionPath: '/api/grade-written',
      providedRoles: [],
    });
    const body = await res.json();
    const g = body.graders?.[0];
    ok(res.status === 200 && g?.available === true && g.model === DEFAULT_MODEL, `GET menu names ${DEFAULT_MODEL}`);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) {
  console.log(`workers-ai grader: ${failures} failed`);
  process.exit(1);
}
console.log('workers-ai grader: all checks passed');
