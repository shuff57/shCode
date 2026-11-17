// Find (and replace) inside the code editor, opened with Ctrl+F / Cmd+F instead of the
// browser's own find bar. Built on @codemirror/search's state and commands; only the panel
// is ours, so it can show "3 of 7", use the course's words and wear the editor's theme.
//
// Ctrl+F works two ways:
//   1. With the cursor in an editor, the editor's own keymap opens the panel.
//   2. With the focus anywhere else on a page that shows an editable code editor (the
//      console, a button, the page itself), a window listener opens it on that editor:
//      the one used last if it is still on screen, else the first one that is.
// A page with no editable editor (a reading page, whose samples are read-only) keeps the
// browser's find, which is what a reader wants there. So does Ctrl+F typed in a text box.

import { EditorView, ViewPlugin, keymap, runScopeHandlers, type Panel, type ViewUpdate } from '@codemirror/view';
import { EditorSelection, type Extension } from '@codemirror/state';
import {
  SearchQuery,
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  openSearchPanel,
  replaceAll,
  replaceNext,
  search,
  searchKeymap,
  setSearchQuery,
} from '@codemirror/search';

/** Counting stops here; a bigger number reads as "1000+". */
const COUNT_CAP = 1000;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

const panels = new WeakMap<EditorView, CodeSearchPanel>();

class CodeSearchPanel implements Panel {
  dom: HTMLElement;
  top = true;
  private view: EditorView;
  private query: SearchQuery;
  private findField: HTMLInputElement;
  private replaceField: HTMLInputElement;
  private count: HTMLElement;
  private caseBtn: HTMLButtonElement;
  private wordBtn: HTMLButtonElement;
  private replaceToggle: HTMLButtonElement | null = null;
  private replaceRow: HTMLElement | null = null;

  constructor(view: EditorView) {
    this.view = view;
    this.query = getSearchQuery(view.state);
    const readOnly = view.state.readOnly;

    this.findField = el('input', {
      type: 'text',
      class: 'cm-textfield',
      placeholder: 'Find in your code',
      'aria-label': 'Find in your code',
      'main-field': 'true',
      spellcheck: 'false',
      autocomplete: 'off',
    });
    this.findField.value = this.query.search;
    this.findField.addEventListener('input', () => this.commit(true));

    this.replaceField = el('input', {
      type: 'text',
      class: 'cm-textfield',
      placeholder: 'Replace with',
      'aria-label': 'Replace with',
      spellcheck: 'false',
      autocomplete: 'off',
    });
    this.replaceField.value = this.query.replace;
    this.replaceField.addEventListener('input', () => this.commit(false));

    this.count = el('span', { class: 'cm-search-count', 'aria-live': 'polite' });

    const button = (label: string, title: string, onClick: () => void, extra: Record<string, string> = {}) => {
      const b = el('button', { type: 'button', class: 'cm-search-btn', title, 'aria-label': title, ...extra }, [label]);
      b.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the field
      b.addEventListener('click', onClick);
      return b;
    };
    const toggle = (label: string, title: string, on: boolean, flip: () => void) =>
      button(label, title, flip, { 'aria-pressed': String(on) });

    this.caseBtn = toggle('Aa', 'Match upper and lower case', this.query.caseSensitive, () => {
      this.caseBtn.setAttribute('aria-pressed', String(this.caseBtn.getAttribute('aria-pressed') !== 'true'));
      this.commit(true);
    });
    this.wordBtn = toggle('Word', 'Whole words only', this.query.wholeWord, () => {
      this.wordBtn.setAttribute('aria-pressed', String(this.wordBtn.getAttribute('aria-pressed') !== 'true'));
      this.commit(true);
    });

    const findRow = el('div', { class: 'cm-search-row' }, [
      this.findField,
      this.count,
      button('↑', 'Previous match (Shift+Enter)', () => findPrevious(view)),
      button('↓', 'Next match (Enter)', () => findNext(view)),
      this.caseBtn,
      this.wordBtn,
    ]);

    if (!readOnly) {
      this.replaceToggle = toggle('Replace', 'Show replace (Ctrl+H)', false, () => this.showReplace(this.replaceRow!.hidden));
      findRow.append(this.replaceToggle);
      this.replaceRow = el('div', { class: 'cm-search-row' }, [
        this.replaceField,
        button('Replace', 'Replace this match (Enter)', () => replaceNext(view), { class: 'cm-search-btn cm-search-wide' }),
        button('Replace all', 'Replace every match', () => replaceAll(view), { class: 'cm-search-btn cm-search-wide' }),
      ]);
      this.replaceRow.hidden = true;
    }

    findRow.append(button('×', 'Close (Esc)', () => closeSearchPanel(view), { class: 'cm-search-btn cm-search-close' }));

    this.dom = el('div', { class: 'cm-search cm-code-search', role: 'search' }, this.replaceRow ? [findRow, this.replaceRow] : [findRow]);
    this.dom.addEventListener('keydown', (e) => this.keydown(e));
    panels.set(view, this);
    this.updateCount();
  }

  mount() {
    this.findField.focus();
    this.findField.select();
  }

  destroy() {
    panels.delete(this.view);
  }

  showReplace(on: boolean) {
    if (!this.replaceRow || !this.replaceToggle) return;
    this.replaceRow.hidden = !on;
    this.replaceToggle.setAttribute('aria-pressed', String(on));
    if (!on && this.dom.contains(document.activeElement) && document.activeElement === this.replaceField) {
      this.findField.focus();
    }
  }

  focusReplace() {
    this.showReplace(true);
    if (this.findField.value) this.replaceField.focus();
  }

  private pressed(b: HTMLButtonElement) {
    return b.getAttribute('aria-pressed') === 'true';
  }

  /** Send the fields to the search state; `jump` selects the first match from the cursor on. */
  private commit(jump: boolean) {
    const query = new SearchQuery({
      search: this.findField.value,
      caseSensitive: this.pressed(this.caseBtn),
      wholeWord: this.pressed(this.wordBtn),
      replace: this.replaceField.value,
    });
    if (query.eq(this.query)) return;
    this.query = query;
    const effects = [setSearchQuery.of(query)];
    const match = jump && query.valid && query.search ? this.firstFrom(query, this.view.state.selection.main.from) : null;
    if (match) {
      this.view.dispatch({
        effects: [...effects, EditorView.scrollIntoView(match.from, { y: 'center' })],
        selection: EditorSelection.single(match.from, match.to),
        userEvent: 'select.search',
      });
    } else {
      this.view.dispatch({ effects });
    }
  }

  /** The first match starting at or after `pos`, wrapping round to the top. */
  private firstFrom(query: SearchQuery, pos: number) {
    const state = this.view.state;
    const after = query.getCursor(state, pos).next();
    if (!after.done) return after.value;
    const wrapped = query.getCursor(state, 0, pos).next();
    return wrapped.done ? null : wrapped.value;
  }

  private keydown(e: KeyboardEvent) {
    if (runScopeHandlers(this.view, e, 'search-panel')) {
      e.preventDefault();
    } else if (e.key === 'Enter' && e.target === this.findField) {
      e.preventDefault();
      (e.shiftKey ? findPrevious : findNext)(this.view);
    } else if (e.key === 'Enter' && e.target === this.replaceField) {
      e.preventDefault();
      replaceNext(this.view);
    }
  }

  update(update: ViewUpdate) {
    let queryChanged = false;
    for (const tr of update.transactions) {
      for (const effect of tr.effects) {
        if (effect.is(setSearchQuery) && !effect.value.eq(this.query)) {
          this.setQuery(effect.value);
          queryChanged = true;
        } else if (effect.is(setSearchQuery)) {
          queryChanged = true;
        }
      }
    }
    if (queryChanged || update.docChanged || update.selectionSet) this.updateCount();
  }

  private setQuery(query: SearchQuery) {
    this.query = query;
    this.findField.value = query.search;
    this.replaceField.value = query.replace;
    this.caseBtn.setAttribute('aria-pressed', String(query.caseSensitive));
    this.wordBtn.setAttribute('aria-pressed', String(query.wholeWord));
  }

  private updateCount() {
    const query = this.query;
    this.count.classList.remove('is-none');
    if (!query.search) {
      this.count.textContent = '';
      return;
    }
    if (!query.valid) {
      this.count.textContent = 'No matches';
      this.count.classList.add('is-none');
      return;
    }
    const sel = this.view.state.selection.main;
    let total = 0;
    let current = 0;
    const cursor = query.getCursor(this.view.state);
    for (let m = cursor.next(); !m.done; m = cursor.next()) {
      total += 1;
      if (m.value.from === sel.from && m.value.to === sel.to) current = total;
      if (total >= COUNT_CAP) break;
    }
    if (total === 0) {
      this.count.textContent = 'No matches';
      this.count.classList.add('is-none');
    } else {
      const shown = total >= COUNT_CAP ? `${COUNT_CAP}+` : String(total);
      this.count.textContent = current ? `${current} of ${shown}` : `${shown} ${total === 1 ? 'match' : 'matches'}`;
    }
  }
}

function openReplace(view: EditorView): boolean {
  if (view.state.readOnly) return false;
  openSearchPanel(view);
  panels.get(view)?.focusReplace();
  return true;
}

const searchTheme = EditorView.theme({
  '.cm-panels': {
    backgroundColor: 'var(--c-deep)',
    color: 'var(--c-fg)',
  },
  '.cm-panels.cm-panels-top': { borderBottom: '1px solid var(--c-line)' },
  '.cm-panel.cm-code-search': {
    padding: '6px 8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    fontFamily: 'inherit',
    fontSize: '13px',
  },
  '.cm-search-row': {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '4px',
  },
  '.cm-search-row[hidden]': { display: 'none' },
  '.cm-code-search .cm-textfield': {
    flex: '1 1 160px',
    minWidth: '0',
    maxWidth: '320px',
    margin: '0',
    padding: '4px 8px',
    font: "13px 'Fira Code', 'Consolas', monospace",
    color: 'var(--c-fg)',
    backgroundColor: 'var(--c-bg)',
    border: '1px solid var(--c-line)',
    borderRadius: '4px',
    outline: 'none',
  },
  '.cm-code-search .cm-textfield:focus': { borderColor: 'var(--brand)' },
  '.cm-search-count': {
    minWidth: '76px',
    color: 'var(--c-meta)',
    fontSize: '12px',
    whiteSpace: 'nowrap',
    padding: '0 4px',
  },
  '.cm-search-count.is-none': { color: 'var(--c-orange)' },
  '.cm-search-btn': {
    font: 'inherit',
    fontSize: '12px',
    minWidth: '28px',
    height: '26px',
    padding: '0 8px',
    margin: '0',
    color: 'var(--c-fg)',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  '.cm-search-btn:hover': { backgroundColor: 'var(--c-line)' },
  '.cm-search-btn:focus-visible': { outline: '2px solid var(--c-cyan)', outlineOffset: '1px' },
  '.cm-search-btn[aria-pressed=true]': {
    backgroundColor: 'color-mix(in srgb, var(--brand) 25%, transparent)',
    borderColor: 'var(--brand)',
  },
  '.cm-search-wide': { border: '1px solid var(--c-line)' },
  '.cm-search-close': { marginLeft: 'auto', fontSize: '16px' },
  '.cm-searchMatch': {
    backgroundColor: 'color-mix(in srgb, var(--c-yellow) 28%, transparent)',
    outline: '1px solid color-mix(in srgb, var(--c-yellow) 55%, transparent)',
  },
  '.cm-searchMatch.cm-searchMatch-selected': {
    backgroundColor: 'color-mix(in srgb, var(--c-orange) 55%, transparent)',
    outline: '1px solid var(--c-orange)',
  },
});

// --- Ctrl+F from outside the editor ---------------------------------------------------

const editable = new Set<EditorView>();
let lastUsed: EditorView | null = null;
let listening = false;

function onScreen(view: EditorView): boolean {
  if (!view.dom.isConnected) return false;
  const r = view.dom.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
}

function isFindKey(e: KeyboardEvent): boolean {
  const mod = /Mac|iPhone|iPad/.test(navigator.platform) ? e.metaKey : e.ctrlKey;
  return mod && !e.altKey && e.key.toLowerCase() === 'f';
}

function onWindowKey(e: KeyboardEvent) {
  if (e.defaultPrevented || !isFindKey(e)) return;
  const target = e.target as Element | null;
  // Inside an editor its own keymap answers (a read-only one leaves the browser's find).
  if (target?.closest?.('.cm-editor')) return;
  // A text box elsewhere on the page (a chat message, a name) is not the code.
  if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
  const views = [...editable].filter(onScreen);
  if (views.length === 0) return;
  const view = lastUsed && views.includes(lastUsed) ? lastUsed : views[0];
  e.preventDefault();
  openSearchPanel(view);
}

const registry = ViewPlugin.fromClass(class {
  view: EditorView;
  constructor(view: EditorView) {
    this.view = view;
    editable.add(view);
    if (!listening && typeof window !== 'undefined') {
      window.addEventListener('keydown', onWindowKey);
      listening = true;
    }
  }
  update(u: ViewUpdate) {
    if (u.focusChanged && u.view.hasFocus) lastUsed = u.view;
  }
  destroy() {
    editable.delete(this.view);
    if (lastUsed === this.view) lastUsed = null;
    if (editable.size === 0 && listening) {
      window.removeEventListener('keydown', onWindowKey);
      listening = false;
    }
  }
});

/**
 * Find and replace for an editable editor pane, which also answers Ctrl+F pressed anywhere
 * on the page. Read-only panes (reading samples) are left to the browser's own find.
 */
export function codeSearch(): Extension {
  return [
    search({ top: true, createPanel: (view) => new CodeSearchPanel(view) }),
    // Mod-d is already bound by the pane (selectNextOccurrence); keep one binding.
    keymap.of(searchKeymap.filter((b) => b.key !== 'Mod-d')),
    keymap.of([{ key: 'Mod-h', run: openReplace, scope: 'editor search-panel', preventDefault: true }]),
    searchTheme,
    registry,
  ];
}
