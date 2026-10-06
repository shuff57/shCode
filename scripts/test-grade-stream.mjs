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
//   7. A `grader` naming a target this deploy has since retired (a stale cached
//      bundle, an old tab) falls back to the one target instead of erroring --
//      losing a student's submission to a rename is not acceptable.

import { execFileSync } from 'child_process';
import { createServer } from 'http';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
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
// The output lands under node_modules/ on purpose: the compiled auth.js does
// `require('jose')`, and a bare require from a %TEMP% dir has no way back to
// this repo's node_modules (mkdtempSync there breaks resolution). Same reason
// check-starters.mjs and test-rubric-tolerance-2-1.mjs compile into
// .pkg-load-cache.
mkdirSync(path.join(root, 'node_modules', '.pkg-load-cache'), { recursive: true });
const out = mkdtempSync(path.join(root, 'node_modules', '.pkg-load-cache', 'shcode-gradestream-'));

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
  // loadAiGrader reads the bundled ai-graders.generated module (it is not a
  // fetchable asset any more), so replace the compiled one with a single test
  // grader BEFORE the Function below is imported: the import pulls it in.
  writeFileSync(
    path.join(out, 'functions', '_shared', 'ai-graders.generated.js'),
    'Object.defineProperty(exports, "__esModule", { value: true });\nexports.AI_GRADERS = ' +
      JSON.stringify({
        'test-lesson': {
          lessonTitle: 'Test lesson',
          prompt: 'Explain two things.',
          rubric: [
            { id: 'a', title: 'First thing', description: '', points: 0 },
            { id: 'b', title: 'Second thing', description: '', points: 0 },
          ],
          model: 'stub-model',
          contextDocs: [],
        },
      }) +
      ';\n',
  );

  const modPath = path.join(out, 'functions', 'api', 'grade-written.js');
  const { onRequestPost, onRequestGet } = await import('file://' + modPath.split(path.sep).join('/'));

  const RUBRIC = [
    { id: 'a', title: 'First thing', description: '', points: 0 },
    { id: 'b', title: 'Second thing', description: '', points: 0 },
  ];

  // Minimal fakes for the bits the Function reaches for.


  function makeEnv({
    rateCount = 0,
    host,
    cloudKey = 'stub-key',
  }) {
    return {
      OLLAMA_API_KEY: cloudKey,
      OLLAMA_HOST: host,
      GRADE_WRITTEN_DAILY_LIMIT: '30',
      // isLessonAccessible reads the lessons manifest through env.ASSETS.
      ASSETS: {
        fetch: async (req) => {
          const p = new URL(typeof req === 'string' ? req : req.url).pathname;
          const body = p.includes('lessons-manifest')
            ? JSON.stringify({ lessons: [{ id: 'test-lesson', title: '1.1.1 Test lesson' }] })
            : '{}';
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
    ok(!/ollama|key|endpoint/i.test(terminal.error), 'student-facing error names no vendor');
    ok(/ollama/i.test(terminal.detail || ''), 'staff detail keeps the raw upstream reason');
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
    ok(body.graders.length === 1, 'exactly one target listed, got ' + body.graders.length);
    ok(
      body.graders.map((g) => g.id).join(',') === 'cloud',
      'and it is the cloud target, got ' + body.graders.map((g) => g.id).join(','),
    );
    ok(byId.cloud.available === true, 'cloud available when the key is set');
    ok(body.fallback === 'cloud', 'fallback is cloud');


  }

  // -- 8: a stale cached bundle naming a retired target still grades --------
  //
  // The one guard that earns its keep now that there is a single target. A
  // student with a tab opened before a rename still POSTs the old id; erroring
  // would lose their submission over a value they never chose by hand.
  {
    const cloud = await startStub([GOOD_GRADE]);
    const env = makeEnv({ host: `http://127.0.0.1:${cloud.port}` });

    for (const retired of ['local', 'openrouter', 'workersai']) {
      const t = (await readNdjson(await call(env, { grader: retired }))).pop();
      ok(
        !!t.result && t.result.grader === 'cloud',
        `grader=${retired} falls back to cloud, got ${JSON.stringify(t.result?.grader ?? t.error)}`,
      );
    }
    ok(cloud.seen.length === 3, 'all three reached the server, got ' + cloud.seen.length);
    cloud.srv.close();
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
    ok(cloud.seen.length === 2, 'both reached the cloud server, got ' + cloud.seen.length);
    cloud.srv.close();
  }

// -- 15: an unconfigured deploy falls back to cloud, not a 503 -------------
//
// The degrade path. A deploy with nothing configured must keep grading on
// the target that has been running all along.
{
 console.log('an unconfigured deploy falls back to cloud');
    const cloud = await startStub([GOOD_GRADE]);
    const env = makeEnv({ host: `http://127.0.0.1:${cloud.port}` });

    const menu = await (await callGet(env)).json();
    ok(menu.fallback === 'cloud', 'fallback is cloud, got ' + menu.fallback);

    const t = (await readNdjson(await call(env))).pop();
    ok(t.result?.grader === 'cloud', 'and it grades on cloud, got ' + t.result?.grader);
    ok(cloud.seen.length === 1, 'reaching the HTTP server');
    cloud.srv.close();
  }

  // -- client side: streamGrade's failure shapes ----------------------------
  // A thrown fetch is `network`, not a non-JSON reply; a 404/502 that is not JSON
  // is data:null with its real status kept for the log and the teacher row.
  {
    console.log('streamGrade failure shapes');
    let streamGrade = null;
    try {
      ({ streamGrade } = await import('../lib/written-grader-store.ts'));
    } catch (e) {
      try {
        const esbuild = await import('esbuild');
        const outFile = path.join(out, 'store.mjs');
        await esbuild.build({ entryPoints: [path.join(root, 'lib', 'written-grader-store.ts')], bundle: true, format: 'esm', outfile: outFile, logLevel: 'silent' });
        ({ streamGrade } = await import('file://' + outFile.split(path.sep).join('/')));
      } catch (e2) {
        ok(false, 'could not load written-grader-store: ' + e.message + ' / ' + e2.message);
      }
    }
    if (streamGrade) {
      const realFetch = globalThis.fetch;
      try {
        globalThis.fetch = async () => { throw new TypeError('Failed to fetch'); };
        let r = await streamGrade({}, () => {});
        ok(r.ok === false && r.status === 0 && r.data === null && r.network === true, 'thrown fetch -> network:true, got ' + JSON.stringify(r));
        for (const st of [404, 502]) {
          globalThis.fetch = async () => new Response('<html>Bad gateway</html>', { status: st, headers: { 'Content-Type': 'text/html' } });
          r = await streamGrade({}, () => {});
          ok(r.ok === false && r.status === st && r.data === null && !r.network, `non-JSON ${st} -> data:null, status kept`);
        }
      } finally {
        globalThis.fetch = realFetch;
      }
    }
  }

} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) {
  console.error(`\ntest-grade-stream: ${failures} FAILED`);
  process.exit(1);
}
console.log('\ntest-grade-stream: all checks passed');
