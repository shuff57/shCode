'use client';
import Editor from '@monaco-editor/react';
import { useLessonStore } from '../lib/store';

export default function CodeEditor() {
  const currentFile = useLessonStore((s) => s.currentFile);
  const value = useLessonStore((s) => (currentFile ? s.fileContents[currentFile] : ''));
  const updateFile = useLessonStore((s) => s.updateFile);
  if (!currentFile) return <div>No file selected</div>;
  const lang = currentFile.endsWith('.css')
    ? 'css'
    : currentFile.endsWith('.js')
    ? 'javascript'
    : 'html';
  return (
    <div id="editor">
      <Editor
        key={currentFile}
        height="100%"
        defaultLanguage={lang}
        defaultValue={value}
        path={currentFile}
        onChange={(v) => updateFile(currentFile, v || '')}
        theme="vs-dark"
        options={{ minimap: { enabled: false }, automaticLayout: true }}
      />
    </div>
  );
}
