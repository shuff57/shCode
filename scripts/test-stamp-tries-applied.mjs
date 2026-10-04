// The deploy guard for the go-live instant (scripts/stamp-tries-applied.mjs), run in a
// throwaway git repo so it never touches lib/attempt-cap.ts.
//
// Run: node scripts/test-stamp-tries-applied.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'stamp-tries-'));
let failures = 0;
const ok = (m) => console.log(`PASS ${m}`);
const fail = (m) => { console.error(`FAIL: ${m}`); failures++; process.exitCode = 1; };
const eq = (got, want, label) => (JSON.stringify(got) === JSON.stringify(want) ? ok(label) : fail(`${label}\n  want ${JSON.stringify(want)}\n  got  ${JSON.stringify(got)}`));

mkdirSync(join(tmp, 'lib'));
mkdirSync(join(tmp, 'scripts'));
copyFileSync(join(root, 'lib/attempt-cap.ts'), join(tmp, 'lib/attempt-cap.ts'));
copyFileSync(join(root, 'scripts/stamp-tries-applied.mjs'), join(tmp, 'scripts/stamp-tries-applied.mjs'));
const git = (...a) => execFileSync('git', a, { cwd: tmp, stdio: 'pipe' });
git('init', '-q');
git('config', 'user.email', 't@example.invalid');
git('config', 'user.name', 't');
git('add', '-A');
git('commit', '-q', '-m', 'init');
const run = (flag) => spawnSync('node', [join(tmp, 'scripts/stamp-tries-applied.mjs'), flag], { cwd: tmp, encoding: 'utf8' }).status;
const cap = () => readFileSync(join(tmp, 'lib/attempt-cap.ts'), 'utf8');

eq(run('--check'), 1, 'unstamped (TRIES_GO_LIVE_STAMPED false): the deploy check refuses');
eq(run('--nonsense'), 1, 'no mode: refuses');
eq(run('--set-now'), 0, '--set-now stamps');
if (!/TRIES_GO_LIVE_STAMPED = true;/.test(cap())) fail('--set-now did not flip the flag'); else ok('--set-now flips the flag');
const stampedAt = Number(cap().match(/TRIES_APPLIED = (\d{13});/)[1]);
if (Math.abs(stampedAt - Date.now()) > 60_000) fail('--set-now did not write the current instant'); else ok('--set-now writes the current instant');
eq(run('--check'), 1, 'stamped but uncommitted: refuses (the deploy worktree is built from HEAD)');
git('add', '-A');
git('commit', '-q', '-m', 'stamp');
eq(run('--check'), 0, 'stamped and committed: the deploy check passes');
eq(run('--set-now'), 1, 'stamping twice is refused (moving the instant gives or takes tries)');

writeFileSync(join(tmp, 'lib/attempt-cap.ts'), cap().replace(/TRIES_APPLIED = \d{13};/, `TRIES_APPLIED = ${Date.now() + 86_400_000};`));
git('add', '-A'); git('commit', '-q', '-m', 'future');
eq(run('--check'), 1, 'a go-live instant in the future: refuses');
writeFileSync(join(tmp, 'lib/attempt-cap.ts'), cap().replace(/TRIES_APPLIED = \d{13};/, 'TRIES_APPLIED = 1600000000000;'));
git('add', '-A'); git('commit', '-q', '-m', 'past');
eq(run('--check'), 1, 'a go-live instant that predates the feature commit: refuses');
writeFileSync(join(tmp, 'lib/attempt-cap.ts'), cap().replace(/export const TRIES_APPLIED = \d{13};/, 'export const TRIES_APPLIED = Date.now();'));
eq(run('--check'), 1, 'TRIES_APPLIED no longer a fixed literal: refuses');

// the real file: the flag and literal exist, and the deploy script runs the guard
const real = readFileSync(join(root, 'lib/attempt-cap.ts'), 'utf8');
if (!/export const TRIES_GO_LIVE_STAMPED = (true|false);/.test(real)) fail('lib/attempt-cap.ts lost TRIES_GO_LIVE_STAMPED'); else ok('lib/attempt-cap.ts has the go-live flag');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts.deploy;
if (!/stamp-tries-applied\.mjs --check/.test(pkg)) fail('npm run deploy does not run the go-live stamp check'); else ok('npm run deploy runs the go-live stamp check');
if (!/check-pa-attempts\.mjs --require-pseudocode/.test(pkg)) fail('npm run deploy does not require the pseudocode'); else ok('npm run deploy requires the pseudocode');
if (!/check-pending-migrations\.mjs/.test(pkg)) fail('npm run deploy does not check pending migrations'); else ok('npm run deploy checks pending migrations');

rmSync(tmp, { recursive: true, force: true });
if (failures) { console.error(`\nstamp-tries-applied: ${failures} failure(s)`); process.exit(1); }
console.log('\nstamp-tries-applied: all cases passed');
