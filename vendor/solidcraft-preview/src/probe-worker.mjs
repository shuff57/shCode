// Dedicated Worker for the time budget. Receives { module, commands }, replays the commands on a scratch session of the pinned engine, answers
// { phase:'done', reply, cpuMs, loadMs } or { phase:'error', error }. The parent terminates the worker when the budget runs out; a synchronous wasm
// call cannot be interrupted any other way.
//
// shCode, incremental (the kernel built with the "session" feature exports run_from; the parent asks with { incremental: true }): the worker stays alive
// and keeps up to MAX_SLOTS sessions, each with the exact command list it holds and the time it took to build from an empty design. A list is run from a
// scratch copy of the slot holding its longest prefix (upstream's Session::scratch), so only the commands after that prefix are run. Before running, the
// worker says how much time the prefix stands for ({ phase:'start', baseMs }), so the parent's budget counts it; the answer's cpuMs is baseMs plus the time
// of the new commands, the time the whole list took to build, as when every probe started from empty. A trap or a timeout ends the worker and every slot
// with it; a failed list is not kept.
import { instantiateKernel } from './probe-kernel.mjs';

const MAX_SLOTS = 8;
let k = null; let loadedMs = 0; let tick = 0;
const slots = []; // index -> { keys: string[], ms, used } | undefined

const longestPrefix = (keys) => {
  let best = -1; let len = 0;
  slots.forEach((s, i) => {
    if (!s || s.keys.length > keys.length || s.keys.length <= len) return;
    for (let j = 0; j < s.keys.length; j++) if (s.keys[j] !== keys[j]) return;
    best = i; len = s.keys.length;
  });
  return { best, len };
};
const freeSlot = (keep) => {
  for (let i = 0; i < MAX_SLOTS; i++) if (!slots[i]) return i;
  let lru = -1;
  slots.forEach((s, i) => { if (i !== keep && (lru < 0 || s.used < slots[lru].used)) lru = i; });
  return lru;
};

self.onmessage = (ev) => {
  const { module, commands, incremental } = ev.data;
  try {
    let loadMs = 0;
    if (!k) { const t0 = performance.now(); k = instantiateKernel(module); loadedMs = Math.round(performance.now() - t0); loadMs = loadedMs; }
    if (!incremental || !k.runFrom) {
      const t1 = performance.now();
      const reply = k.run(commands);
      self.postMessage({ phase: 'done', reply, cpuMs: Math.round(performance.now() - t1), loadMs });
      return;
    }
    const keys = commands.map((c) => JSON.stringify(c));
    const { best, len } = longestPrefix(keys);
    const baseMs = best >= 0 ? slots[best].ms : 0;
    self.postMessage({ phase: 'start', baseMs, held: len });
    const to = freeSlot(best);
    const t1 = performance.now();
    const reply = k.runFrom(best, to, commands.slice(len));
    const tailMs = performance.now() - t1;
    if (reply && reply.ok) { slots[to] = { keys, ms: baseMs + tailMs, used: ++tick }; if (best >= 0) slots[best].used = ++tick; }
    else if (reply && reply.failed && Number.isInteger(reply.failed.index)) reply.failed.index += len; // the index in the whole list, as a run from empty gives it
    self.postMessage({ phase: 'done', reply, cpuMs: Math.round(baseMs + tailMs), loadMs, held: len });
  } catch (e) {
    self.postMessage({ phase: 'error', error: String((e && e.message) || e) });
  }
};
