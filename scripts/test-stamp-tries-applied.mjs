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
// The feature commit is ten days old, so a two-day-old stamp below is "stale" and not "predates the
// feature" (two different refusals).
execFileSync('git', ['commit', '-q', '-m', 'init'], {
  cwd: tmp,
  stdio: 'pipe',
  env: { ...process.env, GIT_COMMITTER_DATE: new Date(Date.now() - 10 * 86_400_000).toISOString(), GIT_AUTHOR_DATE: new Date(Date.now() - 10 * 86_400_000).toISOString() },
});
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

// A stamp more than 24 hours old (the deploy slipped): refuses, unless --allow-old.
writeFileSync(join(tmp, 'lib/attempt-cap.ts'), cap().replace(/TRIES_APPLIED = \d{13};/, `TRIES_APPLIED = ${Date.now() - 2 * 86_400_000};`));
git('add', '-A'); git('commit', '-q', '-m', 'stale');
eq(run('--check'), 1, 'a stamp two days old: refuses (the deploy slipped; attempts in the gap would count)');
{
  const r = spawnSync('node', [join(tmp, 'scripts/stamp-tries-applied.mjs'), '--check', '--allow-old'], { cwd: tmp, encoding: 'utf8' });
  eq(r.status, 0, 'a stamp two days old with --allow-old: passes');
  if (!/WARNING: --allow-old/.test(r.stderr)) fail('--allow-old did not warn loudly'); else ok('--allow-old warns loudly on stderr');
}
// back to a fresh stamp for the cases below
writeFileSync(join(tmp, 'lib/attempt-cap.ts'), cap().replace(/TRIES_APPLIED = \d{13};/, `TRIES_APPLIED = ${Date.now()};`));
git('add', '-A'); git('commit', '-q', '-m', 'fresh');
eq(run('--check'), 0, 'a fresh stamp passes again');

// Round 6: a SHALLOW clone (CI, a worktree made from a depth-1 clone) cannot see the commit that
// introduced TRIES_APPLIED; `git log -S` finds only the shallow root, dated when the clone was
// taken. A correct stamp made a few minutes before its commit then looked "earlier than the commit
// that introduced it" and the deploy refused. It must skip that one comparison, loudly, and still
// run every other check.
{
  writeFileSync(join(tmp, 'lib/attempt-cap.ts'), cap().replace(/TRIES_APPLIED = \d{13};/, `TRIES_APPLIED = ${Date.now() - 2 * 3_600_000};`));
  git('add', '-A'); git('commit', '-q', '-m', 'stamp made two hours before its commit');
  eq(run('--check'), 0, 'full history: a stamp two hours before its commit passes (it is after the feature commit ten days ago)');
  const shallow = mkdtempSync(join(tmpdir(), 'stamp-tries-shallow-'));
  execFileSync('git', ['clone', '-q', '--depth', '1', `file://${tmp}`, join(shallow, 'c')], { stdio: 'pipe' });
  const rs = (flag) => spawnSync('node', [join(shallow, 'c/scripts/stamp-tries-applied.mjs'), flag], { cwd: join(shallow, 'c'), encoding: 'utf8' });
  const sh = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: join(shallow, 'c'), encoding: 'utf8' }).trim();
  eq(sh, 'true', 'the clone really is shallow');
  const r = rs('--check');
  eq(r.status, 0, 'shallow clone: the same correct stamp passes (the introduced-by comparison is skipped, not failed)');
  if (!/shallow clone/.test(r.stderr) || !/unshallow/.test(r.stderr)) fail('the shallow skip did not warn loudly and say how to unshallow'); else ok('...with a loud warning that says how to unshallow');
  // every OTHER check still runs on the shallow clone: a future stamp is refused, an uncommitted edit is refused
  writeFileSync(join(shallow, 'c/lib/attempt-cap.ts'), readFileSync(join(shallow, 'c/lib/attempt-cap.ts'), 'utf8').replace(/TRIES_APPLIED = \d{13};/, `TRIES_APPLIED = ${Date.now() + 86_400_000};`));
  eq(rs('--check').status, 1, 'shallow clone: a stamp in the future is still refused');
  rmSync(shallow, { recursive: true, force: true });
  // back to a fresh committed stamp for the cases below
  writeFileSync(join(tmp, 'lib/attempt-cap.ts'), cap().replace(/TRIES_APPLIED = \d{13};/, `TRIES_APPLIED = ${Date.now()};`));
  git('add', '-A'); git('commit', '-q', '-m', 'fresh again');
}

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
