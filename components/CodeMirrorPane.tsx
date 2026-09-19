'use client';

import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript, javascriptLanguage } from '@codemirror/lang-javascript';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches } from '@codemirror/search';
import { tags as t } from '@lezer/highlight';

// Dracula palette — port of the CodeMirror 5 dracula theme used in public/moshion/editor.html.
const dracula = {
  bg: '#282a36',
  fg: '#f8f8f2',
  gutter: '#282a36',
  gutterFg: '#6272a4',
  activeLine: '#44475a55',
  selection: '#44475a',
  cursor: '#f8f8f0',
  comment: '#6272a4',
  cyan: '#8be9fd',
  green: '#50fa7b',
  orange: '#ffb86c',
  pink: '#ff79c6',
  purple: '#bd93f9',
  red: '#ff5555',
  yellow: '#f1fa8c',
};

const draculaHighlight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: dracula.comment, fontStyle: 'italic' },
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
    backgroundColor: '#44475a',
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
    exts.push(javascript());
    // Exclude `{`/`}` from auto-close (lang-javascript's own languageData
    // normally lists it -- see node_modules/@codemirror/lang-javascript's
    // `languageData.closeBrackets.brackets`). closeBrackets()'s "type over
    // the bracket I just inserted" check only matches when the cursor sits
    // on the SAME LINE as that inserted `}` (its internal bracketState
    // field drops the marker the moment the selection moves to another
    // line). But `indentWithTab`/Enter's own smart-split ALWAYS pushes an
    // auto-closed `}` onto its own new line the instant you press Enter
    // after `{` -- so for every multi-line block a student writes by hand
    // (which is every `if`/function/loop body in this course), the real
    // `}` they type later lands on a different line than the orphaned
    // auto-inserted one, the skip-over never fires, and both survive:
    // confirmed to leave one stray `}` per block, every time, at realistic
    // typing speed. (), [], quotes keep auto-close -- those are opened and
    // closed within one line/expression, where the same-line check holds.
    exts.push(javascriptLanguage.data.of({
      closeBrackets: { brackets: ['(', '[', "'", '"', '`'] },
    }));
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
}

export default function CodeMirrorPane({
  value,
  onChange,
  fileKey,
  language = 'javascript',
  readOnly = false,
}: CodeMirrorPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

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
        extensions: makeExtensions(onChange, language, readOnly),
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
