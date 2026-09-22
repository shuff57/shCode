// Client side of the AI-tutor safety gate. Wraps the worker in /models/ and
// exposes one async call, checkPromptSafety(text), which AiHelpPanel and
// DiagramHintPanel await inside ask() before any fetch leaves the page.
//
// Ordering: the synchronous regex gate (pii-check.ts) runs FIRST and
// short-circuits -- no reason to spin up 96 MB of ONNX for a message the
// free check already stops. The ML layer then adds what regex structurally
// cannot see (injection attempts, passwords, driver's licenses, IPs).
//
// Fail-open policy, matching the staging script's warning: if the worker or
// the models are unavailable (models never staged, download blocked, worker
// error), the tutor keeps working with the regex gate alone. The ML layer is
// a bonus, never a dependency.

import { evaluateSafety, type InjectionVerdict, type PiiSpan, type GateResult } from './pii-guard';

const WORKER_URL = '/models/pii-guard-worker.js';

let workerPromise: Promise<Worker> | null = null;
let nextId = 1;

// Pending requests by id, so a worker reply can be routed back to its caller.
const pending = new Map<number, { resolve: (v: WorkerReply) => void; reject: (e: Error) => void }>();

interface WorkerReply {
  id: number;
  injection?: InjectionVerdict;
  piiSpans?: PiiSpan[];
  error?: string;
}

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = new Promise((resolve, reject) => {
      let worker: Worker;
      try {
        worker = new Worker(WORKER_URL, { type: 'module' });
      } catch (e) {
        workerPromise = null;
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      worker.onmessage = (e: MessageEvent) => {
        const reply = e.data as WorkerReply;
        const entry = pending.get(reply.id);
        if (!entry) return;
        pending.delete(reply.id);
        if (reply.error) entry.reject(new Error(reply.error));
        else entry.resolve(reply);
      };
      worker.onerror = () => {
        // Worker-level failure (404 on an unstaged tree, runtime error):
        // reject everything pending and forget the worker so a later send can
        // retry once the models are staged.
        for (const [, entry] of pending) entry.reject(new Error('safety worker unavailable'));
        pending.clear();
        workerPromise = null;
      };
      resolve(worker);
    });
  }
  return workerPromise;
}

function askWorker(worker: Worker, text: string, timeoutMs: number): Promise<WorkerReply> {
  return new Promise((resolve, reject) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('safety check timed out'));
    }, timeoutMs);
    pending.set(id, {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    worker.postMessage({ id, text });
  });
}

export interface PromptSafetyResult extends GateResult {
  /**
   * How far the gate got: 'regex' means the free sync check fired and the
   * models were never consulted; 'ml' means the worker answered (or failed
   * open); 'unavailable' means the worker could not be created at all and the
   * regex gate alone made the call.
   */
  via: 'regex' | 'ml' | 'unavailable';
}

// Generous but bounded: model load is a one-time ~96 MB fetch on first send,
// subsequent calls are milliseconds. A stalled check should never wedge the
// Ask button -- failing open beats a tutor that hangs.
const CHECK_TIMEOUT_MS = 120_000;

/**
 * The full gate: regex (sync) -> injection classifier -> PII extraction.
 * Never throws; a blocked result is decided by evaluateSafety, an
 * unavailable model layer falls open to regex-only.
 */
export async function checkPromptSafety(text: string): Promise<PromptSafetyResult> {
  // Regex first: free, synchronous, and it catches the exact shapes it was
  // written for. No point paying for inference after a regex hit.
  const regexVerdict = evaluateSafety(text, null, []);
  if (regexVerdict.blocked) {
    return { ...regexVerdict, via: 'regex' as const };
  }

  let worker: Worker;
  try {
    worker = await getWorker();
  } catch {
    return { blocked: false, layer: null, reason: null, via: 'unavailable' as const };
  }

  try {
    const reply = await askWorker(worker, text, CHECK_TIMEOUT_MS);
    const verdict = evaluateSafety(
      text,
      reply.injection ?? null,
      reply.piiSpans ?? [],
    );
    return { ...verdict, via: 'ml' as const };
  } catch {
    return { blocked: false, layer: null, reason: null, via: 'unavailable' as const };
  }
}