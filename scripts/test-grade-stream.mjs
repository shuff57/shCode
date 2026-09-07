// End-to-end test for the NDJSON progress stream on POST /api/grade-written.
//
// Runs the REAL Pages Function against a stub Ollama, so the thing under test
// is the shipped code path rather than a re-implementation of it. The stub
// removes the need for a production secret -- see the note in CLAUDE.md about
// pointing OLLAMA_HOST at a local server.
//
// What it pins down, each of which was a decision worth not losing:
//   1. ?stream=1 answers NDJSON, and the LAST line is the terminal event.
//   2. Stage order is monotonic: reading -> thinking -> writing -> checking.
//   3. The grade is emitted ONCE, whole, at the end -- never a partial verdict.
//   4. Guards that refuse (rate limit, no grader configured) still answer plain
//      JSON with a real status. Streaming must not swallow a 429 into a 200.
//   5. A model reply with no criteria is an error event, not a scoreless grade.
//   6. No ?stream=1 -> unchanged single-object JSON, for older clients.

import { execFileSync } from 'child_process';
import { createServer } from 'http';
import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

let failures = 0;
const ok = (cond, msg) => {
  if (cond) {
    console.log('  PASS ' + msg);
  } else {
    failures++;
    console.log('  FAIL ' + msg);
  }
};

// ---------------------------------------------------------------------------
// Stub Ollama. Streams NDJSON chunks the way ollama /api/chat does.
function startStub(chunks, { status = 200 } = {}) {
  // `seen` is how the grader-target tests prove WHICH server got the call and
  // with which model + auth header -- the only evidence that the dropdown is
  // routing rather than just relabelling.
  const seen = [];
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      let raw = '';
      req.on('data', (d) => { raw += d; });
      req.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch {}
        seen.push({
          auth: req.headers.authorization ?? null,
          model: parsed?.model ?? null,
          stream: parsed?.stream ?? null,
        });
      });
      if (status !== 200) {
        res.writeHead(status, { 'Content-Type': 'text/plain' });
        res.end('stub failure');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
      let i = 0;
      const tick = () => {
        if (i >= chunks.length) {
          res.end();
          return;
        }
        res.write(JSON.stringify({ message: { content: chunks[i++] } }) + '\n');
        setTimeout(tick, 5);
      };
      tick();
    });
    srv.listen(0, '127.0.0.1', () => resolve({ srv, seen, port: srv.address().port }));
  });
}

// ---------------------------------------------------------------------------
// Compile the Function + its deps to CommonJS so Node can load them, same
// trick as test-grader.mjs.
const out = mkdtempSync(path.join(tmpdir(), 'shcode-gradestream-'));

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'functions/api/grade-written.ts',
      '--outDir', out,
      '--module', 'commonjs',
      '--target', 'es2022',
      '--skipLibCheck',
      '--esModuleInterop',
      '--moduleResolution', 'node',
      // The Function leans on Cloudflare's ambient globals (D1Database,
      // Fetcher, PagesFunction). A bare tsc has no idea what those are, so
      // pull in the same types functions/tsconfig.json uses.
      '--types', '@cloudflare/workers-types',
      // Emit only -- do NOT type-check here. `tsc --noEmit -p tsconfig.json`
      // already checks this file under the project's own settings; repeating
      // it with hand-rolled flags just reports differences between the two
      // configs (PagesFunction's generic constraint, for one) as if they were
      // real errors. This step wants the JavaScript, nothing else.
      '--noCheck',
    ],
    { cwd: root, stdio: 'pipe' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');

  const modPath = path.join(out, 'functions', 'api', 'grade-written.js');
  const { onRequestPost, onRequestGet } = await import('file://' + modPath.split(path.sep).join('/'));

  const RUBRIC = [
    { id: 'a', title: 'First thing', description: '', points: 0 },
    { id: 'b', title: 'Second thing', description: '', points: 0 },
  ];

  // Minimal fakes for the bits the Function reaches for. loadAiGrader reads
  // through env.ASSETS, so serve the generated graders file from memory.
  const graderJson = JSON.stringify({
    'test-lesson': {
      lessonTitle: 'Test lesson',
      prompt: 'Explain two things.',
      rubric: RUBRIC,
      model: 'stub-model',
      contextDocs: [],
    },
  });

  // A stand-in for the Workers AI binding. `mode` decides what env.AI.run()
  // does, because the three behaviours that matter cannot be provoked against
  // the real service on demand: a normal grade, the 3021 per-minute cap, and a
  // reply truncated inside the reasoning block.
  function makeAi(mode = 'ok', seen = []) {
    return {
      calls: seen,
      async run(model, opts) {
        seen.push({ model, stream: !!opts.stream, maxTokens: opts.max_tokens });
        if (mode === 'ratelimit') {
          throw new Error('3021: rate limiting: inference request per min rate reached');
        }
        const content = mode === 'truncated' ? null : GOOD_GRADE;
        const finish = mode === 'truncated' ? 'length' : 'stop';
        if (!opts.stream) {
          return { choices: [{ message: { content }, finish_reason: finish }] };
        }
        // Streaming answers Server-Sent Events, not bare NDJSON. These frames
        // are the shapes the live service actually sent on 2026-09-05, captured
        // off @cf/google/gemma-4-26b-a4b-it, not an invented approximation:
        //
        //   1. an opening frame with delta.content === "" and role
        //   2. REASONING tokens arriving as delta.reasoning_content, never as
        //      delta.content -- accumulating those would put the model's
        //      thinking inside the grade
        //   3. the answer as delta.content
        //   4. a terminal frame shaped { response: "" } -- an empty string, so
        //      a `??` chain that prefers `response` must not treat it as text
        //   5. data: [DONE]
        const lines = [];
        lines.push('data: ' + JSON.stringify({
          choices: [{ delta: { content: '', reasoning_content: null, role: 'assistant' }, finish_reason: null }],
        }));
        lines.push('data: ' + JSON.stringify({
          choices: [{ delta: { reasoning_content: 'Checking the rubric.' }, finish_reason: null }],
        }));
        if (content) {
          for (const piece of content.match(/[\s\S]{1,40}/g)) {
            lines.push('data: ' + JSON.stringify({
              choices: [{ delta: { content: piece }, finish_reason: null }],
            }));
          }
        }
        lines.push('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: finish }] }));
        lines.push('data: ' + JSON.stringify({ response: '', usage: { neurons: 2.8 } }));
        lines.push('data: [DONE]');
        const body = lines.join('\n') + '\n';
        return new ReadableStream({
          start(c) {
            c.enqueue(new TextEncoder().encode(body));
            c.close();
          },
        });
      },
    };
  }

  function makeEnv({
    rateCount = 0,
    host,
    cloudKey = 'stub-key',
    localHost,
    localModel,
    localKey,
    ai,
    workersModel,
  }) {
    return {
      AI: ai,
      WORKERS_AI_MODEL: workersModel,
      OLLAMA_API_KEY: cloudKey,
      OLLAMA_HOST: host,
      OLLAMA_LOCAL_HOST: localHost,
      OLLAMA_LOCAL_MODEL: localModel,
      OLLAMA_LOCAL_API_KEY: localKey,
      GRADE_WRITTEN_DAILY_LIMIT: '30',
      // Both loadAiGrader and isLessonAccessible read static JSON through
      // env.ASSETS, so the stub has to route by pathname -- handing the
      // graders file to the manifest fetch makes the access gate throw.
      ASSETS: {
        fetch: async (req) => {
          const p = new URL(typeof req === 'string' ? req : req.url).pathname;
          const body = p.includes('lessons-manifest')
            ? JSON.stringify({ lessons: [{ id: 'test-lesson', title: '1.1.1 Test lesson' }] })
            : graderJson;
          return new Response(body, { headers: { 'Content-Type': 'application/json' } });
        },
      },
      DB: {
        prepare(sql) {
          const stmt = {
            bind: () => stmt,
            first: async () => (/SELECT count/.test(sql) ? { count: rateCount } : null),
            run: async () => ({}),
            all: async () => ({ results: [] }),
          };
          return stmt;
        },
      },
    };
  }

  async function call(env, {
    stream = true,
    response = 'A perfectly reasonable student answer about two things.',
    grader,
  } = {}) {
    const url = 'https://example.test/api/grade-written' + (stream ? '?stream=1' : '');
    const body = { lessonId: 'test-lesson', response };
    // Omitted entirely when unset -- that is the shape a client from before
    // the picker sends, and it has to keep working.
    if (grader !== undefined) body.grader = grader;
    const request = new Request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return onRequestPost({
      request,
      env,
      data: { email: 'kid@example.test', role: 'student' },
      params: {},
      waitUntil: () => {},
      next: async () => new Response(''),
      functionPath: '/api/grade-written',
providedRoles: [],
    });
  }

  async function callGet(env) {
    return onRequestGet({
      request: new Request('https://example.test/api/grade-written', { method: 'GET' }),
      env,
      data: { email: 'kid@example.test', role: 'student' },
      params: {},
      waitUntil: () => {},
      next: async () => new Response(''),
      functionPath: '/api/grade-written',
      providedRoles: [],
    });
  }

  async function readNdjson(res) {
    const text = await res.text();
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => JSON.parse(l));
  }

  const GOOD_GRADE = JSON.stringify({
    criteria: [
      { id: 'a', earned: 0, verdict: 'met', feedback: 'Good.' },
      { id: 'b', earned: 0, verdict: 'met', feedback: 'Also good.' },
    ],
    summary: 'Nice work.',
    hints: ['Revisit the first idea.'],
  });

  // -- 1/2/3: happy path, stage order, single whole grade ------------------
  {
    console.log('happy path');
    // Split the JSON across many chunks so the stream really is incremental.
    const chunks = GOOD_GRADE.match(/[\s\S]{1,40}/g);
    const { srv, port } = await startStub(chunks);
    const res = await call(makeEnv({ host: `http://127.0.0.1:${port}` }));
    ok(res.status === 200, 'status 200');
    ok((res.headers.get('Content-Type') || '').includes('ndjson'), 'content-type is ndjson');

    const events = await readNdjson(res);
    const stages = events.filter((e) => e.stage).map((e) => e.stage);
    const terminals = events.filter((e) => e.result || e.error);

    ok(stages[0] === 'reading', 'first stage is reading, got ' + stages[0]);
    ok(stages.includes('thinking'), 'thinking reported');
    ok(stages.includes('writing'), 'writing reported (tokens actually flowed)');
    ok(stages[stages.length - 1] === 'checking', 'last stage is checking');

    const order = ['reading', 'thinking', 'writing', 'checking'];
    let mono = true;
    let seen = -1;
    for (const s of stages) {
      const idx = order.indexOf(s);
      if (idx < seen) mono = false;
      seen = Math.max(seen, idx);
    }
    ok(mono, 'stages never go backwards');

    ok(terminals.length === 1, 'exactly one terminal event, got ' + terminals.length);
    ok(!!terminals[0].result, 'terminal is a result');
    ok(events[events.length - 1] === terminals[0], 'terminal is the LAST line');
    ok(terminals[0].result.criteria.length === 2, 'grade carries both criteria');
    ok(terminals[0].result.criteria.every((c) => c.verdict === 'met'), 'verdicts survived shaping');
    // No partial grade ever leaked.
    ok(
      events.filter((e) => e.result).length === 1,
      'the grade appears exactly once, never partially',
    );
    srv.close();
  }

  // -- 4: a refusal keeps its real status and stays plain JSON -------------
  {
    console.log('rate limit is not swallowed by the stream');
    const { srv, port } = await startStub([GOOD_GRADE]);
    const res = await call(makeEnv({ host: `http://127.0.0.1:${port}`, rateCount: 999 }));
    ok(res.status === 429, 'status is 429, got ' + res.status);
    ok(
      !(res.headers.get('Content-Type') || '').includes('ndjson'),
      '429 is plain JSON, not a stream',
    );
    const body = await res.json();
    ok(body.rateLimited === true, 'body still carries rateLimited');
    srv.close();
  }

  // -- 5: a reply with no criteria is an error, not a scoreless grade ------
  {
    console.log('empty criteria becomes an error event');
    const { srv, port } = await startStub([JSON.stringify({ criteria: [], summary: '' })]);
    const res = await call(makeEnv({ host: `http://127.0.0.1:${port}` }));
    const events = await readNdjson(res);
    const terminal = events[events.length - 1];
    ok(!!terminal.error, 'terminal is an error');
    ok(!terminal.result, 'no result emitted');
    ok(/empty result/i.test(terminal.error), 'error names the cause: ' + terminal.error);
    srv.close();
  }

  // -- upstream failure surfaces as an error event ------------------------
  {
    console.log('upstream 500 becomes an error event');
    const { srv, port } = await startStub([], { status: 500 });
    const res = await call(makeEnv({ host: `http://127.0.0.1:${port}` }));
    ok(res.status === 200, 'stream already committed to 200');
    const events = await readNdjson(res);
    const terminal = events[events.length - 1];
    ok(!!terminal.error, 'terminal is an error, got ' + JSON.stringify(terminal));
    srv.close();
  }

  // -- 6: no ?stream=1 is unchanged ---------------------------------------
  {
    console.log('non-streaming path unchanged');
    const { srv, port } = await startStub([GOOD_GRADE]);
    const res = await call(makeEnv({ host: `http://127.0.0.1:${port}` }), { stream: false });
    ok(res.status === 200, 'status 200');
    ok(
      (res.headers.get('Content-Type') || '').includes('application/json'),
      'content-type is plain json',
    );
    const body = await res.json();
    ok(body.ok === true, 'single object with ok:true');
    ok(Array.isArray(body.criteria) && body.criteria.length === 2, 'criteria present');
    srv.close();
  }

  // -- 7: the menu reports what this deploy can actually run ---------------
  {
    console.log('GET lists the configured graders');
    const res = await callGet(makeEnv({ host: 'http://127.0.0.1:1' }));
    const body = await res.json();
    const byId = Object.fromEntries(body.graders.map((g) => [g.id, g]));
    ok(res.status === 200, 'status 200');
    ok(body.graders.length === 3, 'all three targets listed, got ' + body.graders.length);
    ok(
      body.graders.map((g) => g.id).join(',') === 'workersai,cloud,local',
      'listed in preference order, got ' + body.graders.map((g) => g.id).join(','),
    );
    ok(byId.workersai.available === false, 'workersai unavailable with no AI binding');
    ok(
      /AI binding/i.test(byId.workersai.unavailableReason || ''),
      'and points at the binding, not a variable: ' + byId.workersai.unavailableReason,
    );
    ok(byId.cloud.available === true, 'cloud available when the key is set');
    ok(byId.local.available === false, 'local unavailable with no OLLAMA_LOCAL_HOST');
    ok(
      /OLLAMA_LOCAL_HOST/.test(byId.local.unavailableReason || ''),
      'the reason names the missing var: ' + byId.local.unavailableReason,
    );
    ok(byId.local.model === null, 'an unavailable target names no model');
    ok(body.fallback === 'cloud', 'fallback is cloud');

    // Host set but model missing is the half-configured case -- it must not
    // read as ready, or the failure lands on a student mid-submission instead
    // of on the teacher setting it up.
    const half = await (await callGet(makeEnv({ localHost: 'http://127.0.0.1:1' }))).json();
    const halfLocal = half.graders.find((g) => g.id === 'local');
    ok(halfLocal.available === false, 'host without model is still unavailable');
    ok(
      /OLLAMA_LOCAL_MODEL/.test(halfLocal.unavailableReason || ''),
      'and says which var is missing: ' + halfLocal.unavailableReason,
    );

    const both = await (await callGet(
      makeEnv({ localHost: 'http://127.0.0.1:1', localModel: 'qwen-local' }),
    )).json();
    const bothLocal = both.graders.find((g) => g.id === 'local');
    ok(bothLocal.available === true, 'both vars set makes local available');
    ok(bothLocal.model === 'qwen-local', 'and names the local model');
  }

  // -- 8: the choice actually routes, and both targets stream --------------
  {
    console.log('grader=local reaches the local server, streaming');
    const cloud = await startStub(GOOD_GRADE.match(/[\s\S]{1,40}/g));
    const local = await startStub(GOOD_GRADE.match(/[\s\S]{1,40}/g));
    const env = makeEnv({
      host: `http://127.0.0.1:${cloud.port}`,
      localHost: `http://127.0.0.1:${local.port}`,
      localModel: 'qwen-local',
    });

    const res = await call(env, { grader: 'local' });
    ok((res.headers.get('Content-Type') || '').includes('ndjson'), 'local streams too');
    const events = await readNdjson(res);
    const stages = events.filter((e) => e.stage).map((e) => e.stage);
    ok(stages[0] === 'reading' && stages[stages.length - 1] === 'checking', 'full stage arc on local');
    ok(stages.includes('writing'), 'tokens flowed from the local server');

    const terminal = events[events.length - 1];
    ok(!!terminal.result, 'local produced a grade');
    ok(terminal.result.grader === 'local', 'the grade is stamped local, got ' + terminal.result.grader);
    ok(terminal.result.graderModel === 'qwen-local', 'and names the model that wrote it');

    ok(local.seen.length === 1, 'the LOCAL server got the call, got ' + local.seen.length);
    ok(cloud.seen.length === 0, 'the cloud server got nothing');
    ok(local.seen[0].model === 'qwen-local', 'local was asked for its own model id');
    ok(local.seen[0].stream === true, 'and asked to stream');
    // A bare Ollama on a tunnel has no auth; Bearer null is a 400 there.
    ok(local.seen[0].auth === null, 'no Authorization header when no local key is set');

    const res2 = await call(env, { grader: 'cloud' });
    const t2 = (await readNdjson(res2)).pop();
    ok(t2.result?.grader === 'cloud', 'cloud selection is stamped cloud');
    ok(cloud.seen.length === 1, 'and reached the cloud server');
    ok(cloud.seen[0].auth === 'Bearer stub-key', 'cloud still sends its key');

    cloud.srv.close();
    local.srv.close();
  }

  // -- 9: a local key is used when one IS configured -----------------------
  {
    console.log('a configured local key is sent');
    const local = await startStub([GOOD_GRADE]);
    const env = makeEnv({
      host: 'http://127.0.0.1:1',
      localHost: `http://127.0.0.1:${local.port}`,
      localModel: 'qwen-local',
      localKey: 'classroom-key',
    });
    await readNdjson(await call(env, { grader: 'local' }));
    ok(local.seen[0]?.auth === 'Bearer classroom-key', 'local key becomes a Bearer header');
    local.srv.close();
  }

  // -- 10: picking an unconfigured grader refuses BEFORE the stream --------
  {
    console.log('grader=local with nothing configured refuses, keeping its status');
    const cloud = await startStub([GOOD_GRADE]);
    const res = await call(makeEnv({ host: `http://127.0.0.1:${cloud.port}` }), { grader: 'local' });
    ok(res.status === 503, 'status is 503, got ' + res.status);
    ok(!(res.headers.get('Content-Type') || '').includes('ndjson'), 'refusal is plain JSON');
    const body = await res.json();
    ok(body.offline === true, 'offline:true so the client saves the answer for the teacher');
    ok(/not set up/i.test(body.error || ''), 'error is in plain words: ' + body.error);
    ok(cloud.seen.length === 0, 'and it did NOT silently fall back to cloud');
    cloud.srv.close();
  }

  // -- 11: local works on a deploy with no cloud key at all ----------------
  //
  // The regression guard. An unconditional OLLAMA_API_KEY check used to sit at
  // the top of the handler; leaving it there would have refused every local
  // grade on exactly the deploy where local grading is the point.
  {
    console.log('local grading survives a deploy with no cloud key');
    const local = await startStub([GOOD_GRADE]);
    const env = makeEnv({
      // null, not undefined: a destructuring default treats undefined as absent
      // and would hand this deploy the stub key it is meant to be missing.
      cloudKey: null,
      localHost: `http://127.0.0.1:${local.port}`,
      localModel: 'qwen-local',
    });

    const menu = await (await callGet(env)).json();
    ok(
      menu.graders.find((g) => g.id === 'cloud').available === false,
      'cloud reports unavailable with no key',
    );

    const terminal = (await readNdjson(await call(env, { grader: 'local' }))).pop();
    ok(!!terminal.result, 'local still grades');
    ok(terminal.result.grader === 'local', 'stamped local');

    // ...and the cloud selection on that same deploy refuses cleanly.
    const refused = await call(env, { grader: 'cloud' });
    ok(refused.status === 503, 'cloud refuses with 503, got ' + refused.status);
    local.srv.close();
  }

  // -- 12: unknown / absent grader falls back rather than erroring ---------
  {
    console.log('an unknown grader falls back to the default');
    const cloud = await startStub([GOOD_GRADE]);
    const env = makeEnv({ host: `http://127.0.0.1:${cloud.port}` });

    const t1 = (await readNdjson(await call(env, { grader: 'wharrgarbl' }))).pop();
    ok(t1.result?.grader === 'cloud', 'garbage value graded on cloud, got ' + t1.result?.grader);

    const t2 = (await readNdjson(await call(env))).pop();
    ok(t2.result?.grader === 'cloud', 'no grader field at all still grades');
    ok(cloud.seen.length === 2, 'both reached the cloud server');
    cloud.srv.close();
  }

  // -- 13: Workers AI grades through the binding, streaming ----------------
  {
    console.log('grader=workersai runs on the binding');
    const cloud = await startStub([GOOD_GRADE]);
    const seen = [];
    const env = makeEnv({ host: `http://127.0.0.1:${cloud.port}`, ai: makeAi('ok', seen) });

    const res = await call(env, { grader: 'workersai' });
    ok((res.headers.get('Content-Type') || '').includes('ndjson'), 'the binding streams too');
    const events = await readNdjson(res);
    const stages = events.filter((e) => e.stage).map((e) => e.stage);
    ok(stages[0] === 'reading', 'starts at reading');
    ok(stages.includes('thinking'), 'reaches thinking');
    ok(stages.includes('writing'), 'tokens flowed through the SSE frames');
    ok(stages[stages.length - 1] === 'checking', 'ends at checking');

    const terminal = events[events.length - 1];
    ok(!!terminal.result, 'produced a grade');
    ok(terminal.result.grader === 'workersai', 'stamped workersai, got ' + terminal.result.grader);
    ok(
      terminal.result.graderModel === '@cf/google/gemma-4-26b-a4b-it',
      'defaults to the benchmarked model, got ' + terminal.result.graderModel,
    );

    ok(seen.length === 1, 'the binding was called once, got ' + seen.length);
    ok(seen[0].stream === true, 'and asked to stream');
    // The whole reason the first benchmark run was wrong. A default ceiling
    // here truncates a reasoning model mid-thought and the grade never arrives.
    ok(seen[0].maxTokens === 8000, 'with an explicit max_tokens, got ' + seen[0].maxTokens);
    ok(cloud.seen.length === 0, 'and no HTTP grader was touched');

    // The model's thinking arrives on delta.reasoning_content. If that were
    // accumulated alongside delta.content the grade would carry the model's
    // deliberation and stop parsing as JSON.
    ok(
      !JSON.stringify(terminal.result).includes('Checking the rubric'),
      'reasoning tokens stayed out of the grade',
    );
    cloud.srv.close();
  }

  // -- 14: workersai is preferred when present, and is what "no grader" gets -
  {
    console.log('workersai is the default when the binding exists');
    // startStub's array is the CHUNKS of one reply, not a queue of replies --
    // two entries here concatenated two grades into a single unparseable body.
    const cloud = await startStub([GOOD_GRADE]);
    const seen = [];
    const env = makeEnv({ host: `http://127.0.0.1:${cloud.port}`, ai: makeAi('ok', seen) });

    const menu = await (await callGet(env)).json();
    ok(menu.fallback === 'workersai', 'the menu says workersai, got ' + menu.fallback);
    ok(menu.graders.find((g) => g.id === 'workersai').available === true, 'and reports it available');

    const t1 = (await readNdjson(await call(env))).pop();
    ok(t1.result?.grader === 'workersai', 'a request naming no grader gets it, got ' + t1.result?.grader);

    // ...but an explicit choice still wins, or the dropdown would be a lie.
    const t2 = (await readNdjson(await call(env, { grader: 'cloud' }))).pop();
    ok(t2.result?.grader === 'cloud', 'an explicit cloud choice is honoured');
    ok(cloud.seen.length === 1, 'and only that one reached the HTTP server');
    cloud.srv.close();
  }

  // -- 15: no binding means the old default, not a 503 ----------------------
  //
  // The degrade path. A deploy that never adds the AI binding, or loses it,
  // must keep grading on the target that has been running all along.
  {
    console.log('a deploy with no AI binding falls back to cloud');
    const cloud = await startStub([GOOD_GRADE]);
    const env = makeEnv({ host: `http://127.0.0.1:${cloud.port}` });

    const menu = await (await callGet(env)).json();
    ok(menu.fallback === 'cloud', 'fallback is cloud, got ' + menu.fallback);

    const t = (await readNdjson(await call(env))).pop();
    ok(t.result?.grader === 'cloud', 'and it grades on cloud, got ' + t.result?.grader);
    ok(cloud.seen.length === 1, 'reaching the HTTP server');
    cloud.srv.close();
  }

  // -- 16: the 20-rpm cap becomes a sentence, not a stack trace -------------
  //
  // Measured on the real service 2026-09-05: 25 simultaneous submissions to a
  // frontier model returned five "3021: rate limiting" errors. A student who
  // sees the raw text learns nothing; they need "wait and try again".
  {
    console.log('a rate-limited binding says wait, not 3021');
    const env = makeEnv({ host: 'http://127.0.0.1:1', ai: makeAi('ratelimit') });
    const events = await readNdjson(await call(env, { grader: 'workersai' }));
    const terminal = events[events.length - 1];
    ok(!!terminal.error, 'the stream ends in an error');
    ok(/wait a moment/i.test(terminal.error), 'phrased for a student: ' + terminal.error);
    ok(!/3021/.test(terminal.error), 'and does not leak the error code');

    const plain = await call(env, { stream: false, grader: 'workersai' });
    ok(plain.status === 503, 'non-streaming answers 503, got ' + plain.status);
    const body = await plain.json();
    ok(/wait a moment/i.test(body.error || ''), 'with the same sentence');
  }

  // -- 17: a truncated reply is named, not scored --------------------------
  //
  // The bug that invalidated the first benchmark run: max_tokens exhausted
  // inside the reasoning block leaves content null. Reading that as '' would
  // hand the student an empty grade with no error.
  {
    console.log('a truncated reply is reported, not silently graded');
    const env = makeEnv({ host: 'http://127.0.0.1:1', ai: makeAi('truncated') });

    const events = await readNdjson(await call(env, { grader: 'workersai' }));
    const terminal = events[events.length - 1];
    ok(!terminal.result, 'no grade is emitted');
    ok(/ran out of room/i.test(terminal.error || ''), 'says what happened: ' + terminal.error);

    const plain = await call(env, { stream: false, grader: 'workersai' });
    ok(plain.status === 502, 'non-streaming answers 502, got ' + plain.status);
    const body = await plain.json();
    ok(body.finishReason === 'length', 'and records finish_reason, got ' + body.finishReason);
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) {
  console.error(`\ntest-grade-stream: ${failures} FAILED`);
  process.exit(1);
}
console.log('\ntest-grade-stream: all checks passed');
