#!/usr/bin/env node
// Build the vendored reshape-cad packages (vendor/reshape-cad/packages/*)
// from their TypeScript source into the dist/ each one's package.json
// "main"/"exports" points at.
//
// WHY THIS EXISTS. These four packages used to be resolved via
// `"file:../reshape-cad/packages/<name>"` -- a path outside this repo, present
// only on a machine that also happened to have that sibling checkout built.
// Cloudflare's CI clones ONLY shCode, so that path never existed there; the
// build succeeded only when its dependency cache still held a node_modules
// copy from some earlier, luckier run. The moment that cache went cold,
// `next build` hard-failed on "Module not found: Can't resolve
// '@shuff57/reshape-studio/...'". Vendoring the source under vendor/ and
// committing the dist this script produces makes the package.json
// `"file:./vendor/reshape-cad/packages/<name>"` deps self-contained: `npm ci`
// on a bare clone of this repo alone can now satisfy them.
//
// WHY DIST IS COMMITTED (unlike public/reshape/kernel/, which build-brep-
// kernel.mjs deliberately does NOT commit). npm resolves a `file:` dependency
// by copying the referenced directory into node_modules at INSTALL time, not
// by symlinking it live -- confirmed by inspecting an existing install:
// node_modules/@shuff57/reshape-kernel is a real directory, not a symlink.
// That copy happens before this project's own build scripts ever run, so a
// prebuild step that rebuilt vendor/ dist would update the vendored SOURCE
// tree but never reach the node_modules copy npm already made. The only
// point at which rebuilt dist can reach a fresh `npm ci` is if it is already
// sitting in vendor/ at commit time -- hence committed, not generated.
//
// WORKFLOW: after editing anything under vendor/reshape-cad/packages/*/src,
// run this script, then reinstall (`npm install` / `bun install`) so your
// own node_modules picks up the refreshed copy, then commit the vendor/
// dist changes alongside your source edit.
//
//   node scripts/build-reshape-packages.mjs

import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const packagesRoot = path.join(root, 'vendor', 'reshape-cad', 'packages');
const tscBin = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc');

if (!existsSync(tscBin)) {
  console.error(`[build-reshape-packages] typescript not found at ${tscBin} -- run \`npm install\` first.`);
  process.exit(127);
}

// Dependency order matters: each later package imports the ones before it
// (script -> sketch, kernel -> script + sketch, studio -> all three), and tsc
// needs the earlier package's .d.ts already on disk to typecheck the next.
const ORDER = ['sketch', 'script', 'kernel', 'studio'];

for (const pkg of ORDER) {
  const pkgDir = path.join(packagesRoot, pkg);
  const tsconfig = path.join(pkgDir, 'tsconfig.json');
  if (!existsSync(tsconfig)) {
    console.error(`[build-reshape-packages] missing ${tsconfig}`);
    process.exit(1);
  }
  rmSync(path.join(pkgDir, 'dist'), { recursive: true, force: true });
  console.log(`[build-reshape-packages] building @shuff57/reshape-${pkg}...`);
  execFileSync(process.execPath, [tscBin, '-p', tsconfig], { cwd: root, stdio: 'inherit' });
}

console.log(`[build-reshape-packages] built ${ORDER.length} package(s).`);
