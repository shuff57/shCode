/**
 * Student draft storage.
 *
 * shCode keeps file contents in a zustand store, which is memory only: a
 * refresh, a crashed tab, or a laptop lid closing at the wrong moment throws
 * away everything a student has typed. On a no-retake assessment that costs
 * them the period, so every edit is mirrored into localStorage and restored
 * when the lesson opens again.
 *
 * Drafts are keyed per lesson, so the Group PA and the Test never overwrite
 * each other, and they are written only when a student actually edits
 * something -- opening a lesson and typing nothing leaves no draft behind.
 */

const VERSION = 'v1';

/**
 * @typedef {Object} Draft
 * @property {number} savedAt
 * @property {string} [currentFile]
 * @property {Record<string, string>} files
 */

/** @param {string} lessonId */
export function draftKey(lessonId) {
  return `shcode_draft_${VERSION}_${lessonId}`;
}

/**
 * localStorage is missing during server rendering, and throws outright in some
 * privacy modes. Every caller has to cope with getting nothing back.
 *
 * @returns {Storage | null}
 */
function storage() {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage || null;
  } catch {
    return null;
  }
}

/**
 * @param {string} lessonId
 * @returns {Draft | null}
 */
export function readDraft(lessonId) {
  const store = storage();
  if (!store || !lessonId) return null;
  try {
    const raw = store.getItem(draftKey(lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.files || typeof parsed.files !== 'object') return null;
    // Drop anything that is not a plain path -> text pair, so one corrupt
    // entry cannot take the editor down with it.
    /** @type {Record<string, string>} */
    const files = {};
    for (const [path, content] of Object.entries(parsed.files)) {
      if (typeof path === 'string' && typeof content === 'string') {
        files[path] = content;
      }
    }
    if (Object.keys(files).length === 0) return null;
    return {
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
      currentFile:
        typeof parsed.currentFile === 'string' ? parsed.currentFile : undefined,
      files,
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} lessonId
 * @param {Record<string, string>} files
 * @param {string} [currentFile]
 * @returns {{ savedAt: number | null, error: string | null }}
 */
export function writeDraft(lessonId, files, currentFile) {
  const store = storage();
  if (!store || !lessonId) return { savedAt: null, error: null };
  const savedAt = Date.now();
  try {
    store.setItem(
      draftKey(lessonId),
      JSON.stringify({ savedAt, currentFile, files })
    );
    return { savedAt, error: null };
  } catch (e) {
    // Quota exhaustion and privacy-mode refusals both land here. The edit is
    // already in memory, so the session keeps working -- the student just
    // needs to know a refresh will lose it.
    return {
      savedAt: null,
      error:
        'Could not save a backup of your work in this browser. Do not refresh the page.',
    };
  }
}

/** @param {string} lessonId */
export function clearDraft(lessonId) {
  const store = storage();
  if (!store || !lessonId) return;
  try {
    store.removeItem(draftKey(lessonId));
  } catch {
    /* nothing useful to do */
  }
}

/** @param {string} path */
function basename(path) {
  const cut = path.lastIndexOf('/');
  return cut < 0 ? path : path.slice(cut + 1);
}

/**
 * Overlay a saved draft on top of a lesson's starter files.
 *
 * The draft always wins for a path it holds. The extra basename pass covers
 * one specific way work could otherwise vanish: a student who dragged
 * script.js into a folder last session saved their work under
 * "folder/script.js", but the file tree comes back from the server flat, so
 * the editor would show starter content at "script.js" and their real work
 * would sit in an unreachable key. Matching on filename pulls it back. It only
 * ever fills a path the draft has no exact entry for, and only when exactly
 * one saved file could be meant, so it can never overwrite a real answer.
 *
 * @param {Record<string, string>} starter
 * @param {Draft | null} draft
 * @returns {Record<string, string>}
 */
export function mergeDraft(starter, draft) {
  const contents = { ...starter };
  if (!draft) return contents;

  for (const [path, content] of Object.entries(draft.files)) {
    contents[path] = content;
  }

  for (const path of Object.keys(starter)) {
    if (path in draft.files) continue;
    const name = basename(path);
    const candidates = Object.keys(draft.files).filter(
      (saved) => basename(saved) === name && !(saved in starter)
    );
    if (candidates.length === 1) {
      contents[path] = draft.files[candidates[0]];
    }
  }

  return contents;
}

/**
 * Read and apply whatever this browser has saved for a lesson.
 *
 * @param {string} lessonId
 * @param {Record<string, string>} starter
 * @param {string} [starterCurrentFile]
 * @returns {{ contents: Record<string, string>, currentFile: string | undefined, restoredAt: number | null }}
 */
export function restoreDraft(lessonId, starter, starterCurrentFile) {
  const draft = readDraft(lessonId);
  const contents = mergeDraft(starter, draft);
  // Only reopen the file they were last in if it is still a real file.
  const currentFile =
    draft && draft.currentFile && draft.currentFile in contents
      ? draft.currentFile
      : starterCurrentFile;
  return {
    contents,
    currentFile,
    restoredAt: draft ? draft.savedAt || 0 : null,
  };
}
