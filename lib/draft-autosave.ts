// A debounced save that is FLUSHED, never dropped, when its page part goes away.
//
// Before per-account storage (lib/owned-storage.ts) a pending lab autosave was
// cancelled on unmount, because by then the shared keys might have belonged to
// someone else. Now every write lands in the keys of the owner the page loaded
// with, so flushing is always safe, and it saves the last two seconds of typing
// when the student leaves the lesson, reloads (sign-in and sign-out reload), or
// closes the tab.
//
// No timer exists until schedule() is called; nothing here runs at import.

export interface Timers {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
}

export interface DebouncedSave {
  /** (Re)start the countdown; the save runs `delay` ms after the last call. */
  schedule(): void;
  /** Run a pending save now. No-op when none is pending. */
  flush(): void;
  /** Drop a pending save (the reference solution was loaded: it must not be saved). */
  cancel(): void;
  pending(): boolean;
}

const pendingSaves = new Set<DebouncedSave>();
/**
 * Run every save that is waiting on its countdown, now. For the one moment a page has to
 * be sure nothing typed is still only in memory (lib/owner-guard.ts, before it reloads).
 */
export function flushAllPendingSaves(): void {
  for (const s of [...pendingSaves]) {
    try { s.flush(); } catch { /* one failed save never stops the others */ }
  }
  for (const fn of [...otherFlushers.keys()]) {
    try { fn(); } catch { /* same */ }
  }
}

/**
 * Run only the saves that are really waiting: debounced saves with a countdown running, and
 * page parts that said they have one (registerFlush's `isPending`). The outbox calls this
 * before it reads a draft (lib/outbox.ts): a tab whose editor is merely OPEN, with nothing
 * unsaved, must never write it over a draft another tab wrote since.
 */
export function flushPendingSaves(): void {
  for (const s of [...pendingSaves]) {
    try { s.flush(); } catch { /* one failed save never stops the others */ }
  }
  for (const [fn, isPending] of [...otherFlushers]) {
    try { if (isPending && isPending()) fn(); } catch { /* same */ }
  }
}

/** True while this tab has an edit it has not written yet (a countdown, or a part that says so). */
export function hasPendingSaves(): boolean {
  if (pendingSaves.size > 0) return true;
  for (const isPending of otherFlushers.values()) {
    try { if (isPending && isPending()) return true; } catch { /* ignore */ }
  }
  return false;
}

const otherFlushers = new Map<() => void, (() => boolean) | undefined>();
/**
 * A page part with its own save timer: `fn` runs its waiting save, if any. `isPending` says
 * whether one is waiting; without it the part is flushed only by flushAllPendingSaves().
 * Returns the undo.
 */
export function registerFlush(fn: () => void, isPending?: () => boolean): () => void {
  otherFlushers.set(fn, isPending);
  return () => { otherFlushers.delete(fn); };
}

export function createDebouncedSave(
  save: () => void,
  delay: number,
  timers: Timers = {
    setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimeout: (h) => globalThis.clearTimeout(h as ReturnType<typeof setTimeout>),
  },
): DebouncedSave {
  let handle: unknown = null;
  let self: DebouncedSave;
  const run = () => {
    handle = null;
    pendingSaves.delete(self);
    try { save(); } catch { /* a failed save keeps the previous draft; never break the page */ }
  };
  self = {
    schedule() {
      if (handle !== null) timers.clearTimeout(handle);
      handle = timers.setTimeout(run, delay);
      pendingSaves.add(self);
    },
    flush() {
      if (handle === null) return;
      timers.clearTimeout(handle);
      run();
    },
    cancel() {
      if (handle !== null) timers.clearTimeout(handle);
      handle = null;
      pendingSaves.delete(self);
    },
    pending: () => handle !== null,
  };
  return self;
}
