// Keep the vendored moSHion engine current with upstream (shuff57/moshion, `main`).
//
//   npm run sync:moshion          copy engine + typings from upstream main, reapply
//                                 shCode's one local line, regenerate the editor
//                                 autocomplete, run the moshion gates, stamp VENDORED.md
//   npm run sync:moshion -- --check   only report drift (exit 0 always; used by deploy as a warning)
//
// Not a runtime "@latest": students never load an untested engine. This is the
// one command that brings a tested copy in. Upstream checkout: ../moshion, or
// MOSHION_DIR. It reads origin/main from git, never the working tree, so another
// session's uncommitted work there cannot leak in.
//
// What it copies: moshion.js (with the /moshion/textures/ base line),
// docs/moshion.d.ts, planck.min.js. Textures, fonts, sounds, runner.html and
// extras.js are shCode's own or synced by their generators (see VENDORED.md).
// After a sync, read the d.ts diff it prints: lib/moshion-docs.ts (the in-app
// docs) is written by hand and needs a sentence for a new feature; the
// check-moshion-docs-coverage step FAILS the sync until it has one.

import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const upstream = resolve(process.env.MOSHION_DIR || join(root, '..', 'moshion'));
const checkOnly = process.argv.includes('--check');
const vendored = join(root, 'public/moshion');
const NODE = ['--import', './scripts/register-ts.mjs'];

// The single line shCode changes in moshion.js: the empty-catalog fallback.
const UP_LINE = "return { base: 'textures/', textures: {} };";
const OUR_LINE = "return { base: '/moshion/textures/', textures: {} };";

const FILES = [
  { from: 'moshion.js', to: 'moshion.js', patch: true },
  { from: 'docs/moshion.d.ts', to: 'docs/moshion.d.ts' },
  { from: 'planck.min.js', to: 'planck.min.js' },
];

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
}
const git = (...a) => run('git', ['-C', upstream, ...a]);

function skip(msg) {
  console.log(`[sync-moshion] ${msg}`);
  process.exit(0); // never block a deploy because the check could not run
}

if (!existsSync(join(upstream, '.git'))) skip(`no moshion checkout at ${upstream}; set MOSHION_DIR to check drift`);
const f = git('fetch', '-q', 'origin');
if (f.status !== 0) {
  if (checkOnly) skip('could not reach origin (offline?); drift not checked');
  console.error('git fetch failed:\n' + (f.stderr || ''));
  process.exit(1);
}
const head = git('rev-parse', '--short', 'origin/main').stdout.trim();

function upstreamText(file, patch) {
  const r = git('show', `origin/main:${file}`);
  if (r.status !== 0) throw new Error(`origin/main has no ${file}`);
  let t = r.stdout;
  if (patch) {
    if (!t.includes(UP_LINE)) throw new Error(`moshion.js no longer contains the textures base line; update UP_LINE in ${fileURLToPath(import.meta.url)}`);
    t = t.replace(UP_LINE, OUR_LINE);
  }
  return t;
}

const drifted = [];
for (const file of FILES) {
  const want = upstreamText(file.from, file.patch);
  const have = existsSync(join(vendored, file.to)) ? readFileSync(join(vendored, file.to), 'utf8') : '';
  if (want !== have) drifted.push({ ...file, want });
}

const doc = readFileSync(join(vendored, 'VENDORED.md'), 'utf8');
const pinned = (doc.match(/\| Commit \| `([0-9a-f]{7,})`/) || [])[1];

if (checkOnly) {
  if (!drifted.length) {
    console.log(`[sync-moshion] in sync with upstream main (${head}).`);
  } else {
    const behind = pinned ? git('rev-list', '--count', `${pinned}..origin/main`).stdout.trim() : '?';
    console.log(`[sync-moshion] WARNING: the vendored engine differs from upstream main (${head}; pinned ${pinned || 'unknown'}, ${behind} commit(s) ahead).`);
    console.log(`[sync-moshion] differs: ${drifted.map((d) => d.to).join(', ')}. Bring it in with: npm run sync:moshion`);
    console.log('[sync-moshion] (a difference with nothing newer upstream means shCode has an unpushed local edit)');
  }
  process.exit(0);
}

if (!drifted.length) {
  console.log(`[sync-moshion] already identical to upstream main (${head}); nothing to copy.`);
  process.exit(0);
}

const dtsBefore = existsSync(join(vendored, 'docs/moshion.d.ts')) ? readFileSync(join(vendored, 'docs/moshion.d.ts'), 'utf8') : '';
for (const d of drifted) {
  writeFileSync(join(vendored, d.to), d.want);
  console.log(`[sync-moshion] updated public/moshion/${d.to}`);
}

// Stamp the pin so the next --check measures from here.
const date = git('log', '-1', '--format=%cs', 'origin/main').stdout.trim();
const full = git('rev-parse', '--short', 'origin/main').stdout.trim();
let stamped = doc.replace(/\| Commit \| `[0-9a-f]{7,}`/, `| Commit | \`${full}\``).replace(/\| Commit date \| [0-9-]+ \|/, `| Commit date | ${date} |`);
if (stamped === doc && pinned !== full) console.log('[sync-moshion] could not find the Commit row in VENDORED.md; update it by hand.');
writeFileSync(join(vendored, 'VENDORED.md'), stamped);

const steps = [
  ['generate-moshion-completions.mjs'],
  ['check-moshion-textures.mjs'],
  ['test-moshion.mjs'],
  ['test-moshion-extras.mjs'],
  ['test-editor-completions.mjs'],
  ['check-docs-prose.mjs'],
  ['check-moshion-docs-coverage.mjs'],
];
let failed = false;
for (const [s] of steps) {
  const r = run(process.execPath, [...NODE, join('scripts', s)], { cwd: root });
  const ok = r.status === 0;
  console.log(`[sync-moshion] ${ok ? 'ok  ' : 'FAIL'} ${s}`);
  if (!ok) { failed = true; console.log(((r.stdout || '') + (r.stderr || '')).split('\n').slice(-12).join('\n')); }
}

const dtsAfter = readFileSync(join(vendored, 'docs/moshion.d.ts'), 'utf8');
if (dtsAfter !== dtsBefore) {
  const d = run('git', ['diff', '--stat', '--', 'public/moshion/docs/moshion.d.ts'], { cwd: root }).stdout.trim();
  console.log(`\n[sync-moshion] the API typings changed (${d.split('\n').pop().trim()}). Read it and add a sentence to lib/moshion-docs.ts for anything new:`);
  console.log('  git diff public/moshion/docs/moshion.d.ts');
}
console.log(failed
  ? '\n[sync-moshion] a gate FAILED. Do not deploy; fix, or revert with: git checkout public/moshion lib'
  : `\n[sync-moshion] synced to upstream ${full}. Review, commit, then deploy.`);
process.exit(failed ? 1 : 0);
