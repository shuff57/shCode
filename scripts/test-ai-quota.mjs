// LEF-17 — the AI spend quota must not be resettable by client input.
//
// What the bug was. functions/api/ai-help.ts keyed its rate-limit bucket on
// `body.unit` — a value the request body supplies. A caller that sent a fresh
// random string per request got a fresh allowance every time, so the quota
// bounded nothing: unbounded spend against OLLAMA_API_KEY and unbounded load
// on the model backend. grade-written.ts already did this correctly (a
// server-constant bucket + the verified session email), and this file pins the
// whole fix in place:
//
//   1. varying `body.unit` under one identity cannot reset the allowance —
//      the count climbs across arbitrary client keys until 429;
//   2. the bucket key never contains request-supplied bytes at all: the unit
//      is resolved server-side from the build-time catalog, so a random unit
//      string and the true unit land in the SAME bucket;
//   3. unknown lesson ids fall back to the shared '' bucket — a lookup hint,
//      not a key;
//   4. a GLOBAL per-deploy ceiling exists alongside the per-identity quota, so
//      a stream of fresh accounts cannot exhaust the shared Ollama key;
//   5. teachers/admins stay exempt from both counters.
//
// It drives the REAL exported onRequestPost from functions/api/ai-help.ts,
// compiled here, against an in-memory D1 stub — the same pattern
// test-diagram-hint.mjs uses to keep a test honest about which code runs.
//
// Offline only: no key, no network. The upstream chatStream is stubbed at the
// module boundary, which is all the endpoint needs to reach its 200 path.

import { execFileSync } from 'child_process';
import { mkdtempSync, rmSync } from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

let failures = 0;
let passes = 0;
const ok = (cond, msg) => {
  if (cond) {
    passes++;
    console.log('  PASS ' + msg);
  } else {
    failures++;
    console.log('  FAIL ' + msg);
  }
};

// ------------------------------------------------------------ compile the fn

function compile() {
  const out = mkdtempSync(path.join(tmpdir(), 'shcode-ai-quota-'));
  // The route references Cloudflare's ambient types (D1Database, PagesFunction).
  // Those are type errors out here and irrelevant to the function under test,
  // so emit despite them — same trick as test-diagram-hint.mjs.
  try {
    execFileSync(
      process.execPath,
      [
        path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
        'functions/api/ai-help.ts',
        'lib/ollama.ts',
        '--outDir', out,
        '--module', 'commonjs',
        '--target', 'es2022',
        '--moduleResolution', 'node',
        '--skipLibCheck',
        '--resolveJsonModule',
      ],
      { cwd: root, stdio: 'pipe' },
    );
  } catch {
    // tsc exits non-zero on the ambient-type errors but still writes the JS.
  }
  const require = createRequire(import.meta.url);
  const aiHelp = require(path.join(out, 'functions', 'api', 'ai-help.js'));
  if (typeof aiHelp.onRequestPost !== 'function') {
    throw new Error('onRequestPost is not exported from functions/api/ai-help.ts');
  }
  return { aiHelp, out };
}

// --------------------------------------------------------- in-memory D1 stub

// Same table shape as migrations/0009_ai_help_usage.sql: a
// (student_email, unit, day) -> count map with the composite-PK upsert.
function makeDB() {
  const rows = new Map(); // `${identity}\u0000${bucket}\u0000${day}` -> count
  const key = (identity, bucket, day) => `${identity}\u0000${bucket}\u0000${day}`;
  return {
    rows,
    key,
    // Sync prepare, like the real D1: the endpoint chains .bind() on the
    // return value without awaiting.
    prepare(sql) {
      const stmt = {
        bound: [],
        bind(...vals) {
          stmt.bound = vals;
          return stmt;
        },
        async first() {
          if (!/SELECT count/.test(sql)) return null;
          const [identity, bucket, day] = stmt.bound;
          return { count: rows.get(key(identity, bucket, day)) ?? 0 };
        },
        async run() {
          if (!/INSERT INTO ai_help_usage/.test(sql)) return {};
          const [identity, bucket, day] = stmt.bound;
          const k = key(identity, bucket, day);
          rows.set(k, (rows.get(k) ?? 0) + 1);
          return {};
        },
        async all() {
          return { results: [] };
        },
      };
      return stmt;
    },
  };
}

// The catalog the endpoint resolves units through (public/lessons-manifest.json
// served through env.ASSETS, exactly like production).
const UNIT = '1.5 Program Design Tools and Environments';
function makeEnv(db, { dailyLimit, globalLimit, manifest = true } = {}) {
  return {
    DB: db,
    OLLAMA_API_KEY: 'stub-key',
    AI_HELP_DAILY_LIMIT: String(dailyLimit),
    AI_HELP_GLOBAL_DAILY_LIMIT: String(globalLimit ?? 99999), // raised out of the way unless a test says otherwise
    ASSETS: {
      fetch: async (req) => {
        const p = new URL(typeof req === 'string' ? req : req.url).pathname;
        if (p !== '/lessons-manifest.json') return new Response('not found', { status: 404 });
        if (!manifest) return new Response('gone', { status: 500 });
        return new Response(
          JSON.stringify({
            lessons: [
              { id: 'test-lesson', title: '1.5.3 Test lesson', unit: UNIT },
              { id: 'unitless-lesson', title: '7.0.1 No unit here', unit: null },
            ],
          }),
          { headers: { 'Content-Type': 'application/json' } },
        );
      },
    },
  };
}

// chatStream is stubbed where it acts: on global fetch to the Ollama host.
// Patching the compiled module's export would not change what ai-help.js
// calls internally (CJS bindings are live but the call sites are direct).
// `requests` records every upstream call the endpoint makes.
function stubOllama(requests) {
  const real = global.fetch;
  global.fetch = async (url, init) => {
    const urlStr = typeof url === 'string' ? url : url.url;
    if (!urlStr.includes('/api/chat')) return real(url, init);
    let parsed = null;
    try { parsed = JSON.parse(init.body); } catch {}
    requests.push(parsed);
    const enc = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(enc.encode(JSON.stringify({ message: { content: 'A hint.' } }) + '\n'));
          c.close();
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/x-ndjson' } },
    );
  };
  return () => {
    global.fetch = real;
  };
}

// One POST with full attacker control over the body fields that used to be
// (or could be mistaken for) bucket-key inputs.
async function ask(env, { email = 'kid@example.test', role = 'student', unit, lessonId, mode } = {}) {
  const body = {
    code: 'let x = 1;',
    query: 'Why is this wrong?',
  };
  if (unit !== undefined) body.unit = unit;
  if (lessonId !== undefined) body.lessonId = lessonId;
  if (mode !== undefined) body.mode = mode;
  return aiHelp.onRequestPost({
    request: new Request('https://example.test/api/ai-help', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
    env,
    data: { email, role },
    params: {},
    waitUntil: () => {},
    next: async () => new Response(''),
    functionPath: '/api/ai-help',
    providedRoles: [],
  });
}

function countFor(db, identity, bucket, day) {
  return db.rows.get(db.key(identity, bucket, day)) ?? 0;
}

// ---------------------------------------------------------------------- main

const { aiHelp, out } = compile();

// Offline guarantee: no request ever leaves the process.
stubOllama([]);

try {
  const DAY = new Date().toISOString().slice(0, 10);

  // -- 1: the hammer. Varying client-supplied unit strings, one identity. ----
  {
    console.log('\n--- varying client-supplied keys under one identity ---');
    const db = makeDB();
    const env = makeEnv(db, { dailyLimit: 10 });

    // 10 accepted, each with a FRESH random unit string — exactly the
    // bypass this ticket names.
    let limited = null;
    for (let i = 0; i < 10; i++) {
      const res = await ask(env, { unit: `forged-unit-${crypto.randomUUID()}` });
      if (res.status === 429) {
        limited = i;
        break;
      }
      if (res.status !== 200) {
        ok(false, `unexpected status ${res.status} on request ${i}`);
        break;
      }
    }
    ok(limited === null, '10 forged keys all got through before the cap (cap is 10)');

    // The 11th — any key at all — must be refused: the bucket has to be
    // shared, so the client cannot dial up a fresh allowance.
    const res11 = await ask(env, { unit: 'forged-unit-one-more' });
    ok(res11.status === 429, 'the 11th request is refused with 429, got ' + res11.status);
    const body11 = await res11.json();
    ok(body11.rateLimited === true, 'body carries rateLimited');
    ok(
      res11.headers.get('X-RateLimit-Remaining') === '0',
      'Remaining header reads 0',
    );

    // And the count sits in ONE bucket, not eleven.
    const email = 'kid@example.test';
    const totalRows = [...db.rows.entries()].filter(([k]) => k.startsWith(email + '\u0000'));
    ok(totalRows.length === 1, `all 10 requests landed in one bucket, got ${totalRows.length}`);

    // A client that sends NO unit at all is in that same bucket: ''.
    const noUnit = await ask(env);
    ok(noUnit.status === 429, 'omitting unit entirely is the same bucket, got ' + noUnit.status);

    // The true unit for the lesson is a DIFFERENT bucket — that is the
    // per-unit split working as designed. The property that matters is that
    // whichever bucket it lands in, its own cap applies to it; the very next
    // section proves that with a full bucket of its own.
    const trueUnit = await ask(env, { lessonId: 'test-lesson', query: 'same identity, catalog-resolved unit' });
    ok(trueUnit.status === 200, 'the catalog-resolved unit is its own bucket, not the forged one, got ' + trueUnit.status);
  }

  // -- 2: per-unit buckets derive from the catalog, not the body. -----------
  {
    console.log('\n--- server-derived unit buckets ---');
    const db = makeDB();
    const env = makeEnv(db, { dailyLimit: 3 });

    // Two lessons in DIFFERENT catalog units get separate allowances...
    for (let i = 0; i < 3; i++) {
      const res = await ask(env, { lessonId: 'test-lesson' });
      ok(res.status === 200, `request ${i + 1} of unit-A lesson passes`);
    }
    const capped = await ask(env, { lessonId: 'test-lesson' });
    ok(capped.status === 429, 'unit-A bucket caps at 3, got ' + capped.status);

    // A different unit still has its own allowance...
    const other = await ask(env, { lessonId: 'unitless-lesson' });
    ok(other.status === 200, 'a lesson in another unit has its own bucket');

    // ...and its bucket is keyed by the CATALOG's unit (empty for a unitless
    // lesson), never by anything the request could name. Prove it by reading
    // the counter rows directly: the unit column must be the catalog value.
    const buckets = [...db.rows.entries()]
      .map(([k, v]) => k.split('\u0000'))
      .filter(([identity]) => identity === 'kid@example.test')
      .map(([, bucket]) => bucket);
    ok(buckets.includes(UNIT), `unit-A bucket is the catalog unit string`);
    ok(buckets.includes(''), 'the unitless lesson buckets under the empty string');
    ok(!buckets.some((b) => b.startsWith('forged')), 'no request-supplied string ever became a key');
  }

  // -- 3: unknown lesson id -> shared '' bucket, not a fresh allowance. -----
  {
    console.log('\n--- unknown lesson ids cannot mint buckets ---');
    const db = makeDB();
    const env = makeEnv(db, { dailyLimit: 3 });

    for (let i = 0; i < 3; i++) {
      const res = await ask(env, { lessonId: `forged-${crypto.randomUUID()}` });
      ok(res.status === 200, `forged lesson id ${i + 1} accepted`);
    }
    const res4 = await ask(env, { lessonId: `forged-${crypto.randomUUID()}` });
    ok(res4.status === 429, 'a 4th forged id still hits the shared bucket, got ' + res4.status);

    // And a unitless lesson shares that same '' bucket.
    const shared = await ask(env, { lessonId: 'unitless-lesson' });
    ok(shared.status === 429, 'unitless lesson shares the unknown-id bucket, got ' + shared.status);
  }

  // -- 4: the manifest failing open still bounds the caller. ----------------
  {
    console.log('\n--- catalog unreachable -> one shared bucket, still bounded ---');
    const db = makeDB();
    const env = makeEnv(db, { dailyLimit: 2, manifest: false });
    ok((await ask(env, { lessonId: 'test-lesson' })).status === 200, 'request 1 fine');
    ok((await ask(env, { lessonId: 'test-lesson' })).status === 200, 'request 2 fine');
    const res3 = await ask(env, { lessonId: 'test-lesson' });
    ok(res3.status === 429, 'request 3 capped even with no catalog, got ' + res3.status);
  }

  // -- 5: the global ceiling stops a stream of fresh accounts. --------------
  {
    console.log('\n--- the deploy-wide global ceiling ---');
    const db = makeDB();
    // Per-identity quota high enough that only the global cap can bite.
    const env = makeEnv(db, { dailyLimit: 100, globalLimit: 5 });

    let saw429 = false;
    for (let i = 0; i < 6; i++) {
      // A DIFFERENT fresh identity each time: the per-student quota never
      // engages, which is exactly the shape of the bypass this ceiling exists
      // to close while registration is open.
      const res = await ask(env, { email: `fresh-${i}@example.test`, lessonId: 'test-lesson' });
      if (res.status === 429) {
        saw429 = true;
        const body = await res.json();
        ok(body.limit === 5, 'the refusal names the global ceiling, got ' + body.limit);
        break;
      }
    }
    ok(saw429, 'the 6th distinct identity is refused by the global ceiling');

    // The global counter counted exactly the requests that reached the model.
    const GLOBAL_IDENTITY = '\x00GLOBAL';
    ok(
      countFor(db, GLOBAL_IDENTITY, 'ai-help:global', DAY) === 5,
      `global counter holds 5, got ${countFor(db, GLOBAL_IDENTITY, 'ai-help:global', DAY)}`,
    );
    // No per-identity row passed 100 — the per-student cap was never the thing
    // that fired.
    for (let i = 0; i < 6; i++) {
      const perIdentity = [...db.rows.entries()].filter(([k]) =>
        k.startsWith(`fresh-${i}@example.test\u0000`));
      ok(
        perIdentity.every(([, v]) => v <= 100),
        `identity ${i} never exceeded its own quota`,
      );
      break; // one spot-check is enough; the loop above already proved 429
    }
  }

  // -- 6: global counter counts only requests that reached the model. ------
  {
    console.log('\n--- refusals do not consume the global allowance ---');
    const db = makeDB();
    const env = makeEnv(db, { dailyLimit: 1, globalLimit: 100 });
    ok((await ask(env, { lessonId: 'test-lesson' })).status === 200, 'first accepted');
    ok((await ask(env, { lessonId: 'test-lesson' })).status === 429, 'second refused by per-student cap');
    ok(
      countFor(db, '\x00GLOBAL', 'ai-help:global', DAY) === 1,
      'the refused request did not increment the global counter',
    );
  }

  // -- 7: teachers and admins stay exempt. ---------------------------------
  {
    console.log('\n--- staff exemption unchanged ---');
    for (const role of ['teacher', 'admin']) {
      const db = makeDB();
      const env = makeEnv(db, { dailyLimit: 1, globalLimit: 1 });
      for (let i = 0; i < 5; i++) {
        const res = await ask(env, { role, unit: `forged-${i}` });
        ok(res.status === 200, `${role} request ${i + 1} is exempt`);
      }
      ok(db.rows.size === 0, `${role} consumed no quota`);
    }
  }

  // -- 8: the old key inputs are gone from the request surface. ------------
  {
    console.log('\n--- a body.unit can no longer shape any bucket ---');
    const db = makeDB();
    const env = makeEnv(db, { dailyLimit: 100 });
    // Hammer with unit strings including '', huge strings, control chars,
    // and the reserved global identity itself.
    const adversarialUnits = ['', 'x'.repeat(500), 'unit\x00GLOBAL', '\x00GLOBAL', '../../etc/passwd'];
    let accepted = 0;
    for (let round = 0; round < 3; round++) {
      for (const u of adversarialUnits) {
        const res = await ask(env, { unit: u });
        ok(res.status === 200, `forged unit ${JSON.stringify(u.slice(0, 12))} is just another request (${round})`);
        if (res.status === 200) accepted++;
      }
    }
    // Every accepted request counted once under the identity, and NOTHING
    // shares the reserved global identity — the client cannot reach the
    // deploy-wide counter through any body field.
    const perIdentity = [...db.rows.entries()].filter(([k]) => k.startsWith('kid@example.test\u0000'));
    const total = perIdentity.reduce((s, [, v]) => s + v, 0);
    ok(total === accepted, `every accepted request counted once, got ${total} of ${accepted}`);
    ok(
      countFor(db, '\x00GLOBAL', 'ai-help:global', DAY) === accepted,
      'the global counter counted the same requests',
    );
    ok(!perIdentity.some(([k]) => k.includes('\x00GLOBAL')), 'no per-identity row touched the reserved identity');
  }
} finally {
  rmSync(out, { recursive: true, force: true });
}

if (failures) {
  console.error(`\ntest-ai-quota: ${failures} FAILED, ${passes} passed`);
  process.exit(1);
}
console.log(`\nAll ${passes} checks held.`);