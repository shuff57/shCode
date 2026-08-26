'use client';

import { RefObject, useEffect } from 'react';

// Saves for moSHion sketches.
//
// The preview iframe is sandboxed WITHOUT allow-same-origin, deliberately, so
// student code cannot reach /api/* carrying the viewer's session cookie. The
// price is an opaque origin, where merely READING window.localStorage throws
// SecurityError -- so `storeItem()` killed the sketch outright. Measured
// 2026-08-25: every one of the 42 lesson files that calls storeItem/getItem
// showed a black canvas and "Error: Script error.", which is all of unit 6.5
// (Save & Load), parts of 6.6 and 7.1, and 4.1.4.
//
// So the host page holds the store instead, on its own real origin, and the
// frame gets a hydrated copy:
//
//   parent (app origin)          iframe (opaque origin)
//     localStorage  ---- init --->  window.__moshionStorage
//        ^                                  |
//        +---------- set/remove/clear ------+
//
// The frame waits for `init` before it runs the student script, so getItem()
// is an ordinary synchronous read of an object that is already populated.
// That matters: the moSHion API is synchronous and a save that only arrived
// after setup() would be worse than no save at all.
//
// One namespace for every sketch, matching what real localStorage would do
// for a real game on one origin -- so a save made in the 6.5.4 example is
// still there for the 6.5.7 example that loads it, which is the point those
// two lessons are making.

const KEY = 'moshion.store.v1';

// A student sketch can call storeItem() every frame. The app keeps lesson
// drafts in this same localStorage, so an unbounded sketch could evict a
// student's unsaved work -- these caps make that impossible rather than
// unlikely.
const MAX_VALUE_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 512 * 1024;

type Store = Record<string, string>;

function readStore(): Store {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    const raw = JSON.stringify(store);
    if (raw.length > MAX_TOTAL_BYTES) return;
    window.localStorage.setItem(KEY, raw);
  } catch {
    /* quota, private mode -- the sketch keeps its in-frame copy either way */
  }
}

/**
 * Serve the storage bridge for one moSHion preview iframe.
 *
 * Only messages whose source IS this frame's contentWindow are answered, so
 * several previews on one page (a reading with four live blocks) do not each
 * reply to the others' requests.
 */
export function useMoshionStorage(ref: RefObject<HTMLIFrameElement | null>): void {
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const frame = ref.current;
      if (!frame || !frame.contentWindow || e.source !== frame.contentWindow) return;
      const d = e.data as Record<string, unknown> | null;
      if (!d || typeof d !== 'object') return;

      if (d.source === 'preview-storage-request') {
        frame.contentWindow.postMessage(
          { source: 'preview-storage-init', data: readStore() },
          '*'
        );
        return;
      }
      if (d.source !== 'preview-storage') return;

      if (d.op === 'clear') {
        writeStore({});
        return;
      }
      if (typeof d.key !== 'string') return;
      const store = readStore();
      if (d.op === 'remove') {
        delete store[d.key];
      } else if (d.op === 'set') {
        if (typeof d.value !== 'string' || d.value.length > MAX_VALUE_BYTES) return;
        store[d.key] = d.value;
      } else {
        return;
      }
      writeStore(store);
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [ref]);
}
