// Client-side batching for "most missed requirement" tracking (POST /api/requirement-events).
//
// Pure and isomorphic: the clock and the sender are injected, so the timing is testable without a
// browser. Rules: a failed requirement adds one to its local count; a passed one is noted; a flush
// sends what is pending at most once per `intervalMs` (and when forced: page hide, unmount); an empty
// batch sends nothing; a requirement already reported green this session is not re-sent unless it
// failed again. Best effort -- a send that throws is dropped, never retried, never surfaced.

export interface RequirementEventResult {
  reqId: string;
  fails: number;
  passed: boolean;
}

export interface RequirementBatchPayload {
  lessonId: string;
  results: RequirementEventResult[];
}

export const FLUSH_INTERVAL_MS = 20_000;
/** The server accepts at most 60 results per request; stay under it. */
export const MAX_RESULTS_PER_SEND = 60;
/** The server caps fails per request per requirement at 50. */
export const MAX_FAILS_PER_RESULT = 50;

export interface RequirementBatcherOptions {
  lessonId: string;
  now: () => number;
  send: (payload: RequirementBatchPayload) => void | Promise<void>;
  intervalMs?: number;
}

export class RequirementBatcher {
  private fails = new Map<string, number>();
  private passed = new Set<string>();
  private reportedPassed = new Set<string>();
  private lastFlush = Number.NEGATIVE_INFINITY;
  private readonly lessonId: string;
  private readonly now: () => number;
  private readonly send: RequirementBatcherOptions['send'];
  private readonly intervalMs: number;

  constructor(opts: RequirementBatcherOptions) {
    this.lessonId = opts.lessonId;
    this.now = opts.now;
    this.send = opts.send;
    this.intervalMs = opts.intervalMs ?? FLUSH_INTERVAL_MS;
  }

  /** One Run's outcome: every graded requirement, passed or not. Flushes if the interval has elapsed. */
  record(outcomes: ReadonlyArray<{ reqId: string; passed: boolean }>): void {
    for (const o of outcomes) {
      if (!o.reqId) continue;
      if (o.passed) {
        if (!this.reportedPassed.has(o.reqId)) this.passed.add(o.reqId);
      } else {
        this.reportedPassed.delete(o.reqId);
        this.fails.set(o.reqId, Math.min(MAX_FAILS_PER_RESULT, (this.fails.get(o.reqId) ?? 0) + 1));
      }
    }
    this.flush(false);
  }

  /** Anything waiting to go out. */
  get pending(): number {
    return this.build().length;
  }

  private build(): RequirementEventResult[] {
    const out: RequirementEventResult[] = [];
    const ids = new Set<string>([...this.fails.keys(), ...this.passed]);
    for (const reqId of ids) {
      const fails = this.fails.get(reqId) ?? 0;
      const passed = this.passed.has(reqId);
      if (fails === 0 && this.reportedPassed.has(reqId)) continue;
      out.push({ reqId, fails, passed });
    }
    return out;
  }

  /** Send what is pending. `force` ignores the interval (page hide, unmount). Returns true when something was sent. */
  flush(force: boolean): boolean {
    const t = this.now();
    if (!force && t - this.lastFlush < this.intervalMs) return false;
    const all = this.build();
    if (all.length === 0) return false;
    const results = all.slice(0, MAX_RESULTS_PER_SEND);
    this.lastFlush = t;
    for (const r of results) {
      this.fails.delete(r.reqId);
      if (r.passed) { this.passed.delete(r.reqId); this.reportedPassed.add(r.reqId); }
      else this.reportedPassed.delete(r.reqId);
    }
    try {
      const p = this.send({ lessonId: this.lessonId, results });
      if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {});
    } catch {
      /* best effort */
    }
    return true;
  }
}
