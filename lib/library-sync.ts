'use client';

// Keeps a signed-in student's saved textures and sounds (lib/moshion-storage.ts)
// in step with their account library (functions/api/library/*).
//
// Three copies meet here: this browser's store, the account, and the BASE, the
// hash of each item as it last stood when the two agreed, kept per account in
// localStorage. Against the base, each side either changed or did not, which
// is all a three-way merge needs:
//
//   changed here only    -> upload           changed there only -> download
//   changed on both      -> keep both: this browser's copy is renamed (hero_2)
//                           and uploaded, the account's copy takes the name
//   deleted there        -> delete here, unless it changed here (then re-upload)
//   deleted here         -> delete there, but ONLY when the student pressed
//                           Delete (readLocalDeletes). An item merely missing
//                           here -- a sketch ran clearStorage() -- comes back.
//
// planSync() is that table and nothing else, so it is tested on its own
// (scripts/test-library-sync.mjs); runSync() does the I/O around it.

import {
  LIBRARY_LOCAL_CHANGE,
  applyLibraryChanges,
  localLibraryItems,
  readLocalDeletes,
  writeLocalDeletes,
  type LibraryKind,
  type LocalLibraryItem,
} from './moshion-storage';

export interface ServerItem {
  id: string;
  kind: LibraryKind;
  name: string;
  hash: string;
  deletedAt: number | null;
}
export interface BaseEntry {
  id: string;
  hash: string;
}
export type Base = Record<string, BaseEntry>;

export type SyncAction =
  | { type: 'upload'; kind: LibraryKind; name: string; baseHash: string | null }
  | { type: 'download'; kind: LibraryKind; name: string; id: string; hash: string }
  | { type: 'removeLocal'; kind: LibraryKind; name: string }
  | { type: 'removeRemote'; kind: LibraryKind; name: string; id: string; baseHash: string }
  | { type: 'rename'; kind: LibraryKind; from: string; to: string }
  | { type: 'setBase'; kind: LibraryKind; name: string; id: string; hash: string }
  | { type: 'dropBase'; kind: LibraryKind; name: string }
  | { type: 'forgetDelete'; kind: LibraryKind; name: string };

export const itemKey = (kind: LibraryKind, name: string) => `${kind}:${name}`;
const MAX_NAME = 40;

/** `hero` -> `hero_2`, `hero_3`, ... the first free name, kept within 40 characters. */
export function freshName(name: string, taken: Set<string>): string {
  for (let n = 2; ; n++) {
    const suffix = `_${n}`;
    const candidate = name.slice(0, MAX_NAME - suffix.length) + suffix;
    if (!taken.has(candidate)) return candidate;
  }
}

export function planSync(
  local: { kind: LibraryKind; name: string; hash: string }[],
  base: Base,
  server: ServerItem[],
  deletes: Set<string>,
): SyncAction[] {
  const out: SyncAction[] = [];
  const L = new Map(local.map((l) => [itemKey(l.kind, l.name), l]));
  const S = new Map(server.map((s) => [itemKey(s.kind, s.name), s]));
  const keys = new Set([...L.keys(), ...Object.keys(base), ...S.keys(), ...deletes]);
  // Names a rename must avoid, per kind: everything here and everything there.
  const taken: Record<LibraryKind, Set<string>> = { texture: new Set(), sound: new Set() };
  for (const l of local) taken[l.kind].add(l.name);
  for (const s of server) taken[s.kind].add(s.name);

  const keepBoth = (kind: LibraryKind, name: string, s: ServerItem) => {
    const to = freshName(name, taken[kind]);
    taken[kind].add(to);
    out.push({ type: 'rename', kind, from: name, to });
    out.push({ type: 'upload', kind, name: to, baseHash: null });
    out.push({ type: 'download', kind, name, id: s.id, hash: s.hash });
  };

  for (const key of [...keys].sort()) {
    const sep = key.indexOf(':');
    const kind = key.slice(0, sep) as LibraryKind;
    const name = key.slice(sep + 1);
    const l = L.get(key);
    const b = base[key];
    const sAny = S.get(key);
    const s = sAny && sAny.deletedAt == null ? sAny : undefined; // live on the account
    const tomb = !!sAny && sAny.deletedAt != null;

    if (l) {
      if (deletes.has(key)) out.push({ type: 'forgetDelete', kind, name }); // saved again since
      if (!b) {
        if (!s) out.push({ type: 'upload', kind, name, baseHash: null });
        else if (s.hash === l.hash) out.push({ type: 'setBase', kind, name, id: s.id, hash: s.hash });
        else keepBoth(kind, name, s);
        continue;
      }
      const changedHere = l.hash !== b.hash;
      if (s) {
        const changedThere = s.hash !== b.hash;
        if (!changedHere && !changedThere) continue;
        if (changedHere && !changedThere) out.push({ type: 'upload', kind, name, baseHash: b.hash });
        else if (!changedHere && changedThere) out.push({ type: 'download', kind, name, id: s.id, hash: s.hash });
        else if (l.hash === s.hash) out.push({ type: 'setBase', kind, name, id: s.id, hash: s.hash });
        else keepBoth(kind, name, s);
      } else if (tomb && !changedHere) {
        out.push({ type: 'removeLocal', kind, name }, { type: 'dropBase', kind, name });
      } else {
        // Changed here after the account deleted it, or the account has no record of
        // it at all: keep the student's work.
        out.push({ type: 'upload', kind, name, baseHash: null });
      }
      continue;
    }

    // Not in this browser.
    if (deletes.has(key)) {
      if (s && b && s.hash === b.hash) out.push({ type: 'removeRemote', kind, name, id: s.id, baseHash: b.hash });
      else if (s) {
        // Deleted here, but changed on another device since: the newer work wins.
        out.push({ type: 'forgetDelete', kind, name }, { type: 'download', kind, name, id: s.id, hash: s.hash });
      } else {
        out.push({ type: 'forgetDelete', kind, name });
        if (b) out.push({ type: 'dropBase', kind, name });
      }
      continue;
    }
    if (s) out.push({ type: 'download', kind, name, id: s.id, hash: s.hash });
    else if (b) out.push({ type: 'dropBase', kind, name });
  }
  return out;
}

// ---- I/O ------------------------------------------------------------------

/** sha-256 hex of data URI + NUL + meta: the same as functions/_shared/library.ts. */
export async function itemHash(dataUri: string, meta: string | null): Promise<string> {
  const data = new TextEncoder().encode(`${dataUri}\u0000${meta ?? ''}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (n) => n.toString(16).padStart(2, '0')).join('');
}

const BASE_KEY = 'moshion.library.base.v1';
function readAllBases(): Record<string, Base> {
  try {
    const v = JSON.parse(window.localStorage.getItem(BASE_KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
function readBase(email: string): Base {
  return readAllBases()[email] ?? {};
}
function writeBase(email: string, base: Base | null): void {
  const all = readAllBases();
  if (base && Object.keys(base).length) all[email] = base;
  else delete all[email];
  try {
    if (Object.keys(all).length) window.localStorage.setItem(BASE_KEY, JSON.stringify(all));
    else window.localStorage.removeItem(BASE_KEY);
  } catch { /* private mode */ }
}

export interface SyncResult {
  ok: boolean;
  uploaded: number;
  downloaded: number;
  removed: number;
  renamed: { kind: LibraryKind; from: string; to: string }[];
  problems: string[];
}
export const LIBRARY_SYNC_STATUS = 'moshion-library-sync-status';

/** One full sync for the signed-in `email`. Never throws. */
export async function runSync(email: string): Promise<SyncResult> {
  const result: SyncResult = { ok: false, uploaded: 0, downloaded: 0, removed: 0, renamed: [], problems: [] };
  let serverItems: ServerItem[];
  try {
    const res = await fetch('/api/library', { credentials: 'same-origin' });
    if (!res.ok) {
      result.problems.push(res.status === 401 ? 'Sign in to sync your library.' : `The library did not answer (${res.status}).`);
      return finish(result);
    }
    serverItems = ((await res.json()) as { items: ServerItem[] }).items ?? [];
  } catch {
    result.problems.push('Offline: your textures and sounds are saved here and will sync later.');
    return finish(result);
  }

  const localItems = localLibraryItems();
  const byKey = new Map(localItems.map((l) => [itemKey(l.kind, l.name), l]));
  const hashed = await Promise.all(localItems.map(async (l) => ({ kind: l.kind, name: l.name, hash: await itemHash(l.dataUri, l.meta) })));
  const base = { ...readBase(email) };
  const deletes = new Set(readLocalDeletes());
  const plan = planSync(hashed, base, serverItems, deletes);

  // Local changes go in as one write, so a half-applied plan never sits in the store.
  const put: LocalLibraryItem[] = [];
  const remove: { kind: LibraryKind; name: string }[] = [];
  const uploads: { item: LocalLibraryItem; baseHash: string | null }[] = [];
  const downloads: { kind: LibraryKind; name: string; id: string; hash: string }[] = [];

  for (const a of plan) {
    const key = itemKey(a.kind, 'name' in a ? a.name : a.from);
    switch (a.type) {
      case 'rename': {
        const src = byKey.get(itemKey(a.kind, a.from));
        if (!src) break;
        const moved = { ...src, name: a.to };
        byKey.set(itemKey(a.kind, a.to), moved);
        put.push(moved);
        remove.push({ kind: a.kind, name: a.from });
        result.renamed.push({ kind: a.kind, from: a.from, to: a.to });
        break;
      }
      case 'upload': {
        const item = byKey.get(key);
        if (item) uploads.push({ item, baseHash: a.baseHash });
        break;
      }
      case 'download':
        downloads.push(a);
        break;
      case 'removeLocal':
        remove.push({ kind: a.kind, name: a.name });
        result.removed++;
        break;
      case 'setBase':
        base[key] = { id: a.id, hash: a.hash };
        break;
      case 'dropBase':
        delete base[key];
        break;
      case 'forgetDelete':
        deletes.delete(key);
        break;
      case 'removeRemote':
        try {
          const res = await fetch(`/api/library/${a.id}?baseHash=${a.baseHash}`, { method: 'DELETE', credentials: 'same-origin' });
          if (res.ok || res.status === 404) {
            delete base[key];
            deletes.delete(key);
            result.removed++;
          }
          // 409: changed elsewhere since; the next sync downloads the newer copy.
        } catch { /* offline: try again next time */ }
        break;
    }
  }

  for (const d of downloads) {
    try {
      const res = await fetch(`/api/library/${d.id}`, { credentials: 'same-origin' });
      if (!res.ok) continue;
      const body = (await res.json()) as { dataUri: string; meta: string | null; hash: string };
      // applyLibraryChanges removes before it writes, so a renamed-away name is
      // free for the account's copy to land in.
      put.push({ kind: d.kind, name: d.name, dataUri: body.dataUri, meta: body.meta });
      base[itemKey(d.kind, d.name)] = { id: d.id, hash: body.hash };
      result.downloaded++;
    } catch { /* offline mid-sync: the rest waits for next time */ }
  }

  if (put.length || remove.length) {
    if (!applyLibraryChanges({ put, remove })) {
      // Not enough room in this browser for everything the account holds. Keep this
      // browser's own changes (renames, deletes) and leave the downloads for later.
      for (const d of downloads) delete base[itemKey(d.kind, d.name)];
      const renamesOnly = put.filter((p) => result.renamed.some((r) => r.kind === p.kind && r.to === p.name));
      applyLibraryChanges({ put: renamesOnly, remove });
      result.downloaded = 0;
      result.problems.push('This browser is out of room for your whole library. Delete a texture or sound you no longer need.');
    }
  }

  for (const { item, baseHash } of uploads) {
    const key = itemKey(item.kind, item.name);
    try {
      const res = await fetch('/api/library', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: item.kind, name: item.name, dataUri: item.dataUri, meta: item.meta, baseHash }),
      });
      const body = (await res.json().catch(() => ({}))) as { item?: { id: string; hash: string }; error?: string };
      if (res.ok && body.item) {
        base[key] = { id: body.item.id, hash: body.item.hash };
        result.uploaded++;
      } else if (res.status !== 409) {
        // 409: changed on another device meanwhile; the next sync keeps both.
        result.problems.push(`${item.name}: ${body.error ?? `not saved to your account (${res.status})`}`);
      }
    } catch { /* offline: next time */ }
  }

  writeBase(email, base);
  writeLocalDeletes([...deletes]);
  result.ok = result.problems.length === 0;
  return finish(result);
}

let lastResult: SyncResult | null = null;
export function lastSyncResult(): SyncResult | null {
  return lastResult;
}
function finish(r: SyncResult): SyncResult {
  lastResult = r;
  try { window.dispatchEvent(new CustomEvent(LIBRARY_SYNC_STATUS, { detail: r })); } catch { /* no window */ }
  return r;
}

/**
 * On sign-out: remove from this browser every item that is safely in the
 * account (its hash still matches the base), so the next person on a shared
 * computer does not see it. Anything changed since the last sync stays.
 */
export async function clearSyncedLibrary(email: string): Promise<void> {
  const base = readBase(email);
  const remove: { kind: LibraryKind; name: string }[] = [];
  for (const l of localLibraryItems()) {
    const b = base[itemKey(l.kind, l.name)];
    if (b && b.hash === (await itemHash(l.dataUri, l.meta))) remove.push({ kind: l.kind, name: l.name });
  }
  if (remove.length) applyLibraryChanges({ remove });
  writeBase(email, null);
}

// ---- when to sync ---------------------------------------------------------

let running: Promise<SyncResult> | null = null;
let again = false;
let lastRunAt = 0;
const MIN_GAP_MS = 30_000;

/** Sync now, or once more after the run in progress. `force` skips the 30 s gap. */
export function requestSync(email: string, force = false): void {
  if (!force && Date.now() - lastRunAt < MIN_GAP_MS) return;
  if (running) { again = true; return; }
  lastRunAt = Date.now();
  running = runSync(email).finally(() => {
    running = null;
    if (again) { again = false; requestSync(email, true); }
  });
}

/** Wire the triggers for `email`: now, after every local save or delete, and on returning to the tab. */
export function startLibrarySync(email: string): () => void {
  requestSync(email, true);
  let t: ReturnType<typeof setTimeout> | null = null;
  const onChange = () => {
    if (t) clearTimeout(t);
    t = setTimeout(() => requestSync(email, true), 1500);
  };
  const onVisible = () => { if (document.visibilityState === 'visible') requestSync(email); };
  window.addEventListener(LIBRARY_LOCAL_CHANGE, onChange);
  document.addEventListener('visibilitychange', onVisible);
  return () => {
    if (t) clearTimeout(t);
    window.removeEventListener(LIBRARY_LOCAL_CHANGE, onChange);
    document.removeEventListener('visibilitychange', onVisible);
  };
}
