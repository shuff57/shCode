// The editor's own Find (lib/editor-search.ts): Ctrl+F opens it instead of the browser's,
// in the editor and from elsewhere on the page; it counts matches; Replace works; a text box
// and a page with no editable editor keep the browser's find.
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><body><input id="other"><button id="btn">b</button><div id="host"></div></body>', { pretendToBeVisual: true });
const g = globalThis;
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'KeyboardEvent', 'MutationObserver', 'requestAnimationFrame', 'cancelAnimationFrame', 'getComputedStyle']) {
  try { g[k] = dom.window[k]; } catch { Object.defineProperty(g, k, { value: dom.window[k], configurable: true }); }
}
// jsdom has no layout: give the editor a box so it counts as on screen.
dom.window.Element.prototype.getBoundingClientRect = function () {
  return { x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 300, width: 400, height: 300, toJSON() {} };
};
dom.window.document.createRange = () => {
  const r = new dom.window.Range();
  r.getClientRects = () => [];
  r.getBoundingClientRect = () => ({ top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 });
  return r;
};

const { EditorView } = await import('@codemirror/view');
const { EditorState } = await import('@codemirror/state');
const { searchPanelOpen } = await import('@codemirror/search');
const { codeSearch } = await import('../lib/editor-search.ts');

const doc = 'let score = 0;\nscore = score + 1;\nconsole.log(score);\n';
const view = new EditorView({
  state: EditorState.create({ doc, extensions: [codeSearch()] }),
  parent: document.getElementById('host'),
});

const press = (target, key, opts = {}) => {
  const e = new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...opts });
  target.dispatchEvent(e);
  return e;
};
const panel = () => view.dom.querySelector('.cm-code-search');
const field = () => panel().querySelector('[main-field]');
const count = () => panel().querySelector('.cm-search-count').textContent;
const type = (input, text) => { input.value = text; input.dispatchEvent(new dom.window.Event('input', { bubbles: true })); };

// 1. Ctrl+F in a text box elsewhere is left to the browser.
let e = press(document.getElementById('other'), 'f', { ctrlKey: true });
assert.equal(e.defaultPrevented, false, 'Ctrl+F in a text box keeps the browser find');
assert.equal(searchPanelOpen(view.state), false);

// 2. Ctrl+F on the page (a button) opens the editor's Find and blocks the browser's.
e = press(document.getElementById('btn'), 'f', { ctrlKey: true });
assert.equal(e.defaultPrevented, true, 'Ctrl+F from the page is taken over');
assert.equal(searchPanelOpen(view.state), true, 'the editor Find opened');
assert.ok(panel(), 'our panel, not the stock one');
assert.equal(document.activeElement, field(), 'focus lands in the Find box');

// 3. Typing counts and selects the first match from the cursor.
type(field(), 'score');
assert.equal(count(), '1 of 4');
const sel = view.state.selection.main;
assert.equal(view.state.sliceDoc(sel.from, sel.to), 'score');
press(field(), 'Enter');
assert.equal(count(), '2 of 4', 'Enter goes to the next match');
press(field(), 'Enter', { shiftKey: true });
assert.equal(count(), '1 of 4', 'Shift+Enter goes back');
type(field(), 'nope');
assert.equal(count(), 'No matches');

// 4. Whole word and match case.
type(field(), 'Score');
assert.equal(count(), '1 of 4', 'case ignored by default');
panel().querySelector('[aria-label="Match upper and lower case"]').click();
assert.equal(count(), 'No matches', 'Aa matches case');
panel().querySelector('[aria-label="Match upper and lower case"]').click();
type(field(), 'sco');
assert.match(count(), /4/);
panel().querySelector('[aria-label="Whole words only"]').click();
assert.equal(count(), 'No matches', 'whole words only');
panel().querySelector('[aria-label="Whole words only"]').click();

// 5. Replace all.
type(field(), 'score');
const replaceRow = panel().querySelectorAll('.cm-search-row')[1];
assert.equal(replaceRow.hidden, true, 'replace starts hidden');
panel().querySelector('[aria-label="Show replace (Ctrl+H)"]').click();
assert.equal(replaceRow.hidden, false);
type(panel().querySelector('[aria-label="Replace with"]'), 'points');
panel().querySelector('[aria-label="Replace every match"]').click();
assert.equal(view.state.doc.toString(), doc.replaceAll('score', 'points'));
assert.equal(count(), 'No matches');

// 6. Esc closes and gives the editor focus back.
press(field(), 'Escape');
assert.equal(searchPanelOpen(view.state), false, 'Esc closes');

// 7. Ctrl+F with the cursor in the editor opens it too, filled with the selected word.
view.dispatch({ selection: { anchor: 4, head: 10 } }); // "points"
e = press(view.contentDOM, 'f', { ctrlKey: true });
assert.equal(e.defaultPrevented, true, 'Ctrl+F in the editor is taken over');
assert.equal(searchPanelOpen(view.state), true);
assert.equal(field().value, 'points', 'the selection fills the Find box');
press(field(), 'Escape');

// 8. With no editable editor on the page, Ctrl+F is the browser's again.
view.destroy();
e = press(document.getElementById('btn'), 'f', { ctrlKey: true });
assert.equal(e.defaultPrevented, false, 'no editor: browser find');

console.log('test-editor-search: ok');
