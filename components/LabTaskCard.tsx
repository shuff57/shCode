'use client';

import { useEffect, useState } from 'react';
import type { Lesson } from '../lib/types';
import { flattenFiles } from '../lib/store';
import LessonSteps from './LessonSteps';
import { extractLabTaskScenario } from '../lib/lab-task-scenario';

/** The task itself: the starter's scenario (console labs) and the lesson's steps. On a wide screen it
 *  is the first tab of the lab's side panel (LessonWorkspace); on a phone it sits above the editor in
 *  LabTaskCard below. */
export function LabTaskContent({ lesson, id }: { lesson: Lesson; id?: string }) {
  // Some console starters carry a scenario that the steps refer to rather
  // than repeat. Reflow that authored comment as prose beside the steps.
  // Read the bundled starter, never the student's edited answer.
  const starter = lesson.preview === 'console'
    ? flattenFiles(lesson.files).find((file) => file.path === 'script.js')?.content ?? ''
    : '';
  const scenario = extractLabTaskScenario(starter)?.scenario;
  const reqs = lesson.requirements?.length ?? 0;
  return (
    <div className="lab-task-content" id={id}>
      {scenario && <p className="lab-task-scenario">{scenario}</p>}
      <LessonSteps lesson={lesson} />
      {/* Where the task ends, and why the header can count more requirements than there are steps:
          Check tests the requirements (listed under the Quest tab), not the steps one for one. */}
      {lesson.steps.length > 0 && (
        <p className="lab-task-end">
          End of task: {lesson.steps.length} {lesson.steps.length === 1 ? 'step' : 'steps'}
          {reqs > 0 && <> · Check tests {reqs} {reqs === 1 ? 'requirement' : 'requirements'} (listed under Quest)</>}
        </p>
      )}
    </div>
  );
}

// Phones only (the CSS hides it on a wide screen, where the task is the side panel's Task tab): a
// "Your task" bar that opens and closes the task above the editor. The choice is remembered.
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
  // The task starts as a few lines (the CSS clamps it); "Show full task" opens the rest.
  const [full, setFull] = useState(false);
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
        <aside className={`lab-task-card${full ? ' is-full' : ''}`} id={panelId} aria-label="Your task"
          style={{ background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 8, padding: 16, minWidth: 0, alignSelf: 'start' }}>
          <LabTaskContent lesson={lesson} id={`${panelId}-content`} />
          <button type="button" className="lab-task-more" aria-expanded={full} aria-controls={`${panelId}-content`} onClick={() => setFull((v) => !v)}>
            {full ? 'Show less' : 'Show full task'}
          </button>
        </aside>
      )}
    </>
  );
}
