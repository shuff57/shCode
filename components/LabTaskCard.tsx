'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Lesson } from '../lib/types';
import { flattenFiles } from '../lib/store';
import LessonSteps from './LessonSteps';
import { extractLabTaskScenario } from '../lib/lab-task-scenario';

/** The task itself: the starter's scenario (console labs) and the lesson's steps. On a wide screen it
 *  is the left sidebar (LabTaskSidebar); on a phone it sits above the editor (LabTaskCard). */
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

// Whether the task is open, remembered per browser: one choice for the phone's bar above the editor and
// the wide screen's left sidebar.
const OPEN_KEY = 'shCode:task-open';

function useTaskOpen(): [boolean, () => void, () => void] {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(OPEN_KEY) === '0') setOpen(false);
    } catch { /* private window: start open */ }
  }, []);
  const toggle = () => {
    setOpen((was) => {
      const next = !was;
      try { localStorage.setItem(OPEN_KEY, next ? '1' : '0'); } catch { /* not remembered */ }
      return next;
    });
  };
  const close = useCallback(() => setOpen(false), []);
  return [open, toggle, close];
}

/** Wide screens: the task in a sidebar on the left of the work, opened and closed by a small arrow tab on
 *  its edge (the mirror of the tools sidebar on the right). The CSS hides it on a phone. */
/** Below this width only one lab sidebar is open at a time (both leave the code too narrow to work in). */
export const BOTH_SIDEBARS_MIN = 1280;
/** The window event the two lab sidebars use to take turns: detail is the side that just opened. */
export const SIDEBAR_OPENED = 'shcode:lab-sidebar-opened';

export function LabTaskSidebar({ lesson }: { lesson: Lesson }) {
  const [open, toggle, close] = useTaskOpen();
  // On a narrower screen, the tools sidebar opening closes this one (not remembered: next visit as before).
  useEffect(() => {
    const onOpened = (e: Event) => {
      if ((e as CustomEvent<string>).detail === 'right' && window.innerWidth < BOTH_SIDEBARS_MIN) close();
    };
    window.addEventListener(SIDEBAR_OPENED, onOpened);
    return () => window.removeEventListener(SIDEBAR_OPENED, onOpened);
  }, [close]);
  const onToggle = () => {
    if (!open && window.innerWidth < BOTH_SIDEBARS_MIN) window.dispatchEvent(new CustomEvent(SIDEBAR_OPENED, { detail: 'left' }));
    toggle();
  };
  const panelId = `task-side-${lesson.id}`;
  const label = open ? 'Close the task' : 'Open the task';
  return (
    <div className={`lab-task-side${open ? ' is-open' : ''}`}>
      <div className="lab-task-side-inner">
        {open && (
          <aside className="lab-task-side-panel" id={panelId} aria-label="Your task">
            <div className="lab-task-side-head">Task</div>
            <div className="lab-task-side-body"><LabTaskContent lesson={lesson} /></div>
          </aside>
        )}
        <button
          type="button"
          className="shd-handle shd-handle-left"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={label}
          title={label}
          onClick={onToggle}
        >
          {open
            ? <span aria-hidden="true">{'\u2039'}</span>
            : <span className="shd-handle-label" aria-hidden="true">Task</span>}
        </button>
      </div>
    </div>
  );
}

// Phones only (the CSS hides it on a wide screen, where the task is the left sidebar): a "Your task" bar
// that opens and closes the task above the editor.

export default function LabTaskCard({ lesson }: { lesson: Lesson }) {
  const [open, toggle] = useTaskOpen();
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
