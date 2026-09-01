// The dev server's half of /api/lesson-solution, lifted out of server.js so a
// test can call the real thing instead of a copy of it.
//
// There are two implementations of this endpoint and they have drifted once
// already: the Pages Function (functions/api/lesson-solution/[id].ts) serves
// the generated map and handles both authoring forms, while server.js read
// solution.js and nothing else, so every lesson using the solution/ DIRECTORY
// form 404'd locally while working in production. Nothing compared them, so it
// went unnoticed until someone opened one of those lessons in a browser.
//
// scripts/test-lesson-solution-parity.mjs is that comparison. It imports this
// module and the compiled Pages Function and asserts they answer identically
// for every lesson, which is only meaningful because server.js imports this
// module too rather than keeping its own copy.

import fs from 'fs/promises';
import path from 'path';

// Every lesson id is a directory name under lessons/, and all 519 are
// [A-Za-z0-9_-]. No dots, so `..` cannot pass at all -- and a lesson id is the
// only client-supplied value these routes ever join onto a path.
const LESSON_ID = /^[A-Za-z0-9_-]+$/;

/**
 * The absolute path of a lesson directory, or null if `id` is not a valid
 * lesson id or does not resolve inside lessons/.
 *
 * The realpath comparison is defence in depth behind the charset check: it is
 * what still holds if someone authors an id with a dot in it and widens
 * LESSON_ID to match.
 */
export async function resolveLessonDir(id, lessonsRoot) {
  if (typeof id !== 'string' || !LESSON_ID.test(id)) return null;
  let root;
  try {
    root = await fs.realpath(lessonsRoot);
  } catch {
    return null;
  }
  let dir;
  try {
    dir = await fs.realpath(path.join(root, id));
  } catch {
    return null; // no such lesson
  }
  return dir === root || dir.startsWith(root + path.sep) ? dir : null;
}

// Recurse, because the generator keys every file by its path relative to
// solution/ rather than by basename. A flat read would diverge the moment
// someone nested one.
async function readDirForm(dir, prefix = '') {
  const out = {};
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    // A symlink inside solution/ would read whatever it points at, which is
    // resolveLessonDir's containment check defeated from the inside. No lesson
    // uses one, so skip rather than resolve-and-compare.
    if (entry.isSymbolicLink()) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(out, await readDirForm(path.join(dir, entry.name), rel));
    else if (entry.isFile()) out[rel] = await fs.readFile(path.join(dir, entry.name), 'utf8');
  }
  return out;
}

/**
 * `{ files, solution }` for a lesson, or null when it has no reference answer.
 * Mirrors the Pages Function's response body exactly.
 */
export async function readLessonSolution(id, lessonsRoot) {
  const lessonDir = await resolveLessonDir(id, lessonsRoot);
  if (!lessonDir) return null;

  let files = null;
  try {
    files = await readDirForm(path.join(lessonDir, 'solution'));
    if (Object.keys(files).length === 0) files = null;
  } catch {
    /* no solution/ directory -- fall through to the single-file form */
  }

  if (!files) {
    try {
      files = { 'script.js': await fs.readFile(path.join(lessonDir, 'solution.js'), 'utf8') };
    } catch {
      return null;
    }
  }

  // Same fallback as the Pages Function: a solution whose code file is not
  // script.js still populates the legacy single-string field.
  const solution = files['script.js'] ?? files[Object.keys(files).sort()[0]];
  return { files, solution };
}
