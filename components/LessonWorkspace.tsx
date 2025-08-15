'use client';
import { useEffect, useState } from 'react';
import { Lesson } from '../lib/lessons';
import { useLessonStore } from '../lib/store';
import FileExplorer from './FileExplorer';
import LessonSteps from './LessonSteps';
import CodeEditor from './CodeEditor';
import LivePreview from './LivePreview';
import RequirementsSection from './RequirementsSection';

export default function LessonWorkspace({ lesson }: { lesson: Lesson }) {
  const setLesson = useLessonStore((s) => s.setLesson);
  const files = useLessonStore((s) => s.fileContents);
  const ui = useLessonStore((s) => s.ui);
  const toggleSidebar = useLessonStore((s) => s.toggleSidebar);
  const setActiveTab = useLessonStore((s) => s.setActiveTab);
  const requirements = useLessonStore((s) => s.requirements);
  const setRequirements = useLessonStore((s) => s.setRequirements);
  const [srcDoc, setSrcDoc] = useState('');

  useEffect(() => {
    setLesson(lesson);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson]);

  // build preview and trigger tests with debounce
  useEffect(() => {
    const to = setTimeout(() => {
      const html = files['index.html'] || '';
      const css = files['style.css'] || '';
      const js = files['script.js'] || '';
      const doc = `${html}\n<style>${css}</style>\n<script>${js}</script>`;
      setSrcDoc(doc);
      const to2 = setTimeout(() => {
        runTests();
      }, 600);
      return () => clearTimeout(to2);
    }, 600);
    return () => clearTimeout(to);
  }, [files]);

  async function runTests() {
    const res = await fetch('/api/grade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id, files }),
    });
    const data = await res.json();
    setRequirements(
      lesson.requirements.map((r) => ({ ...r, ...data.find((d: any) => d.id === r.id) }))
    );
  }

  const summary = {
    passed: requirements.filter((r) => r.status === 'passed').length,
    total: requirements.length,
  };

  return (
    <>
      <div id="titleRow">
        <h1>{lesson.title}</h1>
      </div>
      <aside id="sidebar" className={ui.sidebarOpen ? 'open' : ''} aria-label="File explorer">
        <div className="sidebar-tabs">
          <button
            style={ui.activeSidebarTab === 'Files' ? { fontWeight: 'bold' } : {}}
            onClick={() => setActiveTab('Files')}
          >
            Files
          </button>
          <button
            style={ui.activeSidebarTab === 'Steps' ? { fontWeight: 'bold' } : {}}
            onClick={() => setActiveTab('Steps')}
          >
            Steps
          </button>
        </div>
        <div className="sidebar-content">
          {ui.activeSidebarTab === 'Files' ? (
            <FileExplorer tree={lesson.files} />
          ) : (
            <LessonSteps lesson={lesson} />
          )}
        </div>
      </aside>
      <details className="editor-card" open>
        <summary>Starter Code & Live Preview</summary>
        <div className="editor-body">
          <div className="editor-preview-container" id="split">
            <div className="pane" id="editorPane">
              <CodeEditor />
            </div>
            <div
              className="divider"
              id="divider"
              tabIndex={0}
              aria-label="Resize editor and preview"
            >
              <span className="drag-handle" aria-hidden="true"></span>
            </div>
            <div className="pane" id="previewPane">
              <LivePreview srcDoc={srcDoc} />
            </div>
            <div className="drag-overlay" id="dragOverlay" aria-hidden="true"></div>
          </div>
        </div>
      </details>
      <button onClick={toggleSidebar}>
        {ui.sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
      </button>
      <RequirementsSection
        requirements={requirements}
        summary={summary}
        onRerun={runTests}
      />
    </>
  );
}
