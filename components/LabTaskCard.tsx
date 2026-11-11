'use client';

import { useEffect, useState } from 'react';
import type { Lesson } from '../lib/types';
import { flattenFiles } from '../lib/store';
import LessonSteps from './LessonSteps';
import { extractLabTaskScenario } from '../lib/lab-task-scenario';

// "Your task" is a yellow tab on the left screen edge (the mirror of the tool
// tabs on the right): it sits against the screen and against the task panel
// when that is open, and opens and closes the panel. On a phone the same
// button is a bar above the panel. The choice is remembered per browser.
const OPEN_KEY = 'shCode:task-open';

export default function LabTaskCard({ lesson }: { lesson: Lesson }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(OPEN_KEY) === '0') setOpen(false);
    } catch { /* private window: start open */ }
  }, []);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try { localStorage.setItem(OPEN_KEY, next ? '1' : '0'); } catch { /* not remembered */ }
  };

  // Some console starters carry a scenario that the steps refer to rather
  // than repeat. Reflow that authored comment as prose beside the steps.
  // Read the bundled starter, never the student's edited answer.
  const starter = lesson.preview === 'console'
    ? flattenFiles(lesson.files).find((file) => file.path === 'script.js')?.content ?? ''
    : '';
  const scenario = extractLabTaskScenario(starter)?.scenario;
  const panelId = `task-${lesson.id}`;

  return (
    <>
      <button
        type="button"
        className="lab-task-tab"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
      >
        Your task
      </button>
      {open && (
        <aside className="lab-task-card" id={panelId} aria-label="Your task"
          style={{ background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 8, padding: 16, minWidth: 0, alignSelf: 'start' }}>
          <div className="lab-task-content">
            {scenario && <p style={{ margin: '0 0 14px', color: 'var(--c-fg)', fontSize: 14, lineHeight: 1.5 }}>{scenario}</p>}
            <LessonSteps lesson={lesson} />
          </div>
        </aside>
      )}
    </>
  );
}
