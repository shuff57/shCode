'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
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
import ShPlayPreview from './ShPlayPreview';
import LiveConsole from './LiveConsole';

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
  /** Stable id for this block — combined with lessonId to key localStorage. */
  blockId?: string;
  /** Lesson id that hosts this block. When both lessonId and blockId are
   *  provided, edits persist to localStorage under
   *  `shCode:liveBlock:<lessonId>:<blockId>`. */
  lessonId?: string;
  /** When true, render a DevTools-style console + REPL under the preview. */
  showConsole?: boolean;
}

function storageKeyFor(lessonId: string | undefined, blockId: string | undefined): string | null {
  if (!lessonId || !blockId) return null;
  return `shCode:liveBlock:${lessonId}:${blockId}`;
}

function legacyStorageKeyFor(lessonId: string | undefined, blockId: string | undefined): string | null {
  if (!lessonId || !blockId) return null;
  return `liveCodeBlock:${lessonId}:${blockId}`;
}

export default function LiveCodeBlock({
  code,
  label,
  height = 360,
  previewSize = 360,
  blockId,
  lessonId,
  showConsole = false,
}: Props) {
  const initialCode = code.trim();
  const storageKey = storageKeyFor(lessonId, blockId);
  const legacyKey = legacyStorageKeyFor(lessonId, blockId);

  // Load any saved edit synchronously so the first render of the editor
  // already reflects the student's in-progress work, avoiding a flash
  // of the original starter code on reload.
  const [editorCode, setEditorCode] = useState<string>(() => {
    if (!storageKey || typeof window === 'undefined') return initialCode;
    // One-time migration from the old `liveCodeBlock:*` key.
    if (legacyKey) {
      const legacyValue = window.localStorage.getItem(legacyKey);
      if (legacyValue !== null) {
        if (window.localStorage.getItem(storageKey) === null) {
          window.localStorage.setItem(storageKey, legacyValue);
        }
        window.localStorage.removeItem(legacyKey);
      }
    }
    const saved = window.localStorage.getItem(storageKey);
    return saved !== null ? saved : initialCode;
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [committedCode, setCommittedCode] = useState('');
  const [runKey, setRunKey] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        // Use the already-resolved editorCode so the editor starts with
        // the saved doc when present.
        doc: editorCode,
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

  // Persist edits to localStorage, debounced so we don't write on every
  // keystroke. Removes the entry when the code is back at its starter so
  // stale storage doesn't accumulate.
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      if (editorCode === initialCode) {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, editorCode);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [editorCode, initialCode, storageKey]);

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
    if (storageKey && typeof window !== 'undefined') {
      window.localStorage.removeItem(storageKey);
    }
  }

  return (
    <div className="livecodeblock">
      {label && <div className="livecodeblock-label">{label}</div>}
      <div
        className="livecodeblock-body"
        style={
          {
            '--lcb-editor-h': `${height}px`,
            '--lcb-preview-side': `${previewSize}px`,
          } as CSSProperties
        }
      >
        <div className="livecodeblock-editor">
          <div ref={containerRef} className="livecodeblock-editor-mount" />
        </div>
        <div className="livecodeblock-preview">
          <ShPlayPreview ref={iframeRef} code={committedCode} runKey={runKey} />
        </div>
      </div>
      {showConsole && <LiveConsole iframeRef={iframeRef} resetKey={runKey} />}
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

        /* Column layout (default / narrow): editor stacked above preview.
           Each child takes its own explicit height so nothing grows to
           indeterminate parent size. */
        .livecodeblock-body {
          display: flex;
          flex-direction: column;
        }
        .livecodeblock-editor {
          height: var(--lcb-editor-h);
          background: #282a36;
          overflow: hidden;
        }
        .livecodeblock-editor-mount {
          height: 100%;
          overflow: auto;
        }
        .livecodeblock-preview {
          width: 100%;
          height: var(--lcb-preview-side);
          background: #000;
          position: relative;
        }
        .livecodeblock-preview .jscad-frame,
        .livecodeblock-preview .jscad-empty {
          width: 100%;
          height: 100%;
          display: block;
        }

        /* Row layout: editor and preview side-by-side, both matching the
           preview's square height so the iframe is never clipped. */
        @media (min-width: 720px) {
          .livecodeblock-body {
            flex-direction: row;
            height: var(--lcb-preview-side);
          }
          .livecodeblock-editor {
            flex: 1 1 0;
            min-width: 0;
            height: 100%;
            border-right: 1px solid #44475a;
          }
          .livecodeblock-preview {
            width: var(--lcb-preview-side);
            height: 100%;
            flex-shrink: 0;
          }
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
      `}</style>
    </div>
  );
}
