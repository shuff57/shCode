'use client';

import type { Lesson } from '../lib/types';
import { flattenFiles } from '../lib/store';
import LessonSteps from './LessonSteps';
import { extractLabTaskScenario } from '../lib/lab-task-scenario';

export default function LabTaskCard({ lesson }: { lesson: Lesson }) {
  // Some console starters carry a scenario that the steps refer to rather
  // than repeat. Reflow that authored comment as prose beside the steps.
  // Read the bundled starter, never the student's edited answer.
  const starter = lesson.preview === 'console'
    ? flattenFiles(lesson.files).find((file) => file.path === 'script.js')?.content ?? ''
    : '';
  const scenario = extractLabTaskScenario(starter)?.scenario;

  return (
    <details className="lab-task-card" open aria-label="Your task"
      style={{ background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 8, padding: 16, minWidth: 0, alignSelf: 'start' }}>
      <summary className="lab-task-heading">Your task</summary>
      <div className="lab-task-content" id={`task-${lesson.id}`}>
        {scenario && <p style={{ margin: '0 0 14px', color: 'var(--c-fg)', fontSize: 14, lineHeight: 1.5 }}>{scenario}</p>}
        <LessonSteps lesson={lesson} />
      </div>
    </details>
  );
}
