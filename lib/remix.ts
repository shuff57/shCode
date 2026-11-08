// Remix (2026-11-07): copy a built-in or shared texture or sound into the
// student's own library and open it in the editor that makes it, ready to
// change. The editors read `?edit=<name>` on load (TextureEditor, SoundMixer)
// and open that saved item, so Remix needs nothing but a URL.

import type { LibraryKind } from './moshion-storage';

export function editorUrl(kind: LibraryKind, name: string): string {
  return (kind === 'texture' ? '/textures/' : '/sound/') + '?edit=' + encodeURIComponent(name);
}

/**
 * Open the editor on `name`. From the Library page itself it goes in the same
 * tab; anywhere else (a lesson's or the sandbox's Library tab) it opens a new
 * tab so the student does not lose the lesson. The new tab is opened BEFORE
 * any await by the caller (`prepareTab`), or a popup blocker refuses it.
 */
export function prepareTab(): Window | null {
  if (typeof window === 'undefined' || window.location.pathname.startsWith('/library')) return null;
  return window.open('', '_blank');
}

export function openEditor(kind: LibraryKind, name: string, tab: Window | null): void {
  const url = editorUrl(kind, name);
  if (tab && !tab.closed) tab.location.href = url;
  else window.location.href = url;
}

/** The `?edit=` name in the current URL, or null. */
export function editParam(): string | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('edit');
  return v && /^[A-Za-z][A-Za-z0-9_]*$/.test(v) ? v : null;
}
