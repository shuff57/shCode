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
    <div className="space-y-4">
      <div id="titleRow">
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
      </div>
      <div id="workspace" className="gap-4">
        {ui.sidebarOpen && (
          <div id="sidebar" className="border p-2 flex flex-col w-64">
            <div className="flex mb-2 space-x-2 text-sm sidebar-tabs">
              <button
                className={ui.activeSidebarTab === 'Files' ? 'font-bold' : ''}
                onClick={() => setActiveTab('Files')}
              >
                Files
              </button>
              <button
                className={ui.activeSidebarTab === 'Steps' ? 'font-bold' : ''}
                onClick={() => setActiveTab('Steps')}
              >
                Steps
              </button>
            </div>
            <div className="flex-1 overflow-auto sidebar-content">
              {ui.activeSidebarTab === 'Files' ? (
                <FileExplorer tree={lesson.files} />
              ) : (
                <LessonSteps lesson={lesson} />
              )}
            </div>
          </div>
        )}
        <div id="editorPane" className="h-96 md:h-auto pane">
          <CodeEditor />
        </div>
        <div id="previewPane" className="h-96 md:h-auto pane">
          <LivePreview srcDoc={srcDoc} />
        </div>
      </div>
      <button onClick={toggleSidebar} className="px-2 py-1 border rounded">
        {ui.sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
      </button>
      <RequirementsSection
        requirements={requirements}
        summary={summary}
        onRerun={runTests}
      />
    </div>
  );
}
