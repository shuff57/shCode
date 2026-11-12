// Carry-forward: bring a student's own saved work from the previous lab in a
// game's chain into this one.
//
// Why. Every moSHion lab re-seeds from its authored starter, and for most labs
// that starter IS an earlier lab's reference solution. The game carries forward;
// the student's game does not. Across a 21-screen Pinball build that asks them to
// rebuild their own file every week. `carryFrom` in lesson.json names the source
// lesson, and this module holds the pure rules: what to merge, what to call the
// commit, and how a dismissal is remembered.
//
// Nothing here touches the network. The store action in lib/store.ts fetches the
// source's newest commit (or its offline draft) and calls mergeCarriedFiles.

import { ownedLocal } from './owned-storage';

/** The message a carried commit is recorded under. Exact wording is asserted by
 *  scripts/test-carry-forward.mjs and shown in the History panel. */
export function carryMessage(sourceTitle: string): string {
  const title = (sourceTitle ?? '').trim() || 'your last lesson';
  return `Brought forward from ${title}`;
}

/** Storage key for "the student chose the starter over their own work", per
 *  (target, source) pair, so the strip does not reappear on every visit. Stored
 *  under this page's owner (`w1:<owner>:carry-dismissed:...`, lib/owned-storage.ts). */
export function carryDismissKey(targetId: string, sourceId: string): string {
  return `carry-dismissed:${targetId}<-${sourceId}`;
}

const ownedOrNone = (): Pick<Storage, 'getItem' | 'setItem'> | undefined =>
  typeof window === 'undefined' ? undefined : ownedLocal;

export function isCarryDismissed(
  targetId: string,
  sourceId: string,
  storage: Pick<Storage, 'getItem'> | undefined = ownedOrNone()
): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(carryDismissKey(targetId, sourceId)) === '1';
  } catch {
    return false; // private mode, quota, or a blocked origin: never block the lab
  }
}

export function dismissCarry(
  targetId: string,
  sourceId: string,
  storage: Pick<Storage, 'setItem'> | undefined = ownedOrNone()
): void {
  if (!storage) return;
  try {
    storage.setItem(carryDismissKey(targetId, sourceId), '1');
  } catch {
    /* remember best-effort only */
  }
}

/**
 * Copy the source's files over this lesson's, path for path.
 *
 * Only paths the target already has are taken: a lesson bundle defines which
 * files exist, and carrying an extra one would create a file the workspace has
 * no editor tab or grader rule for. Values are compared as-is; the caller
 * normalises line endings when it writes them into the store.
 */
export function mergeCarriedFiles(
  target: Record<string, string>,
  carried: Record<string, string>,
): Record<string, string> {
  const out = { ...target };
  for (const path of Object.keys(target)) {
    const text = carried[path];
    if (typeof text === 'string') out[path] = text;
  }
  return out;
}

/** True when carrying would actually change something. The strip stays away
 *  when a student's carried file is byte-identical to what they started with,
 *  because the offer would do nothing. */
export function carryWouldChange(
  target: Record<string, string>,
  carried: Record<string, string>,
): boolean {
  return Object.keys(target).some(
    (path) => typeof carried[path] === 'string' && carried[path] !== target[path],
  );
}

/** The authored starter's files, with line endings normalised the way the editor
 *  normalises them, so an untouched lesson compares equal to itself. */
export function starterContents(
  files: Array<{ path: string; content?: string | null }>,
): Record<string, string> {
  return Object.fromEntries(
    files.map((f) => [f.path, (f.content ?? '').replace(/\r\n?/g, '\n')]),
  );
}

/** True when the lesson still holds its authored starter — i.e. the student has
 *  not written anything here yet, so their own work can never be overwritten. */
export function isAuthoredStarter(
  starter: Record<string, string>,
  current: Record<string, string>,
): boolean {
  const keys = Object.keys(starter);
  if (keys.length !== Object.keys(current).length) return false;
  return keys.every((k) => (current[k] ?? '').replace(/\r\n?/g, '\n') === starter[k]);
}
