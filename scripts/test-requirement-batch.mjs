#!/usr/bin/env node
// Guards lib/requirement-batch.ts: coalescing, flush timing with an injected clock, nothing sent when
// empty, no re-sending a requirement already reported green, a throwing sender never escapes.
// Run: node scripts/test-requirement-batch.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = mkdtempSync(join(tmpdir(), 'shcode-req-batch-'));
execFileSync('node', [join(root, 'node_modules/typescript/bin/tsc'), join(root, 'lib/requirement-batch.ts'),
  '--outDir', out, '--module', 'commonjs', '--target', 'es2022', '--skipLibCheck'], { cwd: root, stdio: 'inherit' });
writeFileSync(join(out, 'package.json'), '{"type":"commonjs"}');
const { RequirementBatcher, FLUSH_INTERVAL_MS, MAX_FAILS_PER_RESULT } = createRequire(import.meta.url)(join(out, 'requirement-batch.js'));

let n = 0;
function check(name, got, want) {
  if (JSON.stringify(got) === JSON.stringify(want)) { n++; console.log(`PASS  ${n}  ${name}`); }
  else { console.error(`FAIL: ${name} -- got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); process.exitCode = 1; }
}
function make(opts = {}) {
  const sent = [];
  const clock = { t: 1_000_000 };
  const b = new RequirementBatcher({ lessonId: 'L', now: () => clock.t, send: (p) => { sent.push(p); }, ...opts });
  return { b, sent, clock };
}
const sorted = (p) => [...p.results].sort((x, y) => x.reqId.localeCompare(y.reqId));

check('interval is 20 s', FLUSH_INTERVAL_MS, 20000);

{ // empty
  const { b, sent } = make();
  check('flush with nothing pending sends nothing', [b.flush(true), b.flush(false), sent.length], [false, false, 0]);
  b.record([]);
  check('an empty run sends nothing', sent.length, 0);
}
{ // first record flushes at once, later ones coalesce until the interval passes
  const { b, sent, clock } = make();
  b.record([{ reqId: 'a', passed: false }, { reqId: 'b', passed: true }]);
  check('first run goes out', [sent.length, sorted(sent[0])], [1, [{ reqId: 'a', fails: 1, passed: false }, { reqId: 'b', fails: 0, passed: true }]]);
  clock.t += 5000;
  b.record([{ reqId: 'a', passed: false }, { reqId: 'b', passed: true }]);
  clock.t += 5000;
  b.record([{ reqId: 'a', passed: false }]);
  check('inside the interval nothing more is sent', sent.length, 1);
  check('and a is pending with 2 fails (b already reported green)', b.pending, 1);
  clock.t += 10_000; // 20 s since the first flush
  b.record([{ reqId: 'a', passed: false }, { reqId: 'c', passed: false }]);
  check('after 20 s the coalesced counts go out together', [sent.length, sorted(sent[1])], [2, [{ reqId: 'a', fails: 3, passed: false }, { reqId: 'c', fails: 1, passed: false }]]);
  check('counters reset after a send', b.pending, 0);
}
{ // exactly at the boundary, and just under it
  const { b, sent, clock } = make();
  b.record([{ reqId: 'a', passed: false }]);
  clock.t += FLUSH_INTERVAL_MS - 1;
  b.record([{ reqId: 'a', passed: false }]);
  check('19.999 s is too soon', sent.length, 1);
  clock.t += 1;
  b.record([]);
  check('20.000 s flushes', sent.length, 2);
}
{ // forced flush (page hide, unmount) ignores the interval; a second forced flush is empty
  const { b, sent } = make();
  b.record([{ reqId: 'a', passed: false }]);
  b.record([{ reqId: 'a', passed: false }]);
  check('forced flush sends the pending count', [b.flush(true), sent.length, sent[1].results], [true, 2, [{ reqId: 'a', fails: 1, passed: false }]]);
  check('flushing again sends nothing', [b.flush(true), sent.length], [false, 2]);
}
{ // fail then pass in one window; later fail after green is reported again
  const { b, sent } = make();
  b.record([{ reqId: 'a', passed: false }]);
  b.record([{ reqId: 'a', passed: false }]);
  b.record([{ reqId: 'a', passed: true }]);
  b.flush(true);
  check('failed then passed reports both', sent[1].results, [{ reqId: 'a', fails: 1, passed: true }]);
  b.record([{ reqId: 'a', passed: true }]);
  check('green again with no new fails is not re-sent', b.flush(true), false);
  b.record([{ reqId: 'a', passed: false }]);
  b.flush(true);
  check('a regression after green is reported', sent[2].results, [{ reqId: 'a', fails: 1, passed: false }]);
}
{ // clamp and cap
  const { b, sent } = make();
  for (let i = 0; i < 80; i++) b.record([{ reqId: 'a', passed: false }]);
  b.flush(true);
  check('fails per result never exceed what the server accepts', Math.max(...sent.flatMap((p) => p.results.map((r) => r.fails))) <= MAX_FAILS_PER_RESULT, true);
  const big = make();
  big.b.record(Array.from({ length: 100 }, (_, i) => ({ reqId: `r${i}`, passed: false })));
  check('one send holds at most 60 results', big.sent[0].results.length, 60);
  big.b.flush(true);
  check('the rest follows on the next flush', big.sent[1].results.length, 40);
}
{ // a broken sender never reaches the caller
  const t = { t: 0 };
  const thrower = new RequirementBatcher({ lessonId: 'L', now: () => t.t, send: () => { throw new Error('offline'); } });
  let threw = false;
  try { thrower.record([{ reqId: 'a', passed: false }]); } catch { threw = true; }
  check('a throwing sender is swallowed', threw, false);
  const rejecter = new RequirementBatcher({ lessonId: 'L', now: () => t.t, send: () => Promise.reject(new Error('offline')) });
  rejecter.record([{ reqId: 'a', passed: false }]);
  await new Promise((r) => setTimeout(r, 5));
  check('a rejecting sender is swallowed', true, true);
}
console.log(`test-requirement-batch: ${n} checks`);
rmSync(out, { recursive: true, force: true });
