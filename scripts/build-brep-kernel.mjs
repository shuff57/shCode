#!/usr/bin/env node
// Assemble the browser-side B-rep kernel bundle into public/reshape/kernel/.
//
// WHAT THIS IS FOR. lib/occt-build.ts and lib/occt-mesh.ts have been measured in
// Node against an OpenCascade build for a week, and until this script existed
// none of it could reach a browser. This puts the pieces where a page can load
// them: the wasm kernel, the emscripten loader, and our own layer compiled to
// real ES modules.
//
// WHY THE PATH IS /reshape/kernel/. public/_headers grants
// `Access-Control-Allow-Origin: *` on exactly that prefix, and it has to. The
// preview iframe is sandboxed WITHOUT allow-same-origin so student code cannot
// call /api/* as the student -- which makes it an OPAQUE origin, and an opaque
// origin's fetches carry `Origin: null`. A classic <script src> is fetched
// no-cors and loads fine, which is why the JSCAD bundle never needed any of
// this; an ES MODULE is always fetched in CORS mode, and so is the .wasm an
// emscripten module pulls in. So anything here must be under that prefix or it
// is blocked before the wasm is even requested.
//
// WHY THE OUTPUT IS NOT COMMITTED. The wasm is 22.97 MB (6.87 MB gzipped), which
// is a decision about the repository rather than about the code, and the
// compiled JS beside it is derived from lib/ and would go stale the moment
// anyone edited a source file without re-running this. Both are generated.
//
// NO BUNDLER, deliberately. This repo has none and adding one for eight files
// would be a dependency to carry forever. tsc emits ES modules with
// extensionless relative imports, which browsers cannot resolve, so the paths
// are rewritten afterwards -- twelve lines instead of a build system.
//
//   node scripts/build-brep-kernel.mjs --occt <dir containing replicad_single.js>
//
// Without --occt it emits only our own layer and says what is missing, rather
// than writing a half-bundle that fails at runtime with a 404.

import { execFileSync } from 'node:child_process';
import {
  copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dest = path.join(root, 'public', 'reshape', 'kernel');

const argIdx = process.argv.indexOf('--occt');
const occtDir = argIdx > -1 ? process.argv[argIdx + 1] : process.env.OCCT_DIR;

/** Our own layer. occt-build is the entry; the rest are what it reaches. */
const SOURCES = [
  'lib/occt-build.ts',
  // The TAUGHT vocabulary, which occt-build does not reach: the mouse path goes
  // through buildDoc(), the script path goes through createApi(). Both halves
  // of the modeller have to be in the bundle or one of them 404s at import.
  'lib/occt-api.ts',
  'lib/occt-mesh.ts',
  'lib/model-types.ts',
  'lib/sketch-arc.ts',
  'lib/topo-name.ts',
  'lib/topo-resolve.ts',
  'lib/topo-history.ts',
  'lib/hull.ts',
  // three.js's twin of occt-mesh.ts -- runner-brep.html draws through this
  // instead of the JSCAD/regl geom3 path. Type-only 'three' import, so tsc
  // erases it and this file carries no runtime dependency on three itself.
  'lib/occt-three.ts',
];

mkdirSync(dest, { recursive: true });

execFileSync(
  process.execPath,
  [
    path.join(root, 'node_modules', 'typescript', 'bin', 'tsc'),
    ...SOURCES,
    '--outDir', dest,
    '--module', 'es2022',
    '--target', 'es2022',
    '--moduleResolution', 'bundler',
    '--skipLibCheck',
  ],
  { cwd: root, stdio: 'inherit' },
);

// tsc leaves `from './model-types'`, which is legal TypeScript and not a legal
// browser module specifier. Rewritten rather than configured because
// `moduleResolution: node16` would demand the .js suffix in the SOURCE files
// too, and those are also compiled by Next, which does not want it.
let rewritten = 0;
for (const f of readdirSync(dest)) {
  if (!f.endsWith('.js')) continue;
  const p = path.join(dest, f);
  const before = readFileSync(p, 'utf8');
  const after = before.replace(
    /(\bfrom\s+['"])(\.\.?\/[^'"]+?)(['"])/g,
    (m, a, spec, z) => (spec.endsWith('.js') ? m : a + spec + '.js' + z),
  );
  if (after !== before) { writeFileSync(p, after); rewritten++; }
}
console.log(`compiled ${SOURCES.length} sources, rewrote imports in ${rewritten} file(s)`);

// three.js, vendored the same way the wasm kernel is: copied at build time,
// not committed. runner-brep.html draws with three.js instead of
// @jscad/regl-renderer, and an ES module import of three needs the SAME
// Access-Control-Allow-Origin cover the OpenCascade module needs -- see the
// file-header comment on why /reshape/kernel/ carries that header and
// public/reshape/lib/ (the classic-script JSCAD bundles) does not. There is no
// UMD build of three.js any more (dropped upstream), so a <script src> tag
// cannot load it; it has to be an ES module, which is what puts it here rather
// than beside jscad-modeling.min.js.
// three.module.min.js imports `from "./three.core.min.js"` -- a recent-ish
// split upstream that is easy to miss because node_modules/three's own
// package.json "exports" map hides it entirely (it resolves "three" straight
// to three.module.min.js and never mentions the core file by name). Measured
// 2026-09-02: without this second copy, the module loads fine everywhere the
// two files sit side by side in node_modules and then 404s the moment
// three.module.min.js is copied out on its own.
for (const f of ['three.module.min.js', 'three.core.min.js']) {
  copyFileSync(
    path.join(root, 'node_modules', 'three', 'build', f),
    path.join(dest, f),
  );
}
{
  // OrbitControls imports `from 'three'` -- a bare specifier, which only
  // resolves under a bundler or an import map. This page has neither (see the
  // NO BUNDLER note above), so the one import line is rewritten to the
  // relative path of the file just vendored beside it.
  const p = path.join(dest, 'OrbitControls.js');
  const src = readFileSync(
    path.join(root, 'node_modules', 'three', 'examples', 'jsm', 'controls', 'OrbitControls.js'),
    'utf8',
  );
  writeFileSync(p, src.replace(/(\bfrom\s+['"])three(['"])/, '$1./three.module.min.js$2'));
}
console.log('  three.module.min.js, three.core.min.js, OrbitControls.js  (vendored from node_modules/three)');

// THE CONTROL, and the reason it is a file rather than an argument.
//
// public/_headers grants Access-Control-Allow-Origin on /reshape/kernel/* and
// the whole loading story rests on that being NECESSARY. A probe that only
// loads the covered path proves the header is SUFFICIENT and says nothing about
// whether it was needed -- and "we added a header and it worked" is exactly the
// shape of a cargo-cult fix.
//
// So one trivial module is emitted deliberately OUTSIDE the covered prefix. The
// probe imports both: the covered one must load, this one must be refused. If
// this ever starts loading, the sandbox is not opaque any more and the reason
// this bundle is laid out the way it is has gone away.
writeFileSync(
  path.join(root, 'public', 'reshape', 'kernel-cors-control.js'),
  '// Generated by scripts/build-brep-kernel.mjs. Deliberately OUTSIDE\n'
  + '// /reshape/kernel/, so it does NOT get the Access-Control-Allow-Origin\n'
  + '// header that public/_headers grants there. public/reshape/brep.html\n'
  + '// imports it and REQUIRES the import to fail -- that failure is what\n'
  + '// proves the header on the real kernel is doing something.\n'
  + 'export const reached = true;\n',
);
console.log('wrote public/reshape/kernel-cors-control.js (must NOT be loadable from the frame)');

// THE PROBE PAGES, copied in rather than living in public/.
//
// next.config.js sets output: 'export', which copies public/ wholesale into the
// deployed site. A probe page sitting there would therefore SHIP -- publicly
// reachable, 404ing on the gitignored kernel, showing an error panel, with the
// school's name on it. Not a security problem and not a page anyone should find.
//
// The fix is structural rather than a note asking someone to remember. The
// source of truth is scripts/brep-probe/, which Next never copies, and the
// build drops a working copy INSIDE the one gitignored directory. So the probe
// exists exactly when the kernel does, and neither can reach production without
// somebody deliberately un-ignoring a path.
//
// THIS RUNS BEFORE THE no-kernel EXIT, and that ordering is a fix rather than a
// preference. It used to sit after it, so a rerun without --occt against an
// ALREADY-POPULATED dest recompiled every source, skipped the probes, and left
// play.html 404ing while every module beside it resolved. The invariant is "the
// probe exists when the KERNEL does", and the kernel being on disk is what that
// means -- not whether a flag was passed on this particular run.
// runner-brep.html rides with the probes for a REASON, not by convenience.
// public/ is copied wholesale by the static export, and the kernel it needs
// lives in the one gitignored directory -- so a copy sitting in
// public/reshape/ would deploy to a public URL and 404 on its own wasm,
// showing an error panel with the school's name on it. Generated in here, it
// exists exactly when the kernel does. scripts/test-script-surface.mjs
// enforces this and caught it the day it was first written to the wrong place.
// When the B-rep runner becomes THE runner, it ships together with a kernel
// that is no longer gitignored, and this line moves with it.
const probes = ['brep.html', 'brep-check.html', 'play.html', 'runner-brep.html'];
for (const f of probes) {
  copyFileSync(path.join(here, 'brep-probe', f), path.join(dest, f));
}
console.log('  ' + probes.join(', ') + '  (probe, dev only)');

if (!occtDir || !existsSync(path.join(occtDir, 'replicad_single.js'))) {
  console.log('\nNo OpenCascade build given, so the kernel itself was NOT copied.');
  console.log('  node scripts/build-brep-kernel.mjs --occt <dir with replicad_single.js>');
  console.log(existsSync(path.join(dest, 'replicad_single.wasm'))
    ? 'A kernel is already in place from an earlier run, so the bundle still works.'
    : 'This is a partial bundle: a page loading it would 404 on the wasm.');
  process.exit(0);
}

for (const f of ['replicad_single.js', 'replicad_single.wasm']) {
  const from = path.join(occtDir, f);
  if (!existsSync(from)) {
    console.error(`missing ${f} in ${occtDir}`);
    process.exit(1);
  }
  copyFileSync(from, path.join(dest, f));
  console.log(`  ${f}  ${(statSync(from).size / 1024 / 1024).toFixed(2)} MB`);
}

console.log(`\nkernel bundle ready at public/reshape/kernel/`);
console.log('  probe:  npm run dev  ->  http://localhost:3002/reshape/kernel/brep-check.html');
