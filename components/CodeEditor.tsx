'use client';

import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import type { ChangeEvent } from 'react';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput, HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches } from '@codemirror/search';
import { tags as t } from '@lezer/highlight';
import { useLessonStore } from '../lib/store';

// Dracula palette — port of the CodeMirror 5 dracula theme used in public/q5play/editor.html.
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
}, { dark: true });

function makeExtensions(onChange: (doc: string) => void) {
  return [
    lineNumbers(),
    highlightActiveLine(),
    highlightActiveLineGutter(),
    bracketMatching(),
    closeBrackets(),
    indentOnInput(),
    highlightSelectionMatches(),
    javascript(),
    syntaxHighlighting(draculaHighlight),
    keymap.of([
      ...closeBracketsKeymap,
      ...defaultKeymap,
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
}

export default function CodeEditor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFile = useLessonStore((s) => s.currentFile);
  const value = useLessonStore((s) => (currentFile ? s.fileContents[currentFile] : ''));
  const updateFile = useLessonStore((s) => s.updateFile);
  const previewMode = useLessonStore((s) => s.lesson?.preview);
  const fileRef = useRef(currentFile);
  fileRef.current = currentFile;

  const handleDownload = () => {
    if (!currentFile) return;
    const blob = new Blob([value ?? ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !currentFile) return;
    const text = await file.text();
    updateFile(currentFile, text);
    const view = viewRef.current;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      });
    }
  };

  // Create or recreate editor when file changes
  useEffect(() => {
    if (!containerRef.current || !currentFile) return;

    // Destroy previous editor
    if (viewRef.current) {
      viewRef.current.destroy();
      viewRef.current = null;
    }

    const view = new EditorView({
      state: EditorState.create({
        doc: value || '',
        extensions: makeExtensions((doc) => {
          if (fileRef.current) {
            updateFile(fileRef.current, doc);
          }
        }),
      }),
      parent: containerRef.current,
    });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate when the selected file changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFile]);

  if (!currentFile) {
    return <div style={{ padding: 16, color: '#888' }}>No file selected</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="editor-file-toolbar">
        <span className="editor-file-name">{currentFile}</span>
        <button type="button" className="btn-secondary btn-sm" onClick={handleUploadClick}>
          Upload
        </button>
        <button type="button" className="btn-secondary btn-sm" onClick={handleDownload}>
          Download
        </button>
        {previewMode === 'q5play' && (
          <a
            href="/docs/q5play"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary btn-sm"
          >
            Docs ↗
          </a>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".js,.ts,.html,.css,.json,.txt,.md"
          onChange={handleUpload}
          style={{ display: 'none' }}
        />
      </div>
      <div ref={containerRef} id="editor" style={{ flex: 1, minHeight: 0 }} />
    </div>
  );
}
