// Main-thread side of the time budget. probe(commands, budgetS) replays `commands` in a Worker and answers
//   { status:'done',     reply, cpuMs, loadMs }   the engine finished inside the budget (reply is the referee's own answer)
//   { status:'timedOut', cpuMs }                  the budget ran out; the Worker was terminated, nothing else was touched
//   { status:'error',    error }                  the Worker could not run it (wasm trap, kernel not loadable)
// Everything environment-specific is injected (Worker constructor, module loader, clock, timers) so the logic is unit-tested without a browser.
//
// shCode, `persistent` (with the session kernel, probe-worker.mjs): one Worker is kept between probes, so a list that extends one it ran before only runs
// its new commands. The budget still judges the whole list: when the worker says which prefix it starts from and how long that prefix took to build
// (`start`), the time left is the budget less that time, and the cpuMs reported is the whole list's. A timeout or an error ends the worker (a new one,
// with nothing kept, serves the next probe); a worker unused for `idleMs` is ended too, so it does not hold memory for nothing. Probes run one at a time.

/** The layer's own rule is { budgetS: 45 + 1.5 x last run }; the host clamps what it is given to something a Worker can honour. */
export const MIN_BUDGET_S = 1;
export const MAX_BUDGET_S = 3600;
export function clampBudgetS(b) {
  const n = Number(b);
  if (!Number.isFinite(n)) return n > 0 ? MAX_BUDGET_S : null; // +Infinity (negative-control runs) -> the ceiling; NaN/undefined -> no budget
  return Math.min(MAX_BUDGET_S, Math.max(MIN_BUDGET_S, n));
}

/** the reply a timed-out run gives the layer: the shape holes/patterns-mirror/booleans/revolve-groove read */
export function timedOutReply(budgetS, cpuMs) {
  return { ok: false, timedOut: true, cpuMs, failed: { command: '(budget)', error: `TIME BUDGET: exceeded ${Math.round(budgetS * 1000)} ms` } };
}

export function createProber({ makeWorker, getModule, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout, persistent = false, idleMs = 120000 }) {
  let kept = null; let idle = null; let chain = Promise.resolve();
  const endKept = () => { if (idle !== null) { clearTimer(idle); idle = null; } if (kept) { try { kept.terminate(); } catch { /* already gone */ } kept = null; } };
  const once = (commands, budgetS, module) => new Promise((resolve) => {
    let worker;
    const t0 = now();
    let timer = null; let settled = false; let baseMs = 0;
    const finish = (r, keep = false) => {
      if (settled) return; settled = true; if (timer !== null) clearTimer(timer);
      if (persistent && keep) { idle = setTimer(endKept, idleMs); }
      else if (persistent) endKept();
      else { try { worker && worker.terminate(); } catch { /* already gone */ } }
      resolve(r);
    };
    try {
      if (persistent) { if (idle !== null) { clearTimer(idle); idle = null; } kept = kept ?? makeWorker(); worker = kept; } else worker = makeWorker();
    } catch (e) { return finish({ status: 'error', error: String((e && e.message) || e) }); }
    worker.onmessage = (ev) => {
      const m = ev.data;
      if (m.phase === 'start') {
        // the prefix stands for baseMs of building: the budget counts it, as a run from empty would have spent it
        baseMs = Number(m.baseMs) || 0; const left = budgetS * 1000 - baseMs - (now() - t0);
        if (timer !== null) clearTimer(timer);
        if (left <= 0) return finish({ status: 'timedOut', cpuMs: baseMs + (now() - t0) });
        timer = setTimer(() => finish({ status: 'timedOut', cpuMs: baseMs + (now() - t0) }), left);
        return;
      }
      if (m.phase === 'done') finish({ status: 'done', reply: m.reply, cpuMs: m.cpuMs, loadMs: m.loadMs, ...(persistent ? { held: m.held ?? 0 } : {}) }, true);
      else finish({ status: 'error', error: m.error });
    };
    worker.onerror = (ev) => finish({ status: 'error', error: String((ev && ev.message) || 'worker error') });
    timer = setTimer(() => finish({ status: 'timedOut', cpuMs: baseMs + (now() - t0) }), budgetS * 1000);
    worker.postMessage({ module, commands, incremental: persistent });
  });
  return {
    async probe(commands, budgetS) {
      let module;
      try { module = await getModule(); } catch (e) { return { status: 'error', error: `the time-limit kernel could not be loaded: ${String((e && e.message) || e)}` }; }
      if (!persistent) return once(commands, budgetS, module);
      const run = chain.then(() => once(commands, budgetS, module)); chain = run.catch(() => {});
      return run;
    },
    /** end the kept worker now (tests; a page that is closing) */
    dispose: endKept,
  };
}
