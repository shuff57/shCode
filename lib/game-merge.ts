// The one merge the Games library's change flow uses (codehs-review/GAME-FLOW-SPEC.md).
//
// Three texts take part, exactly as in git:
//   base     the version both sides started from (the version a remix was made from)
//   theirs   one side's edit of base (a classmate's proposed change, or the newest version of the original)
//   current  the other side's edit of base (the game as it is now, or the student's sandbox draft)
//
// Each side's edit is turned into hunks against base ("lines a..b of base become these lines"). When no
// hunk of one side touches a hunk of the other, both are applied and the result is the merge. When they
// do touch, it is a conflict and there is NO merged text: beginners are never shown conflict markers. The
// caller says "you both changed the same lines" and offers a choice instead.
//
// Accept (functions/api/game-changes/[cid].ts), the review panel's "after accepting" view, Try it, and
// "Bring in the newest version" all call this, so what a student sees is what gets saved.
// Pure: no React, no fetch. Tests: scripts/test-game-merge.mjs.

import { diffArrays } from 'diff';

/** Lines `start` up to (not including) `end` of base become `lines`. An insert has start === end. */
export interface Hunk { start: number; end: number; lines: string[] }

export type MergeResult =
  | { ok: true; text: string }
  | { ok: false; conflicts: number; lines: number[] };

function eol(s: string): string {
  return s.replace(/\r\n?/g, '\n');
}

function split(s: string): string[] {
  return eol(s).split('\n');
}

/** The hunks that turn `base` into `other` (both already split into lines). */
export function hunksOf(base: string[], other: string[]): Hunk[] {
  const out: Hunk[] = [];
  let pos = 0;
  let cur: Hunk | null = null;
  for (const c of diffArrays(base, other)) {
    const n = c.value.length;
    if (!c.added && !c.removed) {
      if (cur) { out.push(cur); cur = null; }
      pos += n;
      continue;
    }
    if (!cur) cur = { start: pos, end: pos, lines: [] };
    if (c.removed) { cur.end += n; pos += n; } else cur.lines.push(...c.value);
  }
  if (cur) out.push(cur);
  return out;
}

function same(a: Hunk, b: Hunk): boolean {
  return a.start === b.start && a.end === b.end && a.lines.length === b.lines.length && a.lines.every((l, i) => l === b.lines[i]);
}

/**
 * Do two hunks from different sides touch? They do when their base ranges overlap, or when they start at
 * the same line and either of them is an insert: two inserts at one spot, or an insert at the start of a
 * replaced block, cannot be put in an order that is obviously right.
 */
export function clash(a: Hunk, b: Hunk): boolean {
  if (a.start < b.end && b.start < a.end) return true;
  return a.start === b.start && (a.start === a.end || b.start === b.end);
}

/**
 * Merge `theirs` and `current`, both edits of `base`. Line endings are read as \n. `lines` (on a
 * conflict) are the 1-based base lines where the two sides touch, for a plain "around line 12" note.
 */
export function mergeChange(base: string, theirs: string, current: string): MergeResult {
  const b = eol(base);
  const t = eol(theirs);
  const c = eol(current);
  if (t === c) return { ok: true, text: c };
  if (c === b) return { ok: true, text: t };
  if (t === b) return { ok: true, text: c };

  const baseLines = split(b);
  const A = hunksOf(baseLines, split(t));
  const B = hunksOf(baseLines, split(c));

  const keep: Hunk[] = [...B];
  const where: number[] = [];
  for (const a of A) {
    let dup = false;
    for (const x of B) {
      if (same(a, x)) { dup = true; continue; }
      if (clash(a, x)) where.push(Math.min(a.start, x.start) + 1);
    }
    if (!dup) keep.push(a);
  }
  if (where.length) {
    const lines = [...new Set(where)].sort((x, y) => x - y);
    return { ok: false, conflicts: lines.length, lines };
  }

  keep.sort((x, y) => x.start - y.start || x.end - y.end);
  const out: string[] = [];
  let pos = 0;
  for (const h of keep) {
    for (; pos < h.start; pos++) out.push(baseLines[pos]);
    out.push(...h.lines);
    pos = h.end;
  }
  for (; pos < baseLines.length; pos++) out.push(baseLines[pos]);
  return { ok: true, text: out.join('\n') };
}

/** How many lines a change adds and removes, for a "+12 −3" badge. */
export function changeSize(base: string, next: string): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const h of hunksOf(split(base), split(next))) {
    added += h.lines.length;
    removed += h.end - h.start;
  }
  return { added, removed };
}
