// The go-live instant for the three-tries rule (lib/attempt-cap.ts TRIES_APPLIED) must be
// set ON PURPOSE, once, at go-live. Until it is, TRIES_APPLIED is the instant the mechanism
// was written, and shipping that gives every student tries counted from the wrong moment.
//
//   node scripts/stamp-tries-applied.mjs --check     deploy guard (npm run deploy runs it):
//                                                     exit 1 unless the stamp is set, sane and committed
//   node scripts/stamp-tries-applied.mjs --set-now   the human, once, at go-live: writes the
//                                                     current instant and flips the flag; commit it
//   node scripts/stamp-tries-applied.mjs --mark-shipped
//                                                     the human, once, after the first deploy that
//                                                     carried the stamp is live; commit it
//
// --check refuses when: TRIES_GO_LIVE_STAMPED is false; TRIES_APPLIED is in the future; it is
// earlier than the commit that introduced it (a stamp that predates the feature is a typo; skipped
// with a loud warning on a shallow clone, where that commit cannot be found); more
// than 24 hours old while TRIES_STAMP_SHIPPED is false (the first deploy slipped; --allow-old or
// TRIES_STAMP_ALLOW_OLD=1 overrides, loudly; once the stamp has shipped, no later deploy can slip); or
// lib/attempt-cap.ts differs from HEAD (a deploy worktree is built from HEAD, so an uncommitted
// stamp would not ship). Never move a stamped value EARLIER once students have used the
// deploy: that confiscates tries (see the comment in lib/attempt-cap.ts).

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'lib/attempt-cap.ts');
const rel = 'lib/attempt-cap.ts';
const src = readFileSync(file, 'utf8');
const m = src.match(/export const TRIES_APPLIED = (\d{13});/);
const f = src.match(/export const TRIES_GO_LIVE_STAMPED = (true|false);/);
const sh = src.match(/export const TRIES_STAMP_SHIPPED = (true|false);/);

function die(msg) { console.error(`[stamp-tries-applied] ${msg}`); process.exit(1); }
if (!m || !f || !sh) die('lib/attempt-cap.ts no longer has the fixed TRIES_APPLIED / TRIES_GO_LIVE_STAMPED / TRIES_STAMP_SHIPPED literals');

const mode = process.argv.includes('--set-now') ? 'set'
  : process.argv.includes('--mark-shipped') ? 'shipped'
  : process.argv.includes('--check') ? 'check' : null;
if (!mode) die('pass --check (deploy guard), --set-now (once, at go-live) or --mark-shipped (once, after that deploy is live)');

if (mode === 'shipped') {
  if (f[1] !== 'true') die('not stamped yet: run --set-now at go-live and deploy it first.');
  if (sh[1] === 'true') { console.log('[stamp-tries-applied] already marked shipped.'); process.exit(0); }
  writeFileSync(file, src.replace(/export const TRIES_STAMP_SHIPPED = false;/, 'export const TRIES_STAMP_SHIPPED = true;'));
  console.log('[stamp-tries-applied] TRIES_STAMP_SHIPPED = true. Commit lib/attempt-cap.ts; later deploys no longer need --allow-old.');
  process.exit(0);
}

if (mode === 'set') {
  if (f[1] === 'true') die('already stamped: refusing to move the go-live instant (that confiscates or hands out tries). Edit the file by hand only with a decision recorded in lib/attempt-cap.ts.');
  const now = Date.now();
  writeFileSync(file, src
    .replace(/export const TRIES_APPLIED = \d{13};/, `export const TRIES_APPLIED = ${now};`)
    .replace(/export const TRIES_GO_LIVE_STAMPED = false;/, 'export const TRIES_GO_LIVE_STAMPED = true;')
    // A new stamp has not shipped yet: the 24-hour rule protects its first deploy again.
    .replace(/export const TRIES_STAMP_SHIPPED = true;/, 'export const TRIES_STAMP_SHIPPED = false;'));
  console.log(`[stamp-tries-applied] TRIES_APPLIED = ${now} (${new Date(now).toISOString()}), stamped. Commit lib/attempt-cap.ts, then deploy; once that deploy is live, run --mark-shipped and commit.`);
  process.exit(0);
}

const applied = Number(m[1]);
if (f[1] !== 'true') die('TRIES_GO_LIVE_STAMPED is false: TRIES_APPLIED is still the development placeholder. At go-live run `node scripts/stamp-tries-applied.mjs --set-now`, commit, then deploy.');
if (applied > Date.now()) die(`TRIES_APPLIED (${new Date(applied).toISOString()}) is in the future: every attempt until then would be free.`);
// A stamp that is days old means the deploy slipped: every attempt between the stamp and the deploy
// counts against the cap although the rule was not live yet. Re-stamp at the real go-live, or pass
// --allow-old to say you know (the students' tries in that gap are the cost).
const STALE_MS = 24 * 3600 * 1000;
if (Date.now() - applied > STALE_MS && sh[1] !== 'true') {
  // `npm run deploy` cannot pass a flag to this step, so the same knowing override is also an env var:
  //   TRIES_STAMP_ALLOW_OLD=1 npm run deploy
  // For every deploy AFTER the first one that shipped the stamp: the rule has been live since the stamp, so no tries are lost.
  if (!process.argv.includes('--allow-old') && process.env.TRIES_STAMP_ALLOW_OLD !== '1') {
    die(`TRIES_APPLIED (${new Date(applied).toISOString()}) is more than 24 hours old and TRIES_STAMP_SHIPPED is false. If a deploy has ALREADY shipped this stamp, run \`node scripts/stamp-tries-applied.mjs --mark-shipped\` and commit: later deploys cannot slip. If not, the first deploy slipped, and attempts made between the stamp and the deploy would count against the cap before the rule was live: un-stamp it (TRIES_GO_LIVE_STAMPED false and the literal back to the placeholder, in a commit) and run --set-now again at the real go-live, or pass --allow-old (TRIES_STAMP_ALLOW_OLD=1 for npm run deploy) to deploy anyway.`);
  }
  console.error(`[stamp-tries-applied] WARNING: --allow-old / TRIES_STAMP_ALLOW_OLD. The stamp is ${Math.round((Date.now() - applied) / 3600000)} hours old; every attempt since ${new Date(applied).toISOString()} counts against the cap.`);
}
try {
  // On a SHALLOW clone `git log -S` can only see the shallow root commit, whose date is the clone's,
  // not the feature's: a correct stamp made a minute after --set-now looked earlier than "the
  // commit that introduced it" and the deploy refused (round 6). Say so loudly and skip that one
  // comparison; every other check (set, not in the future, not stale, committed) still runs.
  const shallow = execFileSync('git', ['rev-parse', '--is-shallow-repository'], { cwd: root, encoding: 'utf8' }).trim() === 'true';
  if (shallow) {
    console.error('[stamp-tries-applied] WARNING: this is a shallow clone, so the "earlier than the commit that introduced it" check is SKIPPED (git history is cut off). Run `git fetch --unshallow` to restore it.');
  }
  // %at (author date), not %ct: a rebase or cherry-pick rewrites the committer date to "now", which made a
  // correct stamp look earlier than the feature after the branch was rebased onto GitHub (2026-10-04).
  const first = shallow ? '' : execFileSync('git', ['log', '-S', 'TRIES_APPLIED', '--format=%at', '--reverse', '--', rel], { cwd: root, encoding: 'utf8' }).trim().split('\n')[0];
  if (first && applied < Number(first) * 1000 - 60_000) die(`TRIES_APPLIED (${new Date(applied).toISOString()}) is earlier than the commit that introduced it: a stamp that predates the feature is a typo.`);
  const dirty = execFileSync('git', ['status', '--porcelain', '--', rel], { cwd: root, encoding: 'utf8' }).trim();
  if (dirty) die('lib/attempt-cap.ts has uncommitted changes: the deploy worktree is built from HEAD, so the stamp would not ship. Commit it first.');
} catch (e) {
  if (e && e.status === undefined && /git/.test(String(e.message))) die(`could not read git history: ${e.message}`);
  throw e;
}
console.log(`[stamp-tries-applied] ok: go-live ${new Date(applied).toISOString()}, stamped and committed`);
