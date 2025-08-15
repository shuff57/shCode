'use client';
import Editor from '@monaco-editor/react';
import { useLessonStore } from '../lib/store';

export default function CodeEditor() {
  const currentFile = useLessonStore((s) => s.currentFile);
  const value = useLessonStore((s) => (currentFile ? s.fileContents[currentFile] : ''));
  const updateFile = useLessonStore((s) => s.updateFile);
  if (!currentFile) return <div className="p-4">No file selected</div>;
  return (
    <Editor
      height="100%"
      defaultLanguage={
        currentFile.endsWith('.css') ? 'css' : currentFile.endsWith('.js') ? 'javascript' : 'html'
      }
      path={currentFile}
      value={value}
      onChange={(v) => updateFile(currentFile, v || '')}
      theme="vs-dark"
      options={{ minimap: { enabled: false } }}
    />
  );
}
