// Regression test for the 2026-09-22 prod outage.
//
// The login lockout (functions/api/auth/login.ts, migration 0029) read and
// wrote `login_attempts` with no try/catch. When prod D1 was missing that
// table, every login 500'd -- while the sibling rate limiter, which fails
// open, kept signup alive. This drives the REAL compiled handler against a
// D1 stub whose `login_attempts` queries throw, and asserts login still
// answers (401), not 500.
//
// Run: node scripts/test-login-lockout.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, '.tmp-login-test');

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

// --- Compile the handler (and its real imports) to CJS ---
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
try {
  execFileSync(
    'node',
    [
      join(root, 'node_modules/typescript/bin/tsc'),
      join(root, 'functions/api/auth/login.ts'),
      '--outDir', outDir,
      '--rootDir', join(root, 'functions'),
      '--module', 'commonjs',
      '--target', 'es2022',
      '--moduleResolution', 'node',
      '--skipLibCheck',
      '--esModuleInterop',
      '--types', '@cloudflare/workers-types',
    ],
    { stdio: 'inherit', cwd: root },
  );
} catch {
  // tsc exits non-zero on type errors in the workers-types lib, but still
  // emits JS. Only a missing output file is fatal.
}
writeFileSync(join(outDir, 'package.json'), '{"type":"commonjs"}');

if (!existsSync(join(outDir, 'api/auth/login.js'))) {
  fail('tsc did not emit api/auth/login.js');
  process.exit(1);
}

const mod = require(join(outDir, 'api/auth/login.js'));
const onRequestPost = mod.onRequestPost;
if (typeof onRequestPost !== 'function') {
  fail('onRequestPost not exported from compiled handler');
  process.exit(1);
}

// --- A D1 stub that mimics "table missing" for login_attempts only ---
function makeStubDb({ knownUser }) {
  const prepared = [];
  const db = {
    prepare(sql) {
      const isLockout = sql.includes('login_attempts');
      const isStudents = sql.includes('FROM students');
      return {
        bind() { return this; },
        async first() {
          if (isLockout) throw new Error('D1_ERROR: no such table: login_attempts');
          if (isStudents) return knownUser;
          return null;
        },
        async run() {
          if (isLockout) throw new Error('D1_ERROR: no such table: login_attempts');
          return { success: true };
        },
      };
    },
    _prepared: prepared,
  };
  return db;
}

async function callLogin(db, body) {
  const request = new Request('https://example.test/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const env = { DB: db, AUTH_SECRET: 'test-secret-0123456789abcdef0123456789abcdef' };
  return onRequestPost({ request, env, params: {}, data: {}, next: async () => new Response(null) });
}

// --- Test 1: table missing, unknown user -> must be 401, never 500 ---
{
  const db = makeStubDb({ knownUser: null });
  const res = await callLogin(db, { email: 'ghost@example.invalid', password: 'whatever123' });
  if (res.status !== 401) {
    fail(`missing login_attempts, unknown user: expected 401, got ${res.status}`);
  } else {
    console.log('PASS  1/3  login_attempts missing, unknown user -> 401 (not 500)');
  }
}

// --- Test 2: table missing, WRONG password on a real user -> 401 ---
{
  const db = makeStubDb({
    knownUser: {
      password_hash: 'deadbeef:100000:deadbeef',
      role: 'student',
      first_name: null,
      last_name: null,
    },
  });
  const res = await callLogin(db, { email: 'real@example.invalid', password: 'wrong123' });
  if (res.status !== 401) {
    fail(`missing login_attempts, wrong password: expected 401, got ${res.status}`);
  } else {
    console.log('PASS  2/3  login_attempts missing, wrong password -> 401 (not 500)');
  }
}

// --- Test 3: table present, lockout active -> still 429 (the guard works) ---
{
  const lockedUntil = Date.now() + 5 * 60 * 1000;
  const db = {
    prepare(sql) {
      const isLockout = sql.includes('login_attempts');
      return {
        bind() { return this; },
        async first() {
          if (isLockout) return { fail_count: 10, locked_until: lockedUntil };
          return null;
        },
        async run() { return { success: true }; },
      };
    },
  };
  const res = await callLogin(db, { email: 'locked@example.invalid', password: 'whatever123' });
  if (res.status !== 429) {
    fail(`active lockout: expected 429, got ${res.status}`);
  } else {
    console.log('PASS  3/3  active lockout still returns 429 (guard intact)');
  }
}

rmSync(outDir, { recursive: true, force: true });

if (process.exitCode) {
  console.error('\nlogin lockout regression FAILED');
} else {
  console.log('\nlogin lockout regression: 3/3');
}
