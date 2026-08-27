#!/usr/bin/env node
// test-js-docs.mjs — the verification gate for the plain-JavaScript docs set
// (lib/js-docs.ts), the Docs drawer surface it renders in.
//
// Four groups:
//
//   SHAPE      every page has a title and a body; every section has a slug.
//   RUNS       every `code` example executes in the SAME runner the drawer
//              uses (the Worker source from lib/js-runner-source.ts, plus the
//              localStorage shim DocLiveSnippet injects) and must not throw.
//              A docs page that teaches an infinite loop must still be
//              stoppable — the vm timeout mirrors the Worker kill timer.
//   WIRING     the docs are reachable: the sandbox's JavaScript mode and
//              console lessons both mount them. A docs set nobody renders is
//              the exact defect this repo has shipped twice before.
//   SCOPE      the JS docs stay plain JavaScript. A page that reaches for a
//              moSHion or reSHape engine name would fail in the runner it
//              actually uses — this group says so before the runner does.
//
// lib/js-docs.ts is TypeScript importing without a file extension, so compile
// it to CommonJS in a temp dir first and require the real `sections` array —
// the docs are read as DATA, never re-parsed with a regex. Same trick
// scripts/test-reshape-docs.mjs uses.
//
// A red check is closed by fixing the docs or the wiring — never by loosening
// an assertion here.
//
//   node scripts/test-js-docs.mjs

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');

let fails = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        ' + extra : '')); }
}
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ---------------------------------------------------------------------------
// Compile lib/js-docs.ts and read the real `sections` array.
// ---------------------------------------------------------------------------

const outDir = mkdtempSync(path.join(tmpdir(), 'shcode-js-docs-'));
let sections = null;

try {
  try {
    execFileSync(
      process.execPath,
      [
        path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
        'lib/docs-core.ts',
        'lib/js-docs.ts',
        '--outDir', outDir,
        '--module', 'commonjs',
        '--target', 'es2022',
        '--skipLibCheck',
      ],
      { cwd: root, stdio: 'inherit' },
    );
    writeFileSync(path.join(outDir, 'package.json'), '{"type":"commonjs"}');
    const require = createRequire(path.join(outDir, 'noop.cjs'));
    sections = require(path.join(outDir, 'js-docs.js')).sections;
  } catch (e) {
    ok('lib/js-docs.ts compiles and exports `sections`', false, e.message);
  }

  if (!sections) {
    console.log('\nFAIL  (could not load the docs)');
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // SHAPE
  // -------------------------------------------------------------------------

  section('shape');

  ok('lib/js-docs.ts compiles and exports `sections`', Array.isArray(sections) && sections.length > 0,
    `got ${JSON.stringify(sections)?.slice(0, 80)}`);

  const pages = [];
  for (const s of sections) {
    if (!s.slug || !s.title) ok(`section ${s.title ?? s.slug ?? '?'} has a slug and title`, false);
    for (const p of s.pages || []) {
      pages.push({ slug: s.slug, sectionTitle: s.title, title: p.title, body: p.body, code: p.code });
      if (!p.title) ok(`page ${s.slug}/? has a title`, false);
      if (!p.body || !p.body.trim()) ok(`page ${s.slug}/${p.title} has a body`, false);
    }
  }
  ok('every section has pages', sections.every((s) => (s.pages || []).length > 0));
  ok('the docs carry examples', pages.some((p) => typeof p.code === 'string' && p.code.trim()),
    'no page has a `code` field — the drawer would render prose only');

  // -------------------------------------------------------------------------
  // RUNS — every example executes in the drawer's own runner.
  // -------------------------------------------------------------------------
  //
  // The drawer runs code in a Worker built from lib/js-runner-source.ts with
  // the localStorage shim prepended (see components/DocLiveSnippet.tsx). A
  // vm context with the same console capture and the same timeout is the
  // closest offline equivalent: the Worker's new Function and vm's run both
  // execute the code as a script, and the timeout mirrors the kill timer that
  // stops a runaway loop.

  section('examples run');

  const runnerSrc = readRunnerSource();
  const storageShim = `
const __store = new Map();
const localStorage = {
  setItem: (k, v) => { __store.set(String(k), String(v)); },
  getItem: (k) => (__store.has(String(k)) ? __store.get(String(k)) : null),
  removeItem: (k) => { __store.delete(String(k)); },
};
`;

  const withCode = pages.filter((p) => typeof p.code === 'string' && p.code.trim());
  ok('the runner source is readable', runnerSrc !== null, 'lib/js-runner-source.ts did not compile');

  if (runnerSrc) {
    for (const p of withCode) {
      const label = `${p.slug} / ${p.title}`;
      const logs = [];
      const consoleImpl = {
        log: (...a) => logs.push(a.map(String).join(' ')),
        warn: (...a) => logs.push(a.map(String).join(' ')),
        error: (...a) => logs.push(a.map(String).join(' ')),
      };
      const ctx = vm.createContext({ console: consoleImpl, self: { postMessage() {} } });
      // The one page that teaches a runaway loop is a runaway loop on
      // purpose. The drawer's Worker kill timer stops it in the browser; here
      // the vm timeout plays the same role, and the check is that the timer
      // FIRES — a page that stopped looping would no longer be teaching what
      // its title promises.
      const isRunaway = p.slug === 'loops' && p.title === 'Infinite loops';
      try {
        vm.runInContext(storageShim + '\n' + runnerSrc + '\n' + p.code, ctx, {
          timeout: isRunaway ? 1000 : 5000,
          filename: `lib/js-docs.ts<${label}>`,
        });
        ok(label, isRunaway ? false : true,
          isRunaway ? 'the infinite-loop example stopped — it is no longer a runaway loop' : undefined);
      } catch (e) {
        const timedOut = e && e.name === 'Error' && /timed out/i.test(String(e.message));
        ok(label, isRunaway ? timedOut : false,
          isRunaway
            ? (timedOut ? undefined : `expected a timeout, got ${e.name}: ${e.message}`)
            : `${e.name}: ${e.message}`);
      }
    }
  }

  // -------------------------------------------------------------------------
  // WIRING — a docs set nobody renders is the defect this repo has shipped
  // twice before (steps, aiGrader.prompt, /portable). The JS docs must be
  // mounted where a student meets plain JavaScript: the sandbox's JavaScript
  // mode and console lessons.
  // -------------------------------------------------------------------------

  section('wiring');

  const sandboxSrc = readFileSafe(path.join(root, 'components/SandboxWorkspace.tsx'));
  const lessonSrc = readFileSafe(path.join(root, 'components/LessonWorkspace.tsx'));

  ok('the sandbox mounts the JS docs for its JavaScript mode',
    sandboxSrc.includes('DocsDrawer') && sandboxSrc.includes('defaultSetId={mode.id}'),
    'SandboxWorkspace.tsx must render DocsDrawer with the current mode as the default set');
  ok('console lessons mount the JS docs',
    lessonSrc.includes('DocsDrawer') && lessonSrc.includes('defaultSetId="js"'),
    'LessonWorkspace.tsx must render DocsDrawer defaulting to the js set for console lessons');

  // -------------------------------------------------------------------------
  // SCOPE — plain JavaScript only. The runner has no moSHion or reSHape
  // engine, so a page that teaches one would fail on every Run.
  // -------------------------------------------------------------------------

  section('scope');

  const ENGINE_NAMES = [
    ['new Canvas', 'moSHion canvas'],
    ['background(', 'moSHion drawing'],
    ['sprite', 'moSHion sprites'],
    ['box(', 'reSHape box'],
    ['tube(', 'reSHape tube'],
    ['require(', 'the JSCAD require line'],
  ];
  for (const [needle, what] of ENGINE_NAMES) {
    const hits = withCode.filter((p) => p.code.includes(needle));
    ok(`no example reaches for ${what}`, hits.length === 0,
      hits.map((h) => `${h.slug} / ${h.title}`).join(', '));
  }
} finally {
  rmSync(outDir, { recursive: true, force: true });
}

console.log(fails === 0 ? '\nALL PASS  (js docs)' : `\nFAIL  (${fails})`);
process.exit(fails === 0 ? 0 : 1);

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function readFileSafe(p) {
  try { return readFileSync(p, 'utf8'); } catch { return ''; }
}

// Compile lib/js-runner-source.ts and return its RUNNER_SOURCE string, so the
// examples are tested against the exact code the drawer ships.
function readRunnerSource() {
  const dir = mkdtempSync(path.join(tmpdir(), 'shcode-js-runner-'));
  try {
    execFileSync(
      process.execPath,
      [
        path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
        'lib/js-runner-source.ts',
        '--outDir', dir,
        '--module', 'commonjs',
        '--target', 'es2022',
        '--skipLibCheck',
      ],
      { cwd: root, stdio: 'ignore' },
    );
    writeFileSync(path.join(dir, 'package.json'), '{"type":"commonjs"}');
    const require = createRequire(path.join(dir, 'noop.cjs'));
    return require(path.join(dir, 'js-runner-source.js')).RUNNER_SOURCE;
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
