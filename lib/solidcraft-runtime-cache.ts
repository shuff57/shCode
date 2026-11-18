// The SolidCraft engine and the time-budget kernel (101 MB and 74 MB) kept by the page that frames the CAD host, so a visit
// after the first does not download them again.
//
// Why here: the CAD studio frames the host page credentialless, so SolidCraft's recovery files never reach the app's storage
// (vendor/solidcraft-preview/README.md). That frame also gets an empty HTTP cache on every visit, so it downloaded both files
// every time. This page has a normal cache. It keeps the two files in Cache Storage and hands their bytes to the frame on asking
// (window.__shcodeRuntime.get, used by vendor/solidcraft-preview/src/runtime-cache.js with ?cache=parent).
//
// Only the pinned files (SOLIDCRAFT_ASSETS: path, size, sha256) are handed over, and only when their size and sha256 match; a
// copy that does not is thrown away. Anything that fails answers null, and the frame then downloads the file as before.
import { SOLIDCRAFT_ASSETS } from '../functions/_shared/solidcraft-runtime';

const CACHE = 'shcode-solidcraft-runtime-v1';
type Asset = (typeof SOLIDCRAFT_ASSETS)[number];
export interface RuntimeCache { get(path: string): Promise<ArrayBuffer | null> }

const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
async function matches(bytes: ArrayBuffer, a: Asset): Promise<boolean> {
  return bytes.byteLength === a.size && hex(await crypto.subtle.digest('SHA-256', bytes)) === a.sha256;
}

/** The cache for files under `base` (the host page's folder). */
export function createRuntimeCache(base = '/solidcraft-preview/', assets: readonly Asset[] = SOLIDCRAFT_ASSETS): RuntimeCache {
  const byPath = new Map<string, Asset>(assets.map(a => [a.path, a]));
  const pending = new Map<string, Promise<ArrayBuffer | null>>();
  const load = async (a: Asset): Promise<ArrayBuffer | null> => {
    const url = new URL(base + a.path, location.origin).href;
    let store: Cache | null = null;
    try { store = await caches.open(CACHE); } catch { /* no Cache Storage (a private window): download, keep nothing */ }
    if (store) {
      try {
        const hit = await store.match(url);
        if (hit) { const bytes = await hit.arrayBuffer(); if (await matches(bytes, a)) return bytes; await store.delete(url); }
      } catch { /* a damaged entry: download it again */ }
    }
    const r = await fetch(url); if (!r.ok) return null;
    const bytes = await r.arrayBuffer(); if (!(await matches(bytes, a))) return null;
    if (store) {
      try {
        await store.put(url, new Response(bytes.slice(0), { headers: { 'Content-Type': 'application/wasm' } }));
        // files of an older pin go
        for (const req of await store.keys()) if (![...byPath.values()].some(x => new URL(base + x.path, location.origin).href === req.url)) await store.delete(req);
      } catch { /* full or refused: it is downloaded again next time */ }
    }
    return bytes;
  };
  return {
    get(path: string) {
      const a = byPath.get(path); if (!a) return Promise.resolve(null);
      let p = pending.get(path);
      if (!p) { p = load(a).catch(() => null).finally(() => pending.delete(path)); pending.set(path, p); }
      return p;
    },
  };
}

/** Put the cache where the framed host page looks for it (window.__shcodeRuntime). */
export function installRuntimeCache(win: Window & { __shcodeRuntime?: RuntimeCache }): void {
  if (!win.__shcodeRuntime && typeof caches !== 'undefined' && typeof crypto?.subtle !== 'undefined') win.__shcodeRuntime = createRuntimeCache();
}
