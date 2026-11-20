// shCode's speed changes to the vendored host page (vendor/solidcraft-preview): the progress line drawn at most every
// 80 ms, but always before a real engine run; and the reply memory saying, without asking, whether it would answer a call.
// reshape-cad's own tests of these modules are in packages/solidcraft-host/test; this file pins only what shCode changed.
import assert from 'node:assert/strict';
import { createProgress, LINES } from '../vendor/solidcraft-preview/src/progress.mjs';
import { createReplyMemory } from '../vendor/solidcraft-preview/src/reply-memory.mjs';

const steps = (ids) => ids.map((id, index) => ({ id, kind: 'x', index, count: ids.length }));
{ // every step's line is written; the page is given a moment to draw only every 80 ms
  const said = []; let yields = 0; let t = 0;
  const p = createProgress({ say: (s) => said.push(s), yieldToPage: async () => { yields++; }, now: () => t });
  for (const s of steps(['box1', 'hole1', 'hole2', 'shell1'])) { await p.onStep(s); t += 30; }
  assert.deepEqual(said, ['box1', 'hole1', 'hole2', 'shell1'].map((id, i) => LINES.building(i + 1, 4, id)), 'the owner\'s words, one line per step');
  assert.equal(yields, 2, 'at 0 ms and at 90 ms, not four times');
  // before a real engine run the line written last is drawn, even inside the interval; before an answer from memory it is not
  await p.onStep({ id: 'x', kind: 'x', index: 1, count: 4 });
  await p.beforeEngine(false); assert.equal(yields, 2, 'an answer from memory does not wait for a paint');
  await p.beforeEngine(true); assert.equal(yields, 3, 'a real engine run does');
  await p.beforeEngine(true); assert.equal(yields, 3, 'once: nothing new to draw');
}
{ // slow: said once, drawn at once
  const said = []; let yields = 0; let t = 0;
  const p = createProgress({ say: (s) => said.push(s), yieldToPage: async () => { yields++; }, now: () => t });
  await p.onStep({ id: 'hole1', kind: 'x', index: 0, count: 1 }); t = 11000;
  await p.beforeEngine(false); assert.equal(said.at(-1), LINES.building(1, 1, 'hole1') + LINES.slow); assert.equal(yields, 2);
}
console.log('PASS progress: every line written, drawn at most every 80 ms and always before a real engine run');
{
  const replies = { execute: async (cmds) => ({ ok: true, measure: { bodies: [{ name: 'b', volume_mm3: cmds.length, faces: 6 }] }, cpuMs: 5 }), topologyOf: async () => ({ ok: true, topology: { bodies: [] } }), inspect: async () => ({}) };
  const m = createReplyMemory(replies);
  const a = [{ command: 'solid.box', params: {} }];
  assert.equal(m.answers(a, { fresh: true }), false);
  await m.execute(a, { fresh: true });
  assert.equal(m.answers(a, { fresh: true }), true, 'a list it has the reply of');
  assert.equal(m.answers(a, { fresh: true, replay: true }), false, 'never the replay that puts SolidCraft on the list');
  assert.equal(m.answers(a, { fresh: true, budgetS: 1 }), false, 'a budgeted call is kept apart from an unbudgeted one');
  await m.execute(a, { fresh: true, budgetS: 1 });
  assert.equal(m.answers(a, { fresh: true, budgetS: 1 }), true); assert.equal(m.answers(a, { fresh: true, budgetS: 0.001 }), false, 'not under a budget smaller than the time it took');
  assert.equal(m.answersTopology(a), false); await m.topologyOf(a); assert.equal(m.answersTopology(a), true);
  assert.equal(m.size(), 3);
}
console.log('PASS reply memory: answers() matches what execute() would answer from memory');
{ // which hits an earlier run stored (pane.js `?keep=on` counts runs up in m.gen): a list asked twice in one run is not an earlier Run's work
  const replies = { execute: async () => ({ ok: true, cpuMs: 1 }), topologyOf: async () => ({ ok: true, topology: { bodies: [] } }), inspect: async () => ({}) };
  const m = createReplyMemory(replies); const a = [{ command: 'solid.box', params: {} }]; const b = [...a, { command: 'solid.hole', params: {} }];
  m.gen = 1; await m.execute(a, { fresh: true }); await m.execute(a, { fresh: true }); await m.topologyOf(a); await m.topologyOf(a);
  assert.deepEqual([m.hits, m.earlier], [2, 0], 'the first run: two hits, none from an earlier run');
  m.gen = 2; m.hits = 0; m.earlier = 0;
  await m.execute(a, { fresh: true }); await m.topologyOf(a); await m.execute(b, { fresh: true }); await m.execute(b, { fresh: true });
  assert.deepEqual([m.hits, m.earlier], [3, 2], 'the next run: the first run\'s two lists count, the list asked twice in this run does not');
}
console.log('PASS reply memory: hits stored by an earlier run are counted apart');

// ---- the kept probe worker (probe-client.mjs persistent): the budget judges the whole list -----------------------------------------------------------
{
  const { createProber } = await import('../vendor/solidcraft-preview/src/probe-client.mjs');
  let t = 0; const timers = new Map(); let seq = 0;
  const setTimer = (f, ms) => { const id = ++seq; timers.set(id, { f, at: t + ms }); return id; };
  const clearTimer = (id) => timers.delete(id);
  const advance = (ms) => { t += ms; for (const [id, x] of [...timers]) if (x.at <= t) { timers.delete(id); x.f(); } };
  const made = [];
  const makeWorker = () => { const w = { posted: [], terminated: false, postMessage(m) { this.posted.push(m); }, terminate() { this.terminated = true; } }; made.push(w); return w; };
  const p = createProber({ makeWorker, getModule: async () => 'MOD', now: () => t, setTimer, clearTimer, persistent: true, idleMs: 1000 });
  const tick = () => new Promise((r) => setImmediate(r));
  // 1: from empty, done in 300 ms
  let r = p.probe([{ command: 'a' }], 2); await tick();
  const w = made[0]; assert.equal(w.posted[0].incremental, true);
  w.onmessage({ data: { phase: 'start', baseMs: 0, held: 0 } }); advance(300); w.onmessage({ data: { phase: 'done', reply: { ok: true }, cpuMs: 300, held: 0 } });
  assert.deepEqual(await r, { status: 'done', reply: { ok: true }, cpuMs: 300, loadMs: undefined, held: 0 });
  assert.equal(w.terminated, false, 'the worker is kept');
  // 2: the same worker; the held prefix stands for 1700 ms, so of a 2 s budget 300 ms are left: 299 ms of new work is fine, 301 is not
  r = p.probe([{ command: 'a' }, { command: 'b' }], 2); await tick();
  assert.equal(made.length, 1, 'no new worker');
  w.onmessage({ data: { phase: 'start', baseMs: 1700, held: 1 } }); advance(299); w.onmessage({ data: { phase: 'done', reply: { ok: true }, cpuMs: 1999, held: 1 } });
  assert.equal((await r).status, 'done');
  r = p.probe([{ command: 'a' }, { command: 'c' }], 2); await tick();
  w.onmessage({ data: { phase: 'start', baseMs: 1700, held: 1 } }); advance(301);
  const late = await r; assert.equal(late.status, 'timedOut'); assert.equal(late.cpuMs, 2001, 'the time of the whole list: the held prefix and the new work');
  assert.equal(w.terminated, true, 'a timeout ends the worker, and every slot with it');
  // 3: a prefix that alone is over the budget is timed out at once
  r = p.probe([{ command: 'a' }], 1); await tick();
  const w2 = made[1]; assert.ok(w2 && w2 !== w, 'a new worker after a timeout');
  w2.onmessage({ data: { phase: 'start', baseMs: 1500, held: 3 } });
  assert.equal((await r).status, 'timedOut');
  // 4: an error ends the worker; an idle worker is ended after idleMs
  r = p.probe([{ command: 'a' }], 2); await tick(); const w3 = made[2];
  w3.onmessage({ data: { phase: 'error', error: 'trap' } }); assert.equal((await r).status, 'error'); assert.equal(w3.terminated, true);
  r = p.probe([{ command: 'a' }], 2); await tick(); const w4 = made[3];
  w4.onmessage({ data: { phase: 'done', reply: { ok: true }, cpuMs: 5 } }); await r; assert.equal(w4.terminated, false);
  advance(1000); assert.equal(w4.terminated, true, 'idle for idleMs: ended, so it does not hold memory for nothing');
}
console.log('PASS kept probe worker: the budget counts the held prefix, a timeout or error ends the worker, an idle one is ended');
console.log('SolidCraft host speed changes (shCode): progress paints, memory answers and the kept probe worker pass.');
