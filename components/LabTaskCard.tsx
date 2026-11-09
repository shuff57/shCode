'use client';

import { useState } from 'react';
import type { Lesson } from '../lib/types';
import { flattenFiles } from '../lib/store';
import LessonSteps from './LessonSteps';

export default function LabTaskCard({ lesson }: { lesson: Lesson }) {
  const [expanded, setExpanded] = useState(false);
  // Some console starters carry a scenario that the steps refer to rather
  // than repeat. Reflow that authored comment as prose beside the steps.
  // Read the bundled starter, never the student's edited answer.
  const starter = lesson.preview === 'console'
    ? flattenFiles(lesson.files).find((file) => file.path === 'script.js')?.content ?? ''
    : '';
  const scenario = starter.match(/\/\/\s*STEP\s+\d+:[^\n]*(?:\n\/\/[^\n]+)*/i)?.[0]
    .replace(/^\/\/\s*/gm, '')
    .replace(/^STEP\s+\d+:\s*/i, '')
    .split(/Choose from:/i)[0]
    .replace(/\s+/g, ' ').trim();

  return (
    <aside className={`lab-task-card ${expanded ? 'is-expanded' : ''}`} aria-label="Your task"
      style={{ background: 'var(--c-bg)', border: '1px solid var(--c-line)', borderRadius: 8, padding: 16, minWidth: 0, alignSelf: 'start' }}>
      <h2 style={{ color: 'var(--c-cyan)', fontSize: 14, margin: '0 0 10px', fontWeight: 700 }}>Your task</h2>
      <div className="lab-task-content" id={`task-${lesson.id}`}>
        {scenario && <p style={{ margin: '0 0 14px', color: 'var(--c-fg)', fontSize: 14, lineHeight: 1.5 }}>{scenario}</p>}
        <LessonSteps lesson={lesson} />
      </div>
      <button className="lab-task-toggle" type="button" aria-expanded={expanded}
        aria-controls={`task-${lesson.id}`} onClick={() => setExpanded(!expanded)}
        style={{ background: 'none', border: 0, padding: '8px 0 0', color: 'var(--c-cyan)', fontSize: 12, cursor: 'pointer' }}>
        {expanded ? 'Show fewer steps' : 'Show all steps'}
      </button>
    </aside>
  );
}
