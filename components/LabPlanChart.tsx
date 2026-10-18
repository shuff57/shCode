'use client';

// An authored plan chart above a lab's editor: the shape of what the student
// is about to write, as a flowchart, next to the commented STEP lines in the
// starter. Distinct from PlanChartPanel, which shows the chart the student
// drew themselves in an earlier part.
//
// Collapsible, and CLOSED on a first visit: a chart of five or six rows is
// about 800px tall, and open it would push the editor below the fold on a
// 1366x768 screen. The figure is mounted only while
// open: React Flow fits a diagram once, when it first appears, so a figure
// created inside a closed <details> (zero width) never fits.

import { useEffect, useState } from 'react';
import DiagramBlock from './DiagramBlock';

interface Props {
  lessonId: string;
  mermaid: string;
  caption?: string;
}

const KEY = 'shCode:lab-plan-chart-open:';

export default function LabPlanChart({ lessonId, mermaid, caption }: Props) {
  const [open, setOpen] = useState(false);

  // Read the remembered choice after mount so server and client markup match.
  useEffect(() => {
    try {
      if (localStorage.getItem(KEY + lessonId) === '1') setOpen(true);
    } catch { /* private mode: stay closed */ }
  }, [lessonId]);

  function toggle(next: boolean) {
    setOpen(next);
    try {
      if (next) localStorage.setItem(KEY + lessonId, '1');
      else localStorage.removeItem(KEY + lessonId);
    } catch { /* not remembered */ }
  }

  return (
    <details
      open={open}
      onToggle={(e) => {
        const next = (e.currentTarget as HTMLDetailsElement).open;
        if (next !== open) toggle(next);
      }}
      style={{ background: '#282a36', border: '1px solid #44475a', borderRadius: 6, padding: '8px 12px', marginBottom: 12 }}
    >
      <summary style={{ cursor: 'pointer', color: '#8be9fd', fontSize: 14, fontWeight: 600 }}>
        Plan chart: the whole plan on one page
      </summary>
      {open ? (
        <DiagramBlock
          source={mermaid}
          blockId={`lab-plan-${lessonId}`}
          lessonId={lessonId}
          readOnly
          caption={caption}
        />
      ) : null}
    </details>
  );
}
