'use client';

import { useEffect, useRef, useState } from 'react';
import { useLessonStore } from '../lib/store';
import CodeMirrorPane from './CodeMirrorPane';
import ImageLibrary from './ImageLibrary';

export default function CodeEditor({ plainText = false }: { plainText?: boolean }) {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const currentFile = useLessonStore((s) => s.currentFile);
  const value = useLessonStore((s) => (currentFile ? s.fileContents[currentFile] : ''));
  const updateFile = useLessonStore((s) => s.updateFile);
  const selectFile = useLessonStore((s) => s.selectFile);
  const fileContents = useLessonStore((s) => s.fileContents);
  const fileRef = useRef(currentFile);
  fileRef.current = currentFile;

  // Listen for jump-to-line events from the Console. Switch files if needed,
  // then re-dispatch a 'shcode:goto-line' that CodeMirrorPane picks up.
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent).detail as { file: string; line: number; col?: number };
      if (!detail || !detail.file) return;

      // Resolve the file to a key in fileContents — the iframe sees "sketch.js"
      // or "script.js" (basename), but the store keys may be paths like
      // "/script.js". Match by exact key first, then by basename.
      const direct = Object.keys(fileContents).find((k) => k === detail.file);
      const byBase =
        direct ??
        Object.keys(fileContents).find((k) => k.split('/').pop() === detail.file) ??
        Object.keys(fileContents).find((k) => k === detail.file.replace(/^\/?/, ''));
      const target = byBase ?? null;
      if (!target) return;

      const dispatch = () =>
        window.dispatchEvent(
          new CustomEvent('shcode:goto-line', {
            detail: { file: target, line: detail.line, col: detail.col ?? 1 },
          })
        );

      if (fileRef.current !== target) {
        selectFile(target);
        // Wait for CodeMirrorPane to remount on the new fileKey.
        setTimeout(dispatch, 60);
      } else {
        dispatch();
      }
    }
    window.addEventListener('shcode:goto', handler);
    return () => window.removeEventListener('shcode:goto', handler);
  }, [fileContents, selectFile]);

  if (!currentFile) {
    return <div style={{ padding: 16, color: '#888' }}>No file selected</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="editor-file-toolbar">
        <span className="editor-file-name">{currentFile}</span>
        {/* Inserts the public path at the cursor rather than copying it to
            the clipboard — the whole point is getting it into the sketch.
            A text lesson has no CodeMirror to receive the insert event. */}
        {!plainText && (
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            title="Your uploaded images"
            style={{
              marginLeft: 'auto', background: 'none', border: '1px solid #44475a',
              color: '#f8f8f2', borderRadius: 4, padding: '2px 8px',
              fontSize: 11, cursor: 'pointer',
            }}
          >
            Images
          </button>
        )}
      </div>
      {libraryOpen && (
        <ImageLibrary
          onClose={() => setLibraryOpen(false)}
          onPick={(url) => {
            window.dispatchEvent(new CustomEvent('shcode:insert', { detail: { text: `'${url}'` } }));
            setLibraryOpen(false);
          }}
        />
      )}
      <div id="editor" style={{ flex: 1, minHeight: 0 }}>
        {plainText ? (
          <textarea
            value={value ?? ''}
            onChange={(e) => {
              if (fileRef.current) updateFile(fileRef.current, e.target.value);
            }}
            spellCheck={false}
            aria-label={`${currentFile} text`}
            style={{
              display: 'block', width: '100%', height: '100%', boxSizing: 'border-box',
              resize: 'none', border: 0, outline: 'none',
              padding: '14px 16px', background: 'var(--card)', color: 'var(--text)',
              fontFamily: "'Consolas', 'Courier New', monospace",
              fontSize: '0.95rem', lineHeight: 1.6, tabSize: 4,
            }}
          />
        ) : (
          <CodeMirrorPane
            value={value ?? ''}
            onChange={(doc) => {
              if (fileRef.current) {
                updateFile(fileRef.current, doc);
              }
            }}
            fileKey={currentFile}
          />
        )}
      </div>
    </div>
  );
}
