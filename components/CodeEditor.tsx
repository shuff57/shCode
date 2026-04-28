'use client';

import { useRef } from 'react';
import { useLessonStore } from '../lib/store';
import CodeMirrorPane from './CodeMirrorPane';

export default function CodeEditor() {
  const currentFile = useLessonStore((s) => s.currentFile);
  const value = useLessonStore((s) => (currentFile ? s.fileContents[currentFile] : ''));
  const updateFile = useLessonStore((s) => s.updateFile);
  const fileRef = useRef(currentFile);
  fileRef.current = currentFile;

  if (!currentFile) {
    return <div style={{ padding: 16, color: '#888' }}>No file selected</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="editor-file-toolbar">
        <span className="editor-file-name">{currentFile}</span>
      </div>
      <div id="editor" style={{ flex: 1, minHeight: 0 }}>
        <CodeMirrorPane
          value={value ?? ''}
          onChange={(doc) => {
            if (fileRef.current) {
              updateFile(fileRef.current, doc);
            }
          }}
          fileKey={currentFile}
        />
      </div>
    </div>
  );
}
