'use client';

// The second half of a two-part assignment, showing the chart the student drew
// in the first half.
//
// A1.5.1 is split: 1.5.30 draws the flowchart, 1.5.31 implements it. Step 4 of
// 1.5.31 says "read your comments and your code side by side, every shape on
// the chart should appear once" -- but the chart was not on the page. Its
// starter is the same generic scaffold for every student, so they were working
// from memory or from a second tab.
//
// Reads the first part's saved draft (a DiagramDoc), renders it read-only, and
// hands its pseudocode up so the workspace can seed the starter with the
// student's own steps rather than a generic placeholder.

import { useEffect, useRef, useState } from 'react';
import DiagramBlock from './DiagramBlock';
import { fetchDraft } from '../lib/written-grader-store';
import { toMermaid } from '../lib/diagram-mermaid';
import { toPseudocodeComments } from '../lib/diagram-pseudocode';
import type { DiagramDoc } from '../lib/diagram-types';

interface Props {
  /** Lesson id of the part that holds the chart. */
  planFrom: string;
  /** Human label for that lesson, e.g. "1.5.30". */
  planFromLabel?: string;
  /** Called once, with the student's chart as pseudocode comment lines. */
  onScaffold?: (lines: string[]) => void;
}

function parseDoc(raw: string): DiagramDoc | null {
  try {
    const doc = JSON.parse(raw);
    if (!Array.isArray(doc?.nodes) || !Array.isArray(doc?.edges)) return null;
    return doc as DiagramDoc;
  } catch {
    return null;
  }
}

export default function PlanChartPanel({ planFrom, planFromLabel, onScaffold }: Props) {
  const [doc, setDoc] = useState<DiagramDoc | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  // onScaffold seeds an editor, so it must fire once and never on a re-render.
  const scaffolded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const draft = await fetchDraft(planFrom);
      if (cancelled) return;
      const parsed = draft?.response ? parseDoc(draft.response) : null;
      if (!parsed) {
        setState('missing');
        return;
      }
      setDoc(parsed);
      setState('ready');
      if (!scaffolded.current && onScaffold) {
        scaffolded.current = true;
        onScaffold(toPseudocodeComments(parsed));
      }
    })();
    return () => {
      cancelled = true;
    };
    // onScaffold is a fresh closure each render; the ref above is what makes
    // this safe to leave out of the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planFrom]);

  if (state === 'loading') return null;

  const label = planFromLabel ?? planFrom;

  // Signed out, or the chart was drawn on another device: say so plainly
  // rather than rendering an empty frame the student cannot explain.
  if (state === 'missing' || !doc) {
    return (
      <div style={{ background: '#282a36', border: '1px solid #44475a', borderRadius: 6, padding: '10px 14px', marginBottom: 12, color: '#6272a4', fontSize: 13 }}>
        Your chart from {label} could not be loaded. Open {label} in another tab
        to see it while you work.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <DiagramBlock
        source={toMermaid(doc)}
        blockId={`plan-from-${planFrom}`}
        readOnly
        caption={`Your chart from ${label}`}
      />
    </div>
  );
}
