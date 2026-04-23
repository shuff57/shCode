'use client';

import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useLessonStore } from '../lib/store';
import CodeMirrorPane from './CodeMirrorPane';

export default function CodeEditor() {
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
  };

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
