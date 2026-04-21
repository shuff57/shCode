'use client';

import { useEffect, useRef, useState } from 'react';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  highlightActiveLineGutter,
} from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap, indentWithTab, history, historyKeymap } from '@codemirror/commands';
import { bracketMatching, indentOnInput, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches } from '@codemirror/search';
import { tags as t } from '@lezer/highlight';
import { Play, RotateCcw } from 'lucide-react';
import Q5PlayPreview from './Q5PlayPreview';

const dracula = {
  bg: '#282a36', fg: '#f8f8f2', gutter: '#282a36', gutterFg: '#6272a4',
  activeLine: '#44475a55', selection: '#44475a', cursor: '#f8f8f0', comment: '#6272a4',
  cyan: '#8be9fd', green: '#50fa7b', orange: '#ffb86c', pink: '#ff79c6',
  purple: '#bd93f9', red: '#ff5555', yellow: '#f1fa8c',
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
  { tag: [t.punctuation, t.separator, t.bracket], color: dracula.fg },
  { tag: [t.operator], color: dracula.pink },
  { tag: t.invalid, color: dracula.red },
]);

const darkTheme = EditorView.theme(
  {
    '&': { backgroundColor: dracula.bg, color: dracula.fg, height: '100%', fontSize: '13px' },
    '.cm-content': {
      fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
      caretColor: dracula.cursor,
      padding: '6px 0',
    },
    '.cm-gutters': { backgroundColor: dracula.gutter, color: dracula.gutterFg, border: 'none', paddingRight: '8px' },
    '.cm-activeLineGutter': { backgroundColor: dracula.activeLine, color: dracula.fg },
    '.cm-activeLine': { backgroundColor: dracula.activeLine },
    '&.cm-focused .cm-selectionBackground, ::selection': { backgroundColor: dracula.selection },
    '.cm-cursor': { borderLeftColor: dracula.cursor },
  },
  { dark: true }
);

function makeExtensions(onChange: (doc: string) => void) {
  return [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    history(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    highlightSelectionMatches(),
    javascript(),
    syntaxHighlighting(draculaHighlight),
    keymap.of([...closeBracketsKeymap, ...defaultKeymap, ...historyKeymap, indentWithTab]),
    darkTheme,
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onChange(update.state.doc.toString());
    }),
    EditorView.lineWrapping,
    EditorState.tabSize.of(2),
  ];
}

interface Props {
  code: string;
  label?: string;
  height?: number;
  previewSize?: number;
}

export default function LiveCodeBlock({ code, label, height = 180, previewSize = 360 }: Props) {
  const initialCode = code.trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [editorCode, setEditorCode] = useState(initialCode);
  const [committedCode, setCommittedCode] = useState('');
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: initialCode,
        extensions: makeExtensions(setEditorCode),
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function run() {
    setCommittedCode(editorCode);
    setRunKey((k) => k + 1);
  }

  function reset() {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: initialCode } });
    setEditorCode(initialCode);
    setCommittedCode('');
    setRunKey(0);
  }

  return (
    <div className="livecodeblock">
      {label && <div className="livecodeblock-label">{label}</div>}
      <div className="livecodeblock-body">
        <div className="livecodeblock-editor" style={{ height }}>
          <div ref={containerRef} style={{ height: '100%', overflow: 'auto' }} />
        </div>
        <div className="livecodeblock-preview" style={{ width: previewSize, height: previewSize }}>
          <Q5PlayPreview code={committedCode} runKey={runKey} />
        </div>
      </div>
      <div className="livecodeblock-toolbar">
        <button type="button" className="livecodeblock-run" onClick={run}>
          <Play size={13} strokeWidth={2.5} /> Run
        </button>
        <button type="button" className="livecodeblock-reset" onClick={reset}>
          <RotateCcw size={12} /> Reset
        </button>
      </div>
      <style>{`
        .livecodeblock {
          border: 1px solid #44475a;
          border-radius: 6px;
          margin: 16px 0;
          background: #1e1f29;
          overflow: hidden;
        }
        .livecodeblock-label {
          padding: 6px 12px;
          background: #282a36;
          border-bottom: 1px solid #44475a;
          font-size: 12px;
          color: #bd93f9;
          font-weight: 600;
        }
        .livecodeblock-body { display: flex; flex-direction: column; }
        .livecodeblock-editor { flex: 1; min-width: 0; background: #282a36; }
        .livecodeblock-preview {
          background: #000;
          max-width: 100%;
          position: relative;
          flex-shrink: 0;
        }
        .livecodeblock-preview .jscad-frame,
        .livecodeblock-preview .jscad-empty {
          width: 100%;
          height: 100%;
          display: block;
        }
        .livecodeblock-toolbar {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px;
          background: #282a36;
          border-top: 1px solid #44475a;
        }
        .livecodeblock-run {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 4px;
          background: #50fa7b;
          color: #282a36;
          font-weight: 600;
          font-size: 13px;
          border: none;
          cursor: pointer;
        }
        .livecodeblock-reset {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 4px;
          background: transparent;
          color: #6272a4;
          font-size: 12px;
          border: 1px solid #44475a;
          cursor: pointer;
        }
        @media (min-width: 720px) {
          .livecodeblock-body { flex-direction: row; }
          .livecodeblock-editor { border-right: 1px solid #44475a; }
        }
      `}</style>
    </div>
  );
}
