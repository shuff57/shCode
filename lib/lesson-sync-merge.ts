// Pure merge logic for cross-device workspace sync. Kept free of React,
// localStorage and fetch so scripts/test-lesson-sync.mjs can exercise every
// case directly.
//
// Three versions of the workspace take part in a merge:
//   local  -- what this device's editor holds right now
//   base   -- the workspace this device last saw from the server
//   remote -- the server's newer row (or the row handed back on a 409)
//
// A file this device changed since `base` is this device's to keep; every
// other file takes the server's copy, including the server's deletion. That
// is the same last-writer-wins outcome the old manual Pull button produced,
// but computed per file instead of throwing the whole workspace away, and it
// means an untouched device can never clobber work it never saw.

export type FileMap = Record<string, string>;

export function filesEqual(a: FileMap, b: FileMap): boolean {
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

export interface MergeResult {
  files: FileMap;
  /** Files where this device's copy differed from the server and won. */
  keptLocal: string[];
  /** Files taken from the server (a value or a deletion). */
  tookRemote: string[];
}

export function mergeSyncFiles(local: FileMap, base: FileMap, remote: FileMap): MergeResult {
  const files: FileMap = {};
  const keptLocal: string[] = [];
  const tookRemote: string[] = [];

  const paths = new Set([
    ...Object.keys(local),
    ...Object.keys(base),
    ...Object.keys(remote),
  ]);

  for (const path of paths) {
    const l = local[path];
    const b = base[path];
    const r = remote[path];
    const localChanged = l !== b;

    if (localChanged) {
      // The editor is the authority for a file this device touched. A local
      // deletion stays a deletion.
      if (l !== undefined) files[path] = l;
      if (r !== l) keptLocal.push(path);
    } else {
      // Nothing local to lose: take the server's copy, and its deletion too.
      if (r !== undefined) files[path] = r;
      if (r !== l) tookRemote.push(path);
    }
  }

  return { files, keptLocal, tookRemote };
}
