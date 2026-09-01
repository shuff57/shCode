// Where a student's imported chart lands when they open part two of a split
// assignment -- a lesson carrying `planFrom`.
//
// This used to be one hardcoded sentence lifted from 1.5.31's starter:
//
//   const ANCHOR = '//         Do this BEFORE you write any JavaScript.';
//
// 1.6.2 reused `planFrom` with its own STEP 1 wording, so the literal never
// matched and seeding fell through to "append at the end of the file". That
// put the pseudocode BELOW the student's stored comparison, where its
// `// IF` and `// ELSE` lines satisfied 1.6.2's r8 by themselves and credited
// step 5 for work nobody had done. The lesson looked fine and the check was
// hollow -- nothing in the starter, the lesson.json or the component said the
// two were coupled.
//
// Matching the STEP 1 comment BLOCK rather than one of its sentences fixes
// 1.6.2, leaves 1.5.31 seeding exactly where it already did, and lets a third
// `planFrom` lesson word its own step 1 however it likes.
//
// scripts/test-plan-seed.mjs drives the real starters through this.

/**
 * Byte offset just past the STEP 1 comment block: the `// STEP 1` line plus
 * every `//` continuation line beneath it. Null when there is no such block.
 *
 * Expects LF-normalised text, which is what lib/store.ts puts in
 * `fileContents` -- the starters themselves are CRLF on disk.
 */
export function step1BlockEnd(src: string): number | null {
  const lines = src.split('\n');
  const start = lines.findIndex((l) => /^\s*\/\/\s*STEP\s+1\b/i.test(l));
  if (start === -1) return null;
  let end = start;
  while (end + 1 < lines.length && /^\s*\/\//.test(lines[end + 1])) end += 1;
  return lines.slice(0, end + 1).join('\n').length;
}

/**
 * `current` with `block` inserted under its STEP 1 comment.
 *
 * Falls back to appending when there is no STEP 1 block to hang it on. That
 * is still better than dropping the student's chart on the floor, but it is
 * the case that caused the r8 hole, so the gate treats a `planFrom` lesson
 * with no STEP 1 block as a lesson-authoring failure rather than a quiet
 * degradation.
 */
export function seedPlan(current: string, block: string): string {
  const at = step1BlockEnd(current);
  if (at === null) return current + '\n\n' + block + '\n';
  return current.slice(0, at) + '\n\n' + block + current.slice(at);
}
