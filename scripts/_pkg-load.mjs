// Shared loader for the reSHape modules that moved to the reshape-cad
// workspace (packages/kernel, packages/script, packages/sketch) as part of
// the B1 extraction (plan: freecad-browser.md). shCode's app code consumes
// them as real npm packages (see package.json's "@shuff57/reshape-*" file:
// deps); the handful of test scripts under scripts/ that used to
// tsc-compile a hand-picked list of lib/*.ts files into a temp dir and
// require() the flat output cannot do that any more, because the files now
// live in a different repo, split across three package directories.
//
// This does the same job -- compile several interdependent .ts sources
// together (so their existing sibling-style './topo-history.js' imports
// keep resolving) and hand back each compiled module -- across that split.
//
// TWO MODES, chosen automatically from which modules you ask for:
//
//  SAME-PACKAGE (e.g. ['model-check', 'model-types', 'topo-name'] -- all
//  live under packages/script/src): compiled exactly like the original
//  scripts did -- `--module commonjs`, default resolution, rootDir is that
//  one package's src/ so the output is FLAT (out/model-check.js, ...). This
//  is deliberate: several scripts (test-model-check.mjs and friends) hand
//  `out` straight to an existing scripts/*-assertions.cjs helper that does
//  its own synchronous `require(path.join(dir, 'model-check.js'))`, and
//  changing that helper's contract is unnecessary extra churn when the flat
//  layout already satisfies it unmodified.
//
//  CROSS-PACKAGE (e.g. occt-build.ts pulling in packages/script's
//  topo-name.ts): the compiled files cross a real '@shuff57/reshape-*'
//  package boundary, resolved through each package's package.json "exports"
//  map. `--moduleResolution bundler` understands that map but TypeScript
//  refuses to pair it with `--module commonjs`; `nodenext` is the pairing
//  that does, and matches how these packages are really consumed elsewhere
//  (Next.js's resolver, plain `node`). Output is ESM, loaded with a
//  dynamic import, rooted at GITHUB_ROOT (the parent of shCode and
//  reshape-cad) so tsc mirrors each file's true path under `outDir` instead
//  of flattening -- verified empirically before this was written, alongside
//  the ESM/exports-map requirement itself (see the B1 report).
//
// Usage:
//   import { loadModules } from './_pkg-load.mjs';
//   // same-package: synchronous, like the old require() calls
//   const { load, out } = loadModules(['model-check', 'model-types', 'topo-name']);
//   const { checkModel } = load('model-check');
//   // (or hand `out` to an existing *-assertions.cjs helper, unchanged)
//
//   // cross-package: await loadModulesAsync, then await load(name)
//   const { load } = await loadModulesAsync(['occt-build', 'topo-name', ...]);
//   const adapter = await load('occt-build');

import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const SHCODE_ROOT = path.resolve(here, '..');
export const GITHUB_ROOT = path.resolve(SHCODE_ROOT, '..');
export const RESHAPE_CAD_ROOT = path.join(GITHUB_ROOT, 'reshape-cad');

// name -> [package, path relative to that package's src/]. Kept in one
// place so every script names modules the same way regardless of which
// package now holds them.
const LOCATIONS = {
  'occt-build': ['kernel', 'occt-build.ts'],
  'occt-api': ['kernel', 'occt-api.ts'],
  'occt-mesh': ['kernel', 'occt-mesh.ts'],
  'occt-three': ['kernel', 'occt-three.ts'],
  'topo-resolve': ['kernel', 'topo-resolve.ts'],
  'model-types': ['script', 'model-types.ts'],
  'model-codegen': ['script', 'model-codegen.ts'],
  'model-deps': ['script', 'model-deps.ts'],
  'model-handles': ['script', 'model-handles.ts'],
  'model-selection': ['script', 'model-selection.ts'],
  'model-check': ['script', 'model-check.ts'],
  'reshape-script': ['script', 'reshape-script.ts'],
  'reshape-script-gen': ['script', 'reshape-script-gen.ts'],
  'reshape-docs': ['script', 'reshape-docs.ts'],
  'docs-core': ['script', 'docs-core.ts'],
  'topo-history': ['script', 'topo-history.ts'],
  'topo-name': ['script', 'topo-name.ts'],
  'hull': ['script', 'hull.ts'],
  'script-surface': ['script', 'script-surface.ts'],
  'sketch-solve': ['sketch', 'sketch-solve.ts'],
  'sketch-arc': ['sketch', 'sketch-arc.ts'],
  'sketch-outline': ['sketch', 'sketch-outline.ts'],
  'least-squares': ['sketch', 'least-squares.ts'],
  'format-number': ['studio', 'format-number.ts'],
  'camera-fit': ['studio', 'camera-fit.ts'],
  'mesh-export': ['studio', 'mesh-export.ts'],
};

function pkgSrcDir(pkg) {
  return path.join(RESHAPE_CAD_ROOT, 'packages', pkg, 'src');
}

export function srcPath(name) {
  const loc = LOCATIONS[name];
  if (!loc) throw new Error(`_pkg-load: unknown module "${name}" (add it to LOCATIONS)`);
  return path.join(pkgSrcDir(loc[0]), loc[1]);
}

function cacheRoot() {
  const dir = path.join(SHCODE_ROOT, 'node_modules', '.pkg-load-cache');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** SAME-PACKAGE mode: all `names` must live in one package. Compiles with
 *  plain `--module commonjs` (default/classic resolution -- no "exports"
 *  map involved, since nothing here crosses a package boundary) into a
 *  FLAT temp dir, and returns `{ out, load }` where `load(name)` is a
 *  synchronous require(), same as the scripts this replaces. `out` is also
 *  handed back directly for the handful of scripts that pass it to an
 *  existing scripts/*-assertions.cjs helper. */
export function loadModules(names, { tscPath, extraArgs = [], out: providedOut } = {}) {
  const pkgs = new Set(names.map((n) => {
    if (!LOCATIONS[n]) throw new Error(`_pkg-load: unknown module "${n}" (add it to LOCATIONS)`);
    return LOCATIONS[n][0];
  }));
  if (pkgs.size !== 1) {
    throw new Error(
      `_pkg-load.loadModules: ${[...names]} span multiple packages (${[...pkgs]}) -- `
      + 'use loadModulesAsync for a cross-package set.',
    );
  }
  const tsc = tscPath || path.join(SHCODE_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  const rootDir = pkgSrcDir([...pkgs][0]);
  const files = names.map(srcPath);
  const out = providedOut || mkdtempSync(path.join(cacheRoot(), 'run-'));
  execFileSync(process.execPath, [
    tsc, ...files,
    '--outDir', out, '--rootDir', rootDir,
    '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck',
    ...extraArgs,
  ], { cwd: SHCODE_ROOT, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"commonjs"}');
  const req = createRequire(import.meta.url);
  const load = (name) => {
    const rel = LOCATIONS[name][1].replace(/\.ts$/, '.js');
    return req(path.join(out, rel));
  };
  return { out, load };
}

/** CROSS-PACKAGE mode: `names` may span kernel/script/sketch. Compiles with
 *  `--module nodenext --moduleResolution nodenext` (understands each
 *  package's "exports" map) rooted at GITHUB_ROOT, and returns `{ out,
 *  load }` where `load(name)` is an async dynamic import. Output lands
 *  under shCode's own node_modules/.pkg-load-cache (NOT os.tmpdir()): the
 *  compiled files import bare '@shuff57/reshape-*' specifiers, and Node's
 *  ESM resolver finds those only by walking UP from where the importing
 *  file actually lives looking for node_modules -- a location under
 *  shCode's own tree walks straight into shCode's real node_modules (where
 *  the file: deps are linked); the OS temp dir has no such ancestry and
 *  ERR_MODULE_NOT_FOUNDs on the first cross-package import. */
export async function loadModulesAsync(names, { tscPath, extraArgs = [], out: providedOut } = {}) {
  const tsc = tscPath || path.join(SHCODE_ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  const files = names.map(srcPath);
  const out = providedOut || mkdtempSync(path.join(cacheRoot(), 'run-'));
  execFileSync(process.execPath, [
    tsc, ...files,
    '--outDir', out, '--rootDir', GITHUB_ROOT,
    '--module', 'nodenext', '--moduleResolution', 'nodenext',
    '--target', 'es2022', '--skipLibCheck',
    ...extraArgs,
  ], { cwd: SHCODE_ROOT, stdio: 'inherit' });
  writeFileSync(path.join(out, 'package.json'), '{"type":"module"}');
  const cache = new Map();
  const load = async (name) => {
    if (cache.has(name)) return cache.get(name);
    const loc = LOCATIONS[name];
    const rel = path.join(
      path.relative(GITHUB_ROOT, pkgSrcDir(loc[0])),
      loc[1].replace(/\.ts$/, '.js'),
    );
    const mod = await import(pathToFileURL(path.join(out, rel)).href);
    cache.set(name, mod);
    return mod;
  };
  return { out, load };
}
