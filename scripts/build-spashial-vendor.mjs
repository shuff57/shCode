#!/usr/bin/env node
// Copy the files spaSHial's runner loads in the browser into public/spashial/vendor/.
//
//   node scripts/build-spashial-vendor.mjs
//
// WHAT: Jolt's single-threaded wasm build (jolt-physics.wasm.js + .wasm, about
// 3 MB raw, 0.88 MB gzipped) and three.js's minified build (module + core).
//
// WHY COPIED AND NOT COMMITTED. Same reasoning as scripts/build-brep-kernel.mjs:
// binaries that already live in node_modules are a decision about the repository,
// and a committed copy goes stale the moment the dependency is bumped. The output
// is gitignored (public/spashial/vendor/) and rebuilt by prebuild.
//
// WHY THE PATH MATTERS. The preview iframe is sandboxed WITHOUT allow-same-origin,
// so it has an opaque origin and ES modules and .wasm are fetched in CORS mode.
// public/_headers gives /spashial/* Access-Control-Allow-Origin: *, exactly as it
// does for /reshape/kernel/*. Without it the module is blocked before the wasm is
// even requested (reproduced in scripts/spashial-bench/browser/, which prints
// "from origin 'null' has been blocked by CORS policy").
//
// Single-threaded on purpose: the multithread build needs SharedArrayBuffer, which
// needs COOP/COEP headers on every page, and those would break the rest of the site.

import { copyFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'spashial', 'vendor');

const FILES = [
  ['node_modules/jolt-physics/dist/jolt-physics.wasm.js', 'jolt/jolt-physics.wasm.js'],
  ['node_modules/jolt-physics/dist/jolt-physics.wasm.wasm', 'jolt/jolt-physics.wasm.wasm'],
  // three.module.min.js imports './three.core.min.js' by that exact name
  ['node_modules/three/build/three.module.min.js', 'three/three.module.min.js'],
  ['node_modules/three/build/three.core.min.js', 'three/three.core.min.js'],
];

const missing = FILES.filter(([src]) => !existsSync(path.join(root, src)));
if (missing.length) {
  console.error('[build-spashial-vendor] missing from node_modules (run npm install):');
  for (const [src] of missing) console.error('  ' + src);
  process.exit(1);
}

let total = 0;
for (const [src, dest] of FILES) {
  const to = path.join(out, dest);
  mkdirSync(path.dirname(to), { recursive: true });
  copyFileSync(path.join(root, src), to);
  total += statSync(to).size;
}
console.log(`[build-spashial-vendor] ${FILES.length} files, ${(total / 1048576).toFixed(1)} MB -> public/spashial/vendor/`);
