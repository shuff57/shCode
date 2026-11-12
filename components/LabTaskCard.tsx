'use client';

import { useState } from 'react';

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
  // Phone only (the CSS shows the button and the clamp below 720px): the task starts as a few lines.
  const [full, setFull] = useState(false);

  return (
    <details className={`lab-task-card${full ? ' is-full' : ''}`} open aria-label="Your task"
      style={{ background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 8, padding: 16, minWidth: 0, alignSelf: 'start' }}>
      <summary className="lab-task-heading">Your task</summary>
      <div className="lab-task-content" id={`task-${lesson.id}`}>
        {scenario && <p style={{ margin: '0 0 14px', color: 'var(--c-fg)', fontSize: 14, lineHeight: 1.5 }}>{scenario}</p>}
        <LessonSteps lesson={lesson} />
        {/* Where the task ends, and why the header can count more requirements than there are steps:
            Check tests the requirements (listed under the Quest tab), not the steps one for one. */}
        {lesson.steps.length > 0 && (
          <p className="lab-task-end">
            End of task: {lesson.steps.length} {lesson.steps.length === 1 ? 'step' : 'steps'}
            {(lesson.requirements?.length ?? 0) > 0 && (
              <> · Check tests {lesson.requirements.length} {lesson.requirements.length === 1 ? 'requirement' : 'requirements'}{' '}
                {/* The row under Run / Check lists them on a wide screen (all once checked, ux1 B3); a phone
                    shows the results there after Check and the list itself under Quest. */}
                <span className="lab-task-end-wide">
                  {lesson.requirements.length <= 3 ? '(shown above the editor)' : '(the first 3 shown above the editor, all of them after Check)'}
                </span>
                <span className="lab-task-end-narrow">(listed under Quest, results under the editor after Check)</span>
              </>
            )}
          </p>
        )}
      </div>
      <button type="button" className="lab-task-more" aria-expanded={full} aria-controls={`task-${lesson.id}`} onClick={() => setFull((v) => !v)}>
        {full ? 'Show less' : 'Show full task'}
      </button>
    </details>
  );
}
