#!/usr/bin/env node
// test-reshape-docs.mjs — the verification gate for the reSHape docs stack.
//
// Three groups now. Each one closes a claim the stack currently makes only
// in prose:
//
//   NETWORK    nothing under public/reshape/ or on the preview path pulls a
//              resource off the network. A CDN reference works fine at a desk
//              and dies in a classroom behind a filter.
//   DRIFT      lib/reshape-docs.ts and public/reshape/docs/reference.md document
//              the same DSL vocabulary. Reported as a WARNING with a count so
//              the two references cannot silently diverge.
//   COVERAGE   documented X / Y DSL calls (Z%). Printed every run. This is the
//              measurable half of the bar.
//
// USED TO ALSO run BUNDLE (the two vendored JSCAD libraries present and
// full-size), EXAMPLES (every `code` field on lib/reshape-docs.ts executed
// against the vendored bundle inside the JSCAD shim scope
// public/reshape/runner.html gave a student) and STYLES (bare vs qualified
// JSCAD calls resolving to the same reference). All three measured the JSCAD
// runner and bundle, both deleted along with it (CLAUDE.md's "JSCAD is
// retired" section) -- scripts/test-reshape-script.mjs already runs every
// reference fence and in-app page on the kernel instead, which is why this
// file does not duplicate that here. There is no separate "refusal
// sentences" group heading in this comment because there never was one to
// promise; the check below it still runs, just without a banner of its own
// in this list.
//
// lib/reshape-docs.ts is TypeScript that imports without a file extension, which
// neither Node's ESM resolver nor its type stripping will load. DRIFT compiles
// lib/reshape-script.ts (for its VOCABULARY constant) to CommonJS in a temp
// dir for the same reason. Same trick scripts/test-diagram.mjs uses on
// lib/diagram-*.ts.
//
// A red check is closed by fixing the docs — never by loosening an assertion
// here.
//
//   node scripts/test-reshape-docs.mjs

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import {
  existsSync, readdirSync, readFileSync, mkdtempSync, rmSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { documentedNames, docText } from './reshape-docs-text.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');

// ---- the recorder, in the shape scripts/diagram-assertions.cjs uses ---------

let fails = 0;
let warns = 0;
function ok(name, cond, extra) {
  if (cond) { console.log('  PASS  ' + name); }
  else { fails++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        ' + extra : '')); }
}
function warn(name, extra) {
  warns++;
  console.log('  WARN  ' + name + (extra !== undefined ? '\n        ' + extra : ''));
}
function note(text) { console.log('  ----  ' + text); }
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ---------------------------------------------------------------------------
// NETWORK PURITY
// ---------------------------------------------------------------------------
//
// Two tiers, because "any http(s):// reference" and "any network fetch" are not
// the same set. An <a href> to openjscad.xyz in a docs page is a dead link
// offline and nothing worse; a <script src> to unpkg is a blank viewport for a
// whole class. So:
//
//   FAIL  any CDN host anywhere, and any construct that LOADS from the network.
//   WARN  a plain http(s):// URL in prose or an <a href>, listed so a real one
//         can never hide inside the noise.

section('network purity');

const CDN = /unpkg\.com|jsdelivr|cdnjs|cdn\.skypack|esm\.sh|unpkg\.io|\/\/cdn\./i;

// Anything that makes the browser go and get a resource.
const REMOTE_LOAD = [
  [/\bsrc\s*=\s*["'`]\s*(?:https?:)?\/\//i, 'src= to an absolute URL'],
  [/<link[^>]+href\s*=\s*["'`]\s*(?:https?:)?\/\//i, '<link href> to an absolute URL'],
  [/@import\s+(?:url\()?["'`]?\s*(?:https?:)?\/\//i, 'CSS @import from a URL'],
  [/\bfetch\s*\(\s*["'`]\s*(?:https?:)?\/\//i, 'fetch() to an absolute URL'],
  [/\bimportScripts\s*\(\s*["'`]\s*(?:https?:)?\/\//i, 'importScripts() from a URL'],
  [/\bnew\s+Worker\s*\(\s*["'`]\s*(?:https?:)?\/\//i, 'new Worker() from a URL'],
  [/\bXMLHttpRequest\b[\s\S]{0,120}?open\s*\([^)]*["'`]\s*https?:\/\//i, 'XHR to an absolute URL'],
  [/\bfrom\s+["'`]\s*https?:\/\//i, 'ESM import from a URL'],
  [/\bimport\s*\(\s*["'`]\s*https?:\/\//i, 'dynamic import() from a URL'],
];

// The preview path: the component that mounts the iframe, and the builder that
// assembles preview HTML. Both are outside public/reshape but are what actually
// reaches a student.
const PREVIEW_PATH = [
  path.join(root, 'components/ReshapePreview.tsx'),
  path.join(root, 'components/MoshionPreview.tsx'),
  path.join(root, 'lib/preview-builder.ts'),
];

const SCANNABLE = /\.(html|js|mjs|cjs|md|ts|tsx|json|css)$/;
// public/reshape/kernel/ is gitignored build output (scripts/build-brep-kernel.mjs)
// -- three.js and the OpenCascade wasm loader, vendored third-party code that
// carries its own license URLs same as the deleted JSCAD bundles did. Not
// ours to audit, and it will not exist at all in a fresh checkout that has
// not run `prebuild` yet.
const KERNEL_DIR = path.join(root, 'public/reshape/kernel');

function scanTargets() {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (p === KERNEL_DIR) continue;
      if (e.isDirectory()) { walk(p); continue; }
      if (!SCANNABLE.test(e.name)) continue;
      files.push(p);
    }
  };
  walk(path.join(root, 'public/reshape'));
  for (const p of PREVIEW_PATH) if (existsSync(p)) files.push(p);
  return files;
}

const scanned = scanTargets();
note(`scanned ${scanned.length} files under public/reshape/ + the preview path`);

{
  const hits = [];
  for (const p of scanned) {
    const src = readFileSync(p, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (CDN.test(line)) hits.push(`${rel(p)}:${i + 1}  ${line.trim().slice(0, 100)}`);
    });
  }
  ok('no CDN host referenced anywhere', hits.length === 0, hits.join('\n        '));
}

{
  const hits = [];
  for (const p of scanned) {
    const src = readFileSync(p, 'utf8');
    for (const [rx, what] of REMOTE_LOAD) {
      const m = rx.exec(src);
      if (m) {
        const line = src.slice(0, m.index).split('\n').length;
        hits.push(`${rel(p)}:${line}  ${what}`);
      }
    }
  }
  ok('nothing loads a resource off the network', hits.length === 0, hits.join('\n        '));
}

{
  // Not a failure — but every one gets listed, so a real offender can never
  // hide behind "there are always some URLs in there".
  const urls = [];
  for (const p of scanned) {
    const src = readFileSync(p, 'utf8');
    src.split('\n').forEach((line, i) => {
      const m = /https?:\/\/[^\s"'`)<>\]]+/.exec(line);
      if (m) urls.push(`${rel(p)}:${i + 1}  ${m[0]}`);
    });
  }
  if (urls.length === 0) ok('no http(s):// text references at all', true);
  else warn(`${urls.length} http(s):// text reference(s) — prose/attribution links, nothing is fetched`,
    urls.join('\n        '));
}

// ---------------------------------------------------------------------------
// DRIFT between lib/reshape-docs.ts and public/reshape/docs/reference.md
// ---------------------------------------------------------------------------
//
// Warnings, not failures: the two references are allowed to differ on purpose
// (reference.md is the offline copy, the in-app docs are the taught path). What
// is NOT allowed is differing without anyone noticing, so the count is printed
// every run.
//
// Candidates used to be every @jscad/modeling export; both references are DSL
// now, so the candidate list is the DSL's own vocabulary instead --
// lib/reshape-script.ts's VOCABULARY constant, the same array runScript()
// builds its `globals` object from (see that file's own comment on why it is
// exported: this gate is exactly the reader that constant exists for). Read
// as compiled data rather than grepped for a hand-copied list, so a DSL call
// added there and never mentioned here is measured, not assumed.

section('doc drift (warnings)');

const vocabOutDir = mkdtempSync(path.join(tmpdir(), 'shcode-reshape-vocab-'));
let VOCABULARY = null;
try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/reshape-script.ts', 'lib/model-types.ts', 'lib/model-codegen.ts',
      'lib/sketch-arc.ts', 'lib/sketch-solve.ts', 'lib/topo-name.ts',
      '--outDir', vocabOutDir, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(vocabOutDir, 'package.json'), '{"type":"commonjs"}');
  const requireVocab = createRequire(path.join(vocabOutDir, 'noop.cjs'));
  VOCABULARY = requireVocab(path.join(vocabOutDir, 'reshape-script.js')).VOCABULARY;
} catch (e) {
  ok('lib/reshape-script.ts compiles and exports `VOCABULARY`', false, e.message);
} finally {
  rmSync(vocabOutDir, { recursive: true, force: true });
}

ok(
  'lib/reshape-script.ts compiles and exports `VOCABULARY`',
  Array.isArray(VOCABULARY) && VOCABULARY.length > 0,
  `got ${JSON.stringify(VOCABULARY)?.slice(0, 80)}`
);

const dslNames = Array.isArray(VOCABULARY) ? [...VOCABULARY].sort() : [];

const inAppDocumented = documentedNames(docText.inApp(), dslNames);
const refDocumented = documentedNames(docText.reference(), dslNames);

const onlyInApp = dslNames.filter((n) => inAppDocumented.has(n) && !refDocumented.has(n));
const onlyRef = dslNames.filter((n) => refDocumented.has(n) && !inAppDocumented.has(n));

if (onlyInApp.length === 0) ok('nothing in lib/reshape-docs.ts is missing from reference.md', true);
else warn(`${onlyInApp.length} call(s) in lib/reshape-docs.ts but not in reference.md`, onlyInApp.join(', '));

if (onlyRef.length === 0) ok('nothing in reference.md is missing from lib/reshape-docs.ts', true);
else warn(`${onlyRef.length} call(s) in reference.md but not in lib/reshape-docs.ts`, onlyRef.join(', '));

note(`drift total: ${onlyInApp.length + onlyRef.length} name(s)`);

// ---------------------------------------------------------------------------
// COVERAGE
// ---------------------------------------------------------------------------

section('refusal sentences are the runtime\'s own');
{
  // reference.md's "When a step is refused" section and the in-app Refusals
  // page quote what the app says. On 2026-09-03 a student lens hit two real
  // sentences and found neither in the doc, which quoted four invented ones.
  // So: every quoted sentence that reads like a refusal must be an instance of
  // a string template in the runtime. `${...}` in a template matches anything;
  // `a -- ` + `b` continuations are joined before extraction.
  const SOURCES = ['lib/occt-build.ts', 'lib/model-types.ts', 'lib/reshape-script.ts'];
  const templates = [];
  for (const f of SOURCES) {
    let s = readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');
    s = s.replace(/`\s*\n\s*\+\s*`/g, '');
    for (const m of s.matchAll(/`((?:[^`\\]|\\.)*)`|'((?:[^'\\\n]|\\.)*)'/g)) {
      const lit = m[1] ?? m[2];
      if (!lit || lit.length < 25 || !lit.includes(' ')) continue;
      const rx = '^' + lit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\$\\\{.*?\\\}/g, '.+?') + '$';
      templates.push(new RegExp(rx));
    }
  }
  ok('the runtime yields refusal templates to compare against', templates.length >= 20, `${templates.length} templates`);
  const looksLikeRefusal = (q) => / -- /.test(q) || /Round the shape before/.test(q);
  const DOCS = [
    ['public/reshape/docs/reference.md', docText.reference()],
    ['lib/reshape-docs.ts', readFileSync(path.join(root, 'lib/reshape-docs.ts'), 'utf8')],
  ];
  let quotes = 0;
  for (const [where, text] of DOCS) {
    for (const m of text.matchAll(/"([^"\n]{20,})"/g)) {
      const q = m[1];
      if (!looksLikeRefusal(q)) continue;
      quotes++;
      const line = text.slice(0, m.index).split('\n').length;
      ok(`${where}:${line} quotes a sentence the runtime can say`, templates.some((rx) => rx.test(q)), q);
    }
  }
  ok('the quote scan found the refusal sentences', quotes >= 8, `${quotes} quoted refusals across both documents`);
}

section('coverage');

{
  const documented = new Set([...inAppDocumented, ...refDocumented]);
  const y = dslNames.length;
  const x = documented.size;
  const z = y === 0 ? 0 : Math.round((x / y) * 1000) / 10;
  console.log(`  ----  documented ${x} / ${y} DSL calls (${z}%)`);
  console.log(`  ----    lib/reshape-docs.ts: ${inAppDocumented.size}   reference.md: ${refDocumented.size}`);
  console.log(`  ----    undocumented: ${dslNames.filter((n) => !documented.has(n)).join(', ') || '(none)'}`);
  // 24 DSL calls as of this pass (see VOCABULARY in lib/reshape-script.ts).
  // The floor only has to catch VOCABULARY failing to load and reporting
  // 0/0 as "100%" -- it is not a claim that the DSL will always have at
  // least 20 calls, only that a healthy load has noticeably more than zero.
  ok('the DSL exposes a real vocabulary to measure against', y >= 20, `only ${y} DSL calls`);
  ok('the docs cover something', x > 0);
}

// ---------------------------------------------------------------------------

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}${warns ? `, ${warns} warning(s)` : ''}`);
process.exit(fails === 0 ? 0 : 1);
