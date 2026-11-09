'use client';

import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { Compartment, EditorState, type Extension } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput, HighlightStyle, syntaxHighlighting, foldGutter, foldKeymap } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches } from '@codemirror/search';
import { jsAutocomplete } from '../lib/editor-completions';
import { taskCommentFold } from '../lib/editor-task-fold';
import type { LabTaskScenario } from '../lib/lab-task-scenario';
import { tags as t } from '@lezer/highlight';

// Dracula palette — port of the CodeMirror 5 dracula theme used in public/moshion/editor.html.
const dracula = {
  bg: 'var(--c-bg)',
  fg: 'var(--c-fg)',
  gutter: 'var(--c-bg)',
  gutterFg: 'var(--c-dim)',
  activeLine: 'color-mix(in srgb, var(--c-line) 33.3333%, transparent)',
  selection: 'var(--c-line)',
  cursor: 'var(--x-f8f8f0)',
  comment: 'var(--c-dim)',
  cyan: 'var(--c-cyan)',
  green: 'var(--c-green)',
  orange: 'var(--c-orange)',
  pink: 'var(--c-pink)',
  purple: 'var(--c-purple)',
  red: 'var(--c-red)',
  yellow: 'var(--c-yellow)',
};

const draculaHighlight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: 'var(--x-a7b5df)', fontStyle: 'normal' },
  { tag: [t.keyword, t.operatorKeyword, t.modifier, t.controlKeyword], color: dracula.pink },
  { tag: [t.string, t.special(t.string), t.regexp], color: dracula.yellow },
  { tag: [t.number, t.bool, t.null, t.atom], color: dracula.purple },
  { tag: [t.function(t.variableName), t.function(t.propertyName), t.macroName], color: dracula.green },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: dracula.green },
  { tag: [t.variableName, t.propertyName], color: dracula.fg },
  { tag: [t.className, t.typeName, t.namespace], color: dracula.cyan, fontStyle: 'italic' },
  { tag: [t.tagName, t.angleBracket], color: dracula.pink },
  { tag: [t.attributeName], color: dracula.green },
  { tag: [t.attributeValue], color: dracula.yellow },
  { tag: [t.meta, t.documentMeta], color: dracula.comment },
  { tag: [t.punctuation, t.separator, t.bracket], color: dracula.fg },
  { tag: [t.operator], color: dracula.pink },
  { tag: t.labelName, color: dracula.orange },
  { tag: t.self, color: dracula.purple, fontStyle: 'italic' },
  { tag: t.invalid, color: dracula.red },
]);

const darkTheme = EditorView.theme({
  // lineWrapping defaults to overflow-wrap: anywhere, which splits a word in half at phone width.
  // Wrap at spaces and only break a single over-long word when it cannot fit at all.
  '.cm-lineWrapping': { wordBreak: 'normal', overflowWrap: 'break-word' },
  '&': {
    backgroundColor: dracula.bg,
    color: dracula.fg,
    height: '100%',
    fontSize: '14px',
  },
  '.cm-content': {
    fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
    caretColor: dracula.cursor,
    padding: '8px 0',
  },
  '.cm-gutters': {
    backgroundColor: dracula.gutter,
    color: dracula.gutterFg,
    border: 'none',
    paddingRight: '8px',
  },
  '.cm-foldGutter .cm-gutterElement': {
    cursor: 'pointer',
    color: dracula.gutterFg,
    padding: '0 2px',
  },
  '.cm-foldGutter .cm-gutterElement:hover': {
    color: dracula.fg,
  },
  '.cm-foldPlaceholder': {
    backgroundColor: dracula.selection,
    color: dracula.fg,
    border: `1px solid ${dracula.purple}`,
    borderRadius: '3px',
    padding: '0 6px',
  },
  '.cm-taskCommentFold': {
    appearance: 'none',
    font: 'inherit',
    color: 'var(--x-a7b5df)',
    background: 'var(--c-bg)',
    border: '1px dashed var(--c-line)',
    borderRadius: '4px',
    padding: '2px 6px',
    maxWidth: '100%',
    whiteSpace: 'normal',
    textAlign: 'left',
    cursor: 'pointer',
  },
  '.cm-taskCommentFold:hover, .cm-taskCommentFold:focus-visible': {
    color: 'var(--c-cyan)',
    background: 'var(--c-line)',
    outline: '2px solid var(--c-cyan)',
    outlineOffset: '2px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: dracula.activeLine,
    color: dracula.fg,
  },
  '.cm-activeLine': {
    backgroundColor: dracula.activeLine,
  },
  '.cm-selectionMatch': {
    backgroundColor: dracula.selection,
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: dracula.selection,
  },
  '.cm-cursor': {
    borderLeftColor: dracula.cursor,
  },
  '.cm-matchingBracket': {
    backgroundColor: 'var(--c-line)',
    outline: `1px solid ${dracula.purple}`,
  },
  // Issue #22: a student saw a ghosted, offset second copy of the editor's
  // own syntax-highlighted text while scrolling. CM6's .cm-scroller doesn't
  // promote itself to its own GPU compositing layer by default, which is
  // the known-vulnerable shape for a Chromium/Windows tearing bug where a
  // scrollable region shares a stale raster tile with the page for one
  // frame during fast scroll. Issue #40 was the same bug's mirror image:
  // `contain: paint` clips repaint invalidation to the layer's own bounds,
  // so on a reading page with several of these panes the layer occasionally
  // missed the page-scroll repaint and sat frozen for a frame instead of
  // tearing. `will-change` gives the browser the same "promote to its own
  // layer" hint without that repaint-isolation side effect.
  '.cm-scroller': {
    willChange: 'transform',
  },
}, { dark: true });

function makeExtensions(
  onChange: (doc: string) => void,
  language: 'javascript' | 'plaintext',
  readOnly: boolean,
) {
  const exts = [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    history(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    highlightSelectionMatches(),
    syntaxHighlighting(draculaHighlight),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab,
    ]),
    darkTheme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChange(update.state.doc.toString());
      }
    }),
    EditorView.lineWrapping,
    EditorState.tabSize.of(2),
  ];

  if (language === 'javascript') {
    // `{` auto-closes like ( [ and quotes (lang-javascript's own languageData). It was excluded
    // from 2026-09-13 to #72 (2026-11-06): Enter after `{` puts the `}` on its own line, so a
    // student who also types their own `}` later gets a stray one, because closeBrackets only
    // types over a `}` on the cursor's own line. Students asked for it back; the stray brace is
    // the known cost.
    exts.push(javascript());
  }

  // #52: a student's own switch, loop or function can be folded to one line (the arrow in the
  // gutter, or Ctrl+Shift+[ and ]). Editable panes only: a reading page carries many small
  // read-only samples, and an arrow on every block there is noise.
  if (language === 'javascript' && !readOnly) {
    exts.push(foldGutter({ openText: '\u25BE', closedText: '\u25B8' }), keymap.of(foldKeymap));
    // #80: suggestions for the moSHion API, JavaScript built-ins and the student's own
    // names (lib/editor-completions.ts). Tab still indents; Enter or a click takes one.
    exts.push(jsAutocomplete());
  }

  if (readOnly) {
    exts.push(EditorState.readOnly.of(true));
  }

  return exts;
}

export interface CodeMirrorPaneProps {
  value: string;
  onChange: (doc: string) => void;
  /** Used as React key — editor re-instantiates when this changes. */
  fileKey: string;
  language?: 'javascript' | 'plaintext';
  readOnly?: boolean;
  /**
   * Extra extensions switched on and off WITHOUT remounting the editor: Code
   * together's shared-editing extension (lib/live-doc.ts). Added and removed
   * through a Compartment, so the text, cursor and undo history stay put.
   */
  collab?: Extension | null;
  /** Authored task-card scenario; folding never modifies the document. */
  taskComment?: LabTaskScenario | null;
}

export default function CodeMirrorPane({
  value,
  onChange,
  fileKey,
  language = 'javascript',
  readOnly = false,
  collab = null,
  taskComment = null,
}: CodeMirrorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const collabSlot = useRef(new Compartment());
  const collabRef = useRef<Extension | null>(collab);
  collabRef.current = collab;

  // Create or recreate editor when fileKey changes.
  useEffect(() => {
    if (!containerRef.current) return;

    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: value,
        extensions: [makeExtensions(onChange, language, readOnly), taskCommentFold(taskComment), collabSlot.current.of(collabRef.current ?? [])],
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate only when the active file (key) changes; onChange/language/readOnly
    // are intentionally excluded — they're stable for a given mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileKey]);

  // Sync store-driven content changes (restore commit / restore version /
  // upload) back into the CodeMirror doc. Skip when the change originated
  // from the editor itself to avoid clobbering the cursor on every keystroke.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const next = value ?? '';
    if (view.state.doc.toString() === next) return;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: next },
    });
  }, [value]);

  // Code together on or off: swap the Compartment's contents in place.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: collabSlot.current.reconfigure(collab ?? []) });
  }, [collab]);

  // Insert-at-cursor: the image library dispatches 'shcode:insert' with the
  // public path of a chosen upload. Goes through view.dispatch rather than
  // rewriting `value`, so it lands at the caret, replaces a selection if
  // there is one, and joins the undo history as a single step.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { text?: string };
      const view = viewRef.current;
      if (!view || !detail?.text) return;
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: detail.text },
        selection: { anchor: from + detail.text.length },
        scrollIntoView: true,
      });
      view.focus();
    }
    window.addEventListener('shcode:insert', handler);
    return () => window.removeEventListener('shcode:insert', handler);
  }, []);

  // Jump-to-line: Console click dispatches 'shcode:goto-line' once the right
  // file is current. We position the selection and scroll the line into view.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { file: string; line: number; col?: number };
      if (!detail || detail.file !== fileKey) return;
      const view = viewRef.current;
      if (!view) return;
      const doc = view.state.doc;
      const lineNum = Math.min(Math.max(1, detail.line), doc.lines);
      const docLine = doc.line(lineNum);
      const col = Math.max(1, detail.col ?? 1);
      const pos = Math.min(docLine.from + col - 1, docLine.to);
      view.dispatch({
        selection: { anchor: pos },
        effects: EditorView.scrollIntoView(pos, { y: 'center' }),
      });
      view.focus();
    }
    window.addEventListener('shcode:goto-line', handler);
    return () => window.removeEventListener('shcode:goto-line', handler);
  }, [fileKey]);

  return <div ref={containerRef} style={{ height: '100%', minHeight: 0 }} />;
}
