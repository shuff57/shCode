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
  /** Other charts to switch between (e.g. one per problem). When absent, `mermaid` is the only chart. */
  variants?: { id: string; label: string; mermaid: string; caption?: string }[];
}

const KEY = 'shCode:lab-plan-chart-open:';

export default function LabPlanChart({ lessonId, mermaid, caption, variants }: Props) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(variants?.[0]?.id ?? '');
  const shown = variants?.find((v) => v.id === picked) ?? variants?.[0] ?? { id: 'only', label: '', mermaid, caption };

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
        Flow Chart
      </summary>
      {open && variants && variants.length > 1 ? (
        <div role="tablist" aria-label="Choose a flow chart" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 4px' }}>
          {variants.map((v) => {
            const on = v.id === shown.id;
            return (
              <button
                key={v.id}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setPicked(v.id)}
                style={{
                  padding: '4px 12px',
                  minHeight: 30,
                  borderRadius: 6,
                  border: `1px solid ${on ? '#bd93f9' : '#44475a'}`,
                  background: on ? '#bd93f9' : '#282a36',
                  color: on ? '#282a36' : '#f8f8f2',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {v.label}
              </button>
            );
          })}
        </div>
      ) : null}
      {open ? (
        <DiagramBlock
          key={shown.id}
          source={shown.mermaid}
          blockId={`lab-plan-${lessonId}-${shown.id}`}
          lessonId={lessonId}
          readOnly
          caption={shown.caption}
        />
      ) : null}
    </details>
  );
}
