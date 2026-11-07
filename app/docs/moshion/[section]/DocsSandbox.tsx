'use client';

import { useEffect, useRef, useState } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { tags as t } from '@lezer/highlight';
import { jsAutocomplete } from '../../../../lib/editor-completions';
import MoshionPreview from '../../../../components/MoshionPreview';
import ReshapeScriptPreview from '../../../../components/ReshapeScriptPreview';

// Dracula palette (mirrors CodeEditor.tsx — kept local to avoid coupling)
const dracula = {
  bg: 'var(--c-bg)', fg: 'var(--c-fg)', gutter: 'var(--c-bg)', gutterFg: 'var(--c-comment)',
  activeLine: 'color-mix(in srgb, var(--c-line) 33.3333%, transparent)', selection: 'var(--c-line)', cursor: 'var(--x-f8f8f0)',
  comment: 'var(--c-comment)', cyan: 'var(--c-cyan)', green: 'var(--c-green)',
  orange: 'var(--c-orange)', pink: 'var(--c-pink)', purple: 'var(--c-purple)',
  red: 'var(--c-red)', yellow: 'var(--c-yellow)',
};

const highlight = HighlightStyle.define([
  { tag: [t.comment, t.lineComment, t.blockComment], color: dracula.comment, fontStyle: 'italic' },
  { tag: [t.keyword, t.operatorKeyword, t.controlKeyword], color: dracula.pink },
  { tag: [t.string, t.regexp], color: dracula.yellow },
  { tag: [t.number, t.bool, t.null, t.atom], color: dracula.purple },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: dracula.green },
  { tag: [t.definition(t.variableName), t.definition(t.propertyName)], color: dracula.green },
  { tag: [t.variableName, t.propertyName], color: dracula.fg },
  { tag: [t.className, t.typeName], color: dracula.cyan, fontStyle: 'italic' },
  { tag: [t.operator], color: dracula.pink },
]);

const theme = EditorView.theme({
  '&': { backgroundColor: dracula.bg, color: dracula.fg, height: '100%', fontSize: '13px' },
  '.cm-content': { fontFamily: "'Fira Code', Consolas, monospace", caretColor: dracula.cursor, padding: '8px 0' },
  '.cm-gutters': { backgroundColor: dracula.gutter, color: dracula.gutterFg, border: 'none' },
  '.cm-activeLine': { backgroundColor: dracula.activeLine },
  '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: dracula.selection },
  '.cm-cursor': { borderLeftColor: dracula.cursor },
}, { dark: true });

export default function DocsSandbox({
  initialCode,
  preview,
}: {
  initialCode: string;
  /** Required on purpose — there is no safe default. A defaulted 'moshion'
   *  here is what silently piped the JSCAD docs into the moSHion runner, where
   *  every example died on `require is not defined`. Leave it required so the
   *  compiler catches the next caller that forgets. */
  preview: 'moshion' | 'reshape';
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [code, setCode] = useState(initialCode);
  const [runKey, setRunKey] = useState(0);

  // Reset state when the active page changes (new initialCode prop)
  useEffect(() => {
    setCode(initialCode);
    setRunKey(0);
    if (viewRef.current) {
      const view = viewRef.current;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: initialCode },
      });
    }
  }, [initialCode]);

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: initialCode,
        extensions: [
          lineNumbers(),
          highlightActiveLine(),
          bracketMatching(),
          closeBrackets(),
          indentOnInput(),
          javascript(),
          jsAutocomplete(), // #80, same suggestions as every other editor
          syntaxHighlighting(highlight),
          keymap.of([...closeBracketsKeymap, ...defaultKeymap, indentWithTab]),
          theme,
          EditorView.updateListener.of((u) => {
            if (u.docChanged) setCode(u.state.doc.toString());
          }),
          EditorView.lineWrapping,
          EditorState.tabSize.of(2),
        ],
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Mount once; `initialCode` updates are handled by the effect above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = () => {
    setRunKey((k) => k + 1);
  };
  const reset = () => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: initialCode } });
    setCode(initialCode);
    setRunKey(0);
  };

  return (
    <div className="docs-sandbox">
      <div className="docs-sandbox-pane docs-sandbox-editor-pane">
        <div className="docs-sandbox-toolbar">
          <button type="button" className="docs-sandbox-run" onClick={run}>▶ Run</button>
          <button type="button" className="docs-sandbox-reset" onClick={reset}>Reset</button>
          <span className="docs-sandbox-hint">Ctrl+Enter to run</span>
        </div>
        <div
          ref={containerRef}
          className="docs-sandbox-editor"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
              e.preventDefault();
              run();
            }
          }}
        />
      </div>
      <div className="docs-sandbox-pane docs-sandbox-preview-pane">
        <div className="docs-sandbox-preview-header">Preview</div>
        <div className="docs-sandbox-preview-body">
          {preview === 'reshape' ? (
            <ReshapeScriptPreview code={code} runKey={runKey} />
          ) : (
            <MoshionPreview code={code} runKey={runKey} />
          )}
        </div>
      </div>
    </div>
  );
}
