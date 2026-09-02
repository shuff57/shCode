#!/usr/bin/env node
// The gate for the scripting surface: lib/script-surface.ts and lib/hull.ts.
//
// WHAT THIS PROTECTS. reSHape's typed half is 183 documented examples calling 75
// API names, and the kernel underneath it is being replaced. Every one of those
// names either survives the swap or it does not, and until this file existed
// nobody had counted which. The count is not the deliverable -- the count going
// STALE is what this stops. A new example that reaches for a name nobody has
// judged fails here, at the point where judging it is cheap, rather than in a
// classroom.
//
// Three parts:
//
//   HULL       lib/hull.ts against arithmetic. `hull` is the one name in the
//              vocabulary with no OpenCascade operation behind it in any build,
//              so it is ours, and a convex hull has exact volumes that a wrong
//              implementation cannot fake.
//   SURFACE    lib/script-surface.ts against itself -- that a verdict carries
//              what the verdict implies, and that the two REFUSALS stay apart.
//              One is geometry we owe; the other is a line in a build config.
//   DOCS       lib/reshape-docs.ts read as DATA, never re-parsed with a regex
//              for its structure, and every name its examples call held against
//              the classification.
//
// The docs half also PRINTS the portability number every run, the way
// test-reshape-docs.mjs prints coverage. A number that only exists in a commit
// message is a number that stops being true.
//
// A red check is closed by fixing the classification or the docs -- never by
// widening an assertion here. Reclassifying a name to make the count nicer is
// the failure this file is built to make visible.
//
//   node scripts/test-script-surface.mjs

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { apiNames, loadModeling } from './reshape-harness.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

let fails = 0;
let warns = 0;
const check = (name, cond, extra) => {
  if (cond) console.log('  PASS  ' + name);
  else { fails++; console.log('  FAIL  ' + name + (extra !== undefined ? '\n        ' + extra : '')); }
};
const warn = (name, extra) => {
  warns++;
  console.log('  WARN  ' + name + (extra !== undefined ? '\n        ' + extra : ''));
};
const note = (t) => console.log('  ----  ' + t);
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

const out = mkdtempSync(path.join(tmpdir(), 'shcode-surface-'));

try {
  execFileSync(
    process.execPath,
    [
      path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
      'lib/hull.ts', 'lib/script-surface.ts', 'lib/docs-core.ts', 'lib/reshape-docs.ts',
      '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const req = createRequire(path.join(out, 'noop.cjs'));
  const hull = req(path.join(out, 'hull.js'));
  const surface = req(path.join(out, 'script-surface.js'));
  const { sections } = req(path.join(out, 'reshape-docs.js'));

  const local = createRequire(import.meta.url);
  console.log('=== lib/hull.ts ===');
  local('./hull-assertions.cjs')({ hull, check, near });

  console.log('\n=== lib/script-surface.ts ===');
  local('./script-surface-assertions.cjs')({ surface, check });

  // -------------------------------------------------------------------------
  // THE DOCS, AGAINST THE CLASSIFICATION
  // -------------------------------------------------------------------------
  //
  // Which names an example calls is read out of the example text, and that read
  // is deliberately crude in the SAFE direction: strings and comments are
  // blanked first so prose cannot contribute a name, locally declared functions
  // are subtracted so a helper the example defines is not mistaken for an API
  // call, and what is left is every `name(` not preceded by a dot. Over-reading
  // costs a false "unclassified" and someone adds a line; under-reading would
  // let a real name slip past the gate unjudged, which is the error that
  // matters.

  console.log('\n=== documented examples against the classification ===');

  const KEYWORD = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function',
    'typeof', 'new', 'delete', 'void', 'in', 'of', 'do', 'else', 'try', 'throw', 'const',
    'let', 'var', 'require', 'main']);

  const namesIn = (code) => {
    const src = code
      .replace(/\/\/[^\n]*/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/'(?:[^'\\]|\\.)*'/g, "''")
      .replace(/"(?:[^"\\]|\\.)*"/g, '""')
      .replace(/`(?:[^`\\]|\\.)*`/g, '``');
    const called = new Set();
    const rx = /(^|[^.\w$])([A-Za-z_$][\w$]*)\s*\(/g;
    let m;
    while ((m = rx.exec(src))) if (!KEYWORD.has(m[2])) called.add(m[2]);
    const declared = new Set();
    const lrx = /(?:function\s+([A-Za-z_$][\w$]*)|(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=)/g;
    let d;
    while ((d = lrx.exec(src))) declared.add(d[1] || d[2]);
    return [...called].filter((n) => !declared.has(n));
  };

  const pages = [];
  for (const s of sections) {
    for (const p of s.pages || []) {
      if (typeof p.code === 'string' && p.code.trim()) {
        pages.push({ key: `${s.slug} / ${p.title}`, names: namesIn(p.code) });
      }
    }
  }
  check('the docs still carry runnable examples', pages.length > 100, `${pages.length} pages`);

  // Only names the BUNDLE exports are API calls. Anything else the read picked
  // up is a false positive from the crude parse and is not the classification's
  // problem -- which is measured rather than assumed, by intersecting with the
  // real export list.
  const exported = apiNames(loadModeling().jscad);
  const called = new Set();
  for (const p of pages) for (const n of p.names) if (exported.has(n)) called.add(n);
  note(`${pages.length} pages call ${called.size} distinct @jscad/modeling names`);

  const missing = surface.unclassified([...called]).sort();
  check('every name a documented example calls has a verdict',
    missing.length === 0,
    missing.length ? `unclassified: ${missing.join(', ')} — add each to SURFACE in lib/script-surface.ts` : '');

  // The other direction. A classified name nobody calls any more is not a
  // failure -- the classification is allowed to be wider than the docs -- but it
  // must not be a real export that vanished, and it must not go unnoticed.
  const stale = surface.SURFACE.filter((e) => !exported.has(e.name)).map((e) => e.name);
  check('every classified name is a real @jscad/modeling export',
    stale.length === 0, stale.join(', '));

  const uncalled = surface.SURFACE.filter((e) => !called.has(e.name)).map((e) => e.name);
  if (uncalled.length === 0) check('every classified name is still called by an example', true);
  else warn(`${uncalled.length} classified name(s) no example calls any more`, uncalled.join(', '));

  // -------------------------------------------------------------------------
  // THE NUMBER
  // -------------------------------------------------------------------------

  console.log('\n=== portability ===');

  const blocked = [];
  for (const p of pages) {
    const b = surface.blockedNames(p.names.filter((n) => exported.has(n)));
    if (b.length) blocked.push({ key: p.key, why: b });
  }
  const portable = pages.length - blocked.length;
  const pct = Math.round((portable / pages.length) * 1000) / 10;
  console.log(`  ----  ${portable} / ${pages.length} pages (${pct}%) run on a B-rep kernel`);

  const absent = new Set();
  const unbound = new Set();
  for (const b of blocked) {
    for (const e of b.why) (e.serves === 'absent' ? absent : unbound).add(e.name);
  }
  console.log(`  ----  ${blocked.length} blocked: ${absent.size} name(s) OpenCascade lacks `
    + `(${[...absent].sort().join(', ')}), ${unbound.size} this build does not bind `
    + `(${[...unbound].sort().join(', ')})`);
  for (const b of blocked) console.log(`  ----    ${b.key}  [${b.why.map((e) => e.name).join(', ')}]`);

  // A floor, not a target. It exists so that a change which quietly breaks
  // dozens of pages cannot pass as a rounding difference; it is deliberately
  // well below the measured 90.7% so that classifying one more name honestly
  // does not require editing this file.
  check('most of the documented surface survives the swap', pct >= 85, `${pct}%`);

  // ...and its control. A gate that only has a floor goes green when the
  // classification stops finding anything, so the CEILING is asserted too: if
  // every page suddenly reads as portable, either the blocked names got fixed
  // (in which case delete this) or the read stopped working (much more likely).
  check('CONTROL: the blocked pages are actually being found',
    blocked.length > 0,
    'no page reads as blocked — either hull and non-uniform scale now have paths, '
    + 'or namesIn() stopped seeing names');

  // -------------------------------------------------------------------------
  // NOTHING DEV-ONLY IS SITTING WHERE IT WOULD SHIP
  // -------------------------------------------------------------------------
  //
  // next.config.js sets output: 'export', which copies public/ wholesale into
  // the deployed site. The B-rep probe pages lived there for one commit, which
  // would have published two diagnostic pages that 404 on a gitignored kernel
  // and render an error panel -- harmless, and not a page anyone should find on
  // a school site.
  //
  // They are generated into public/reshape/kernel/ now, which is one ignored
  // directory, and their source is scripts/brep-probe/, which Next never copies.
  // Asserted rather than remembered: the failure mode is somebody adding a
  // second probe page next to the first, and a note in a build script does not
  // stop that.

  console.log('\n=== nothing dev-only ships ===');

  const shipped = readdirSync(path.join(root, 'public', 'reshape'))
    .filter((f) => f.endsWith('.html'));
  check('the only page public/reshape ships is the student runner',
    shipped.length === 1 && shipped[0] === 'runner.html',
    shipped.join(', ') + ' — a probe or diagnostic page here WILL be deployed; '
    + 'generate it into public/reshape/kernel/ instead');

  const ignore = readFileSync(path.join(root, '.gitignore'), 'utf8');
  check('...and the directory the generated bundle goes into is gitignored',
    ignore.includes('public/reshape/kernel/'),
    'without this the 22 MB wasm and the probe pages become committable');
  check('...as is the CORS control file, which sits outside it by design',
    ignore.includes('public/reshape/kernel-cors-control.js'));

  // CONTROL: the probe source must actually exist, or the check above passes
  // for the wrong reason -- an empty scripts/brep-probe/ would also leave
  // public/reshape clean.
  check('CONTROL: the probe still exists, in the source location',
    existsSync(path.join(root, 'scripts', 'brep-probe', 'brep.html'))
      && existsSync(path.join(root, 'scripts', 'brep-probe', 'brep-check.html')),
    'public/reshape being clean means nothing if the probe was simply deleted');
} finally {
  rmSync(out, { recursive: true, force: true });
}

console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}${warns ? `, ${warns} warning(s)` : ''}`);
process.exit(fails === 0 ? 0 : 1);
