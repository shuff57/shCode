'use client';

import { useEffect, useRef } from 'react';
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { defaultKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { highlightSelectionMatches } from '@codemirror/search';
import { useLessonStore } from '../lib/store';

const darkTheme = EditorView.theme({
  '&': {
    backgroundColor: '#1e1e1e',
    color: '#d4d4d4',
    height: '100%',
    fontSize: '14px',
  },
  '.cm-content': {
    fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
    caretColor: '#fff',
    padding: '8px 0',
  },
  '.cm-gutters': {
    backgroundColor: '#1e1e1e',
    color: '#858585',
    border: 'none',
    paddingRight: '8px',
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#2a2a2a',
    color: '#c6c6c6',
  },
  '.cm-activeLine': {
    backgroundColor: '#2a2a2a44',
  },
  '.cm-selectionMatch': {
    backgroundColor: '#515c6a',
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: '#264f78',
  },
  '.cm-cursor': {
    borderLeftColor: '#fff',
  },
  '.cm-matchingBracket': {
    backgroundColor: '#3a3a3a',
    outline: '1px solid #888',
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
  const currentFile = useLessonStore((s) => s.currentFile);
  const value = useLessonStore((s) => (currentFile ? s.fileContents[currentFile] : ''));
  const updateFile = useLessonStore((s) => s.updateFile);
  const fileRef = useRef(currentFile);
  fileRef.current = currentFile;

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

  return <div ref={containerRef} id="editor" />;
}
