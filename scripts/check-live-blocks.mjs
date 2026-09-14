// Every runnable figure inside a reading is executed here, because until this
// existed, none of them had ever been executed by anything.
//
// `lessons/*/content.md` embeds ```js live plain fences -- console-track code
// that renders as an editor with a Run button (LiveCodeBlock's `plain` mode).
// There are 278 of them across 169 lessons. They render fine and they throw
// nothing, and no checker ever ran one: the repo's only other fence-runner,
// `test-moshion.mjs`, skips these on purpose because its subject is the
// moSHion canvas blocks. That left a hole a real lesson fell through --
// `2-1-32-example-or-trap` step 3 shipped with prose promising the block
// would print `true` while the block printed `Sunday`, because `||` outside
// an `if` returns its operand rather than a boolean. It looked right, it ran
// clean, and it was wrong, and no check in the suite could have caught it
// because no check ran it.
//
// This script runs every plain block the way the student's Output pane runs
// it (same console formatting rule, byte for byte), freezes what it prints in
// `.gauntlet/live-blocks.json`, and fails when a block's behaviour drifts from
// what was frozen -- so an author who breaks a figure sees the diff before a
// student sees a lie. A throw is recorded, never a failure by itself: teaching
// what an error looks like is a real lesson shape.
//
// Run:  node scripts/check-live-blocks.mjs            compare against the snapshot
//       node scripts/check-live-blocks.mjs --update   rewrite the snapshot
//       node scripts/check-live-blocks.mjs --report   print every block, for prose review
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import vm from 'node:vm';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const lessonsDir = path.join(root, 'lessons');
const snapshotPath = path.join(root, '.gauntlet', 'live-blocks.json');

// Same kill timer shape as the student-facing runner, scaled down for a
// checker: long enough that nothing a lesson means to finish gets cut,
// short enough that a runaway block costs two seconds, not thirty.
const RUN_TIMEOUT_MS = 2000;
// Ceiling on captured console calls, identical to lib/js-runner-source.ts's
// RUN_MAX_LOGS and word-for-word the same truncation line -- `while (true)
// console.log(i++)` must freeze the same way it does for a student, or the
// snapshot would drift with machine speed and the diff would mean nothing.
const MAX_LOGS = 1000;
const TRUNCATION = `… output stopped after ${MAX_LOGS} lines. If you did not mean to print this much, check your loop.`;

const read = (p) => readFileSync(p, 'utf8').replace(/\r\n?/g, '\n');

// The fence shape and filter are the exact inverse of test-moshion.mjs's
// liveBlocks(): same regex, but we KEEP what it skips. `plain` is the flag
// that means "no canvas, console only" -- the code a student sees in an
// Output pane, and the only kind this checker can run faithfully.
const rx = /^```js live([^\n]*)\n([\s\S]*?)^```/gm;

function discover() {
  const blocks = [];
  for (const id of readdirSync(lessonsDir).sort()) {
    const dir = path.join(lessonsDir, id);
    if (!statSync(dir).isDirectory()) continue;
    const p = path.join(dir, 'content.md');
    if (!existsSync(p)) continue;
    const md = read(p);
    rx.lastIndex = 0;
    let n = 0;
    let m;
    while ((m = rx.exec(md)) !== null) {
      const flags = (m[1] || '').trim();
      if (!/\bplain\b/.test(flags)) continue;
      // 1-based line where the fence opens -- for error messages only.
      const line = md.slice(0, m.index).split('\n').length;
      blocks.push({
        id: `${id}#${n}`,
        lesson: id,
        line,
        code: m[2].trim(),
      });
      n++;
    }
  }
  return blocks;
}

// A fresh context per block: nothing leaks between blocks, and nothing is
// reachable from a block but the console we hand it. No require, no process,
// no fs, no fetch -- a fence in a reading is a snippet, not a program.
function runBlock(code) {
  const output = [];
  let sent = 0;
  const ser = (a) => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a));
  const capture = (type) => (...args) => {
    if (sent >= MAX_LOGS) return;
    sent++;
    output.push({ type, text: sent === MAX_LOGS ? TRUNCATION : args.map(ser).join(' ') });
  };
  // A Worker has no window, so the student-facing runner injects a small
  // in-memory localStorage (see lib/js-runner-source.ts, added for module 3.8).
  // Mirror it here or every save-by-key figure throws ReferenceError and the
  // snapshot records a lie about what a student sees.
  const store = new Map();
  const localStorage = {
    setItem: (k, v) => { store.set(String(k), String(v)); },
    getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
    removeItem: (k) => { store.delete(String(k)); },
    clear: () => { store.clear(); },
  };
  const context = vm.createContext({ console: { log: capture('log'), warn: capture('warn'), error: capture('error') }, localStorage });
  const result = { output };
  try {
    vm.runInContext(code, context, { timeout: RUN_TIMEOUT_MS });
  } catch (e) {
    if (e && e.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT') {
      result.timeout = true;
    } else {
      // Same rule as LiveCodeBlock records a throw with. The thrown error
      // comes from the block's own realm, so `instanceof Error` here would
      // be false for every real throw -- ask that realm instead.
      const RealmError = vm.runInContext('Error', context);
      result.error = e instanceof RealmError ? e.message : String(e);
      // Output captured before the throw is kept: a block that prints three
      // lines and then dies prints three lines and an error for a student.
    }
  }
  return result;
}

// Key order normalised on both sides so a hand-reordered snapshot file does
// not read as a behaviour change.
function normalise(entry) {
  return {
    code: entry.code ?? '',
    output: Array.isArray(entry.output) ? entry.output : [],
    error: entry.error,
    timeout: !!entry.timeout,
  };
}

// A block flagged nondeterministic is compared on its SHAPE only: same code,
// still flagged, still throwing (or not), still finishing (or not). Its output
// text is deliberately not compared, because varying is what it is for.
function shapeOf(entry) {
  return JSON.stringify({
    code: entry.code ?? '',
    threw: entry.error !== undefined,
    timeout: !!entry.timeout,
  });
}

function sameEntry(a, b) {
  if (a?.nondeterministic || b?.nondeterministic) {
    return !!a?.nondeterministic === !!b?.nondeterministic && shapeOf(a) === shapeOf(b);
  }
  return JSON.stringify(normalise(a)) === JSON.stringify(normalise(b));
}

function readSnapshot() {
  if (!existsSync(snapshotPath)) return {};
  try {
    return JSON.parse(read(snapshotPath));
  } catch {
    console.error(`[check-live-blocks] ${path.relative(root, snapshotPath)} is not valid JSON — run with --update to rewrite it`);
    process.exit(1);
  }
}

function locationOf(blocks, id) {
  const b = blocks.find((x) => x.id === id);
  return b ? `lessons/${b.lesson}/content.md:${b.line}` : id;
}

function printEntry(label, entry) {
  const parts = [`code: ${JSON.stringify(entry.code ?? '')}`];
  if (entry.error !== undefined) parts.push(`error: ${JSON.stringify(entry.error)}`);
  if (entry.timeout) parts.push('timeout: true');
  if (entry.nondeterministic) parts.push('nondeterministic: true');
  parts.push(`output: ${JSON.stringify(entry.output ?? null)}`);
  console.log(`     ${label}`);
  for (const p of parts) console.log(`       ${p}`);
}

function main() {
  const mode = process.argv.slice(2);
  const unknown = mode.filter((f) => !['--update', '--report'].includes(f));
  if (unknown.length) {
    console.error(`[check-live-blocks] unknown flag(s): ${unknown.join(' ')}\n  usage: node scripts/check-live-blocks.mjs [--update|--report]`);
    process.exit(2);
  }

  const blocks = discover();
  if (mode.includes('--update')) {
    const old = readSnapshot();
    const next = {};
    const added = [];
    const changed = [];
    for (const b of blocks) {
      const entry = buildEntry(b);
      if (!(b.id in old)) added.push(b.id);
      else if (!sameEntry(old[b.id], entry)) changed.push(b.id);
      next[b.id] = entry;
    }
    const removed = Object.keys(old).filter((id) => !next[id]).sort();
    // Explicit sort so the snapshot file is in key order no matter how
    // discovery ordered the lessons -- a diff stays readable after a rename
    // reshuffles insertion order.
    const ordered = {};
    for (const id of Object.keys(next).sort()) ordered[id] = next[id];
    writeFileSync(snapshotPath, JSON.stringify(ordered, null, 2) + '\n');
    console.log(`[check-live-blocks] ${blocks.length} block(s) written to ${path.relative(root, snapshotPath)}`);
    console.log(`  added: ${added.length}${added.length ? ` (${added.join(', ')})` : ''}`);
    console.log(`  changed: ${changed.length}${changed.length ? ` (${changed.join(', ')})` : ''}`);
    console.log(`  removed: ${removed.length}${removed.length ? ` (${removed.join(', ')})` : ''}`);
    return;
  }

  if (mode.includes('--report')) {
    for (const b of blocks) {
      const entry = buildEntry(b);
      console.log(`== ${b.id}   lessons/${b.lesson}/content.md:${b.line}`);
      if (entry.nondeterministic) console.log('   [nondeterministic] output varies between runs; not frozen');
      if (entry.timeout) console.log('   [timeout] still running after 2s — stopped');
      if (entry.error !== undefined) console.log(`   [error] ${entry.error}`);
      if (!entry.output.length) console.log('   (no output)');
      for (const o of entry.output) console.log(`   [${o.type}] ${o.text}`);
    }
    console.log(`[check-live-blocks] ${blocks.length} block(s)`);
    return;
  }

  const snapshot = readSnapshot();
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const failures = [];

  for (const id of Object.keys(snapshot).sort()) {
    if (!byId.has(id)) {
      failures.push({ id, why: 'in the snapshot but no longer in the tree (renamed or removed?)' });
    }
  }
  for (const b of blocks) {
    if (!(b.id in snapshot)) {
      failures.push({ id: b.id, why: 'in the tree but missing from the snapshot (run with --update)' });
    }
  }
  for (const b of blocks) {
    const expected = snapshot[b.id];
    if (!expected) continue;
    const actual = buildEntry(b);
    if (!sameEntry(expected, actual)) {
      failures.push({ id: b.id, why: 'behaviour changed', expected, actual });
    }
  }

  if (failures.length) {
    for (const f of failures) {
      console.log(`FAIL ${f.id}`);
      console.log(`     ${locationOf(blocks, f.id)}`);
      console.log(`     ${f.why}`);
      if (f.expected !== undefined || f.actual !== undefined) {
        printEntry('expected:', f.expected);
        printEntry('  actual:', f.actual);
      }
    }
    console.error(`\n[check-live-blocks] ${failures.length} mismatch(es) across ${blocks.length} block(s)`);
    process.exit(1);
  }
  console.log(`${blocks.length} blocks, all match`);
}

// Named late so the body reads top-down; hoisting is a function-only perk.
//
// Run three times, not once. Some figures are RANDOM ON PURPOSE and their
// prose says so -- 2-4-3-example-predict-which-loop shuffles until an ace and
// tells the student "the number of shuffles changes every time". A block like
// that has no authored output to drift from, so freezing its text would make
// this checker fail on a lesson that is working exactly as written. When the
// three runs disagree the block is flagged instead, and comparison drops to
// the part that is still meaningful: did it throw, did it hang.
//
// Three runs is a heuristic, not a proof. A random block with few outcomes can
// repeat itself three times and be frozen as deterministic; it will surface
// later as a spurious FAIL, and the fix then is --update, not a code change.
function buildEntry(block) {
  const runs = [runBlock(block.code), runBlock(block.code), runBlock(block.code)];
  const r = runs[0];
  const key = (x) => JSON.stringify([x.output, x.error, !!x.timeout]);
  const entry = { code: block.code, output: r.output };
  if (r.error !== undefined) entry.error = r.error;
  if (r.timeout) entry.timeout = true;
  if (!runs.every((x) => key(x) === key(r))) entry.nondeterministic = true;
  return entry;
}

main();