// A dirty document can still be exactly the script's result. On this pin,
// revisions advance on edits, undo/redo, file open and document switches.
// Bind the revision to the API object too: a reloaded engine starts afresh.
export function createBuildStamp() {
  let saved = null;
  return {
    get revision() { return saved?.revision ?? null; },
    remember(api, document) {
      saved = api && Number.isSafeInteger(document?.revision)
        ? { api, revision: document.revision } : null;
    },
    matches(api, document) {
      return !!saved && saved.api === api && saved.revision === document?.revision;
    },
    clear() { saved = null; },
  };
}
