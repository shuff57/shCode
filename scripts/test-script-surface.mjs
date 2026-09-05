#!/usr/bin/env node
// The gate for the scripting surface: lib/script-surface.ts and lib/hull.ts.
//
// WHAT THIS PROTECTS. lib/script-surface.ts classifies which JSCAD API names
// the B-rep kernel can build, which are blocked, and which (hull) are ours
// outright. That classification's own internal consistency is what this
// checks: HULL measures lib/hull.ts against arithmetic; SURFACE measures
// lib/script-surface.ts against itself, that a verdict carries what it
// implies and the two REFUSALS stay apart (one is geometry we owe, the other
// is a line in a build config).
//
// USED TO ALSO measure the classification against a real JSCAD export list
// and a real JSCAD-documented example corpus (public/reshape/docs/
// jscad-legacy.md, apiNames(loadModeling().jscad)) and print a portability
// percentage -- both the reference page and the vendored bundle are gone
// (CLAUDE.md's "JSCAD is retired" section), and no engine-independent
// substitute survived the deletion (see the comment where that section used
// to be). Left undone rather than guessed at.
//
// A red check is closed by fixing the classification -- never by widening an
// assertion here. Reclassifying a name to make the count nicer is exactly
// the failure this file is built to make visible.
//
//   node scripts/test-script-surface.mjs

import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  //
  // The dot exclusion is why `minkowski.minkowskiSum(...)` -- the docs' only
  // call to it -- is invisible to this scan even after minkowskiSum gets a
  // verdict in SURFACE, and shows up below as "no example calls this any
  // more". Tried lifting the exclusion once: it also picked up `vec3.scale(`
  // and `vec2.scale(` and misfiled four unrelated `maths` pages under
  // `transforms`' `scale` refusal, because JSCAD really does export different
  // functions under the same bare name in different modules. Bare-name
  // matching cannot tell those apart without tracking which module each call
  // came through, so the safer wrong answer -- a spurious WARN here -- stands
  // over the more dangerous one -- a real page misclassified as blocked by a
  // name it never calls.

  // The DOCS + portability measurement that used to run here read
  // public/reshape/docs/jscad-legacy.md and apiNames(loadModeling().jscad) --
  // the JSCAD reference page and the vendored bundle's own export list, both
  // deleted along with the JSCAD runner (CLAUDE.md's "JSCAD is retired"
  // section). lib/script-surface.ts's classification (which JSCAD names port
  // to the kernel, which are blocked, which are ours) is not itself deleted
  // -- HULL and SURFACE above still measure it -- but there is no longer a
  // real JSCAD export list or a JSCAD-documented example corpus to hold it
  // against, so the "every classified name is real"/"every called name has a
  // verdict"/"X% portable" measurement this section made has no surviving
  // engine-independent form. Left undone rather than guessed at: this file
  // was not named in the JSCAD-retirement spec, and reclassifying
  // lib/script-surface.ts's whole purpose is a bigger call than fixing an
  // import.

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
  // One student runner ships now: script-runner.html (reSHape Script). The
  // JSCAD runner.html is gone (CLAUDE.md's "JSCAD is retired" section).
  const allowed = ['script-runner.html'];
  check('the only pages public/reshape ships are the two student runners',
    shipped.length === allowed.length && allowed.every((f) => shipped.includes(f)),
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
