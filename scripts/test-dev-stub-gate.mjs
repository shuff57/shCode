// Proves the dev-stub gate server.js (DEV_STUBS_ENABLED / SHCODE_ENABLE_DEV_STUBS)
// is fail-closed, three ways, against a REALLY BOOTED server (not a mock):
//
//   1. default boot, no NODE_ENV, no flag       -> /api/me answers 410 Gone
//   2. SHCODE_ENABLE_DEV_STUBS=1, no NODE_ENV   -> /api/me answers 200 (dev works)
//   3. SHCODE_ENABLE_DEV_STUBS=1 AND NODE_ENV=production -> 410 Gone (fail-closed)
//
// The acceptance criterion is "dev auth stubs unreachable in a production
// build; prove it" — case 3 is exactly that proof, and cases 1–2 prove the
// gate is explicit opt-in rather than merely unchecked-in-production.
//
// Only /api/me is probed per boot; it is the first stub server.js registers,
// so reaching it means the whole gated block is live.
//
// HAZARD THIS TEST TRIPS ON PURPOSE, DOCUMENTED: a no-NODE_ENV boot starts the
// Next DEV bundler, whose hot reloader `clean()` deletes everything under
// .next except /^cache/ — including the production BUILD_ID and manifests
// (upstream Next behaviour with a custom server; pre-existing exposure that
// this issue's gate narrows but does not eliminate). A dev boot therefore
// INVALIDATES the production build in .next/. Each dev-mode boot snapshots
// .next/BUILD_ID + prerender-manifest.json first and restores them after, so
// the post-test tree still holds a whole production build; the stubbed boot's
// probes only touch the Express stubs, never the Next handler.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

// Snapshot the production-build identity files a dev boot would destroy, and
// restore them afterwards so the tree keeps a whole production build.
function snapshotBuild() {
  const files = {
    '.next/BUILD_ID': null,
    '.next/export-marker.json': null,
    '.next/prerender-manifest.json': null,
  };
  for (const rel of Object.keys(files)) {
    const p = path.join(root, rel);
    if (fs.existsSync(p)) files[rel] = fs.readFileSync(p);
  }
  return files;
}
function restoreBuild(snapshot) {
  for (const [rel, buf] of Object.entries(snapshot)) {
    const p = path.join(root, rel);
    if (buf === null) {
      try { fs.rmSync(p, { force: true }); } catch {}
    } else {
      fs.mkdirSync(path.dirname(p), { recursive: true });
      fs.writeFileSync(p, buf);
    }
  }
}

// One port per boot, ephemeral so stale listeners cannot wedge the test or
// each other. Each boot() reports its own READY line with the chosen port.
const READY = /Ready on http:\/\/localhost:(\d+)/;
const TIMEOUT_MS = 90_000;

function probe(port) {
  return fetch(`http://127.0.0.1:${port}/api/me`, { headers: { cookie: 'dev_student=probe' } })
    .then(async (r) => ({ status: r.status, body: await r.text() }))
    .catch((e) => ({ error: String(e) }));
}

function readyPort(out) {
  return Number(READY.exec(out)?.[1] || 0);
}

async function boot(env) {
  // This harness may export NODE_ENV=production into every child process.
  // Each boot states its environment intent explicitly: pass NODE_ENV here or
  // it is deleted, so "default boot" really is a no-NODE_ENV boot.
  const childEnv = { ...process.env, PORT: '0', ...env };
  if (!('NODE_ENV' in env)) delete childEnv.NODE_ENV;
  const child = spawn('node', [path.join(root, 'server.js')], {
    env: childEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: root,
  });
  let out = '';
  child.stdout.on('data', (d) => (out += d));
  child.stderr.on('data', (d) => (out += d));
  const started = Date.now();
  // Wait for the Ready line, then read the actual ephemeral port off it.
  for (;;) {
    const port = readyPort(out);
    if (port) return { child, port };
    if (Date.now() - started > TIMEOUT_MS) {
      child.kill('SIGKILL');
      throw new Error(`server never became ready; output:\n${out}`);
    }
    if (child.exitCode !== null) {
      throw new Error(`server exited (${child.exitCode}) before ready; output:\n${out.slice(0, 2000)}`);
    }
    await new Promise((r) => setTimeout(r, 250));
  }
}

async function waitForStatus(port, want, label) {
  const started = Date.now();
  for (;;) {
    const res = await probe(port).catch((e) => ({ error: String(e) }));
    if (res.status === want) return res;
    if (Date.now() - started > TIMEOUT_MS) {
      throw new Error(
        `[${label}] never answered ${want}; last=${JSON.stringify(res)}`,
      );
    }
    await new Promise((r) => setTimeout(r, 300));
  }
}

let failures = 0;
const fail = (msg) => { failures += 1; console.error(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  PASS  ${msg}`);

const hadProductionBuild = snapshotBuild();

// Boot 1: flag present AND NODE_ENV=production — must refuse. This is the
// acceptance-criteria case: stubs unreachable in a production configuration.
// This boot runs FIRST, against the untouched production build (a dev boot
// would wipe it; see the hazard note at the top), so no restore is needed.
{
  const { child, port } = await boot(
    { SHCODE_ENABLE_DEV_STUBS: '1', NODE_ENV: 'production' },
  );
  try {
    const r = await waitForStatus(port, 410, 'production boot');
    const body = JSON.parse(r.body);
    if (r.status === 410 && /Dev stubs disabled/.test(body.error)) {
      pass('NODE_ENV=production + flag: /api/me -> 410 (fail-closed wins)');
    } else {
      fail(`production boot answered ${r.status} ${r.body}`);
    }
  } catch (e) { fail(String(e.message || e)); }
  finally { child.kill('SIGKILL'); }
}

// Boot 3: explicit opt-in outside production — must work like the old dev
// server. Runs LAST: it starts the dev bundler, which cleans .next (hazard
// note at the top); the snapshot restore right after puts the production
// build's identity files back.
{
  const { child, port } = await boot({ SHCODE_ENABLE_DEV_STUBS: '1' });
  try {
    const r = await waitForStatus(port, 200, 'stub boot');
    const body = JSON.parse(r.body);
    if (r.status === 200 && body.email === 'probe' && body.role === 'teacher') {
      pass('SHCODE_ENABLE_DEV_STUBS=1 boot: /api/me -> 200 with the dev_student identity');
    } else {
      fail(`stub boot answered ${r.status} ${r.body}`);
    }
  } catch (e) { fail(String(e.message || e)); }
  finally { child.kill('SIGKILL'); }
}

restoreBuild(hadProductionBuild);

console.log(
  failures
    ? `\nFAIL  (${failures} dev-stub gate check(s) failed)`
    : '\nALL PASS  (dev-stub gate: default off, opt-in works, production cannot opt in)',
);
process.exit(failures ? 1 : 0);