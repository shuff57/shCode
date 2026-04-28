'use client';

import Link from 'next/link';
import { badgeForLesson } from '../lib/lesson-badges';
import { useLessonState } from '../lib/progress';

interface LessonItem {
  id: string;
  numberedId: string;
  displayTitle: string;
  type?: string;
  preview?: string;
  estimateMins?: number;
}

const stateStripeColors: Record<string, string> = {
  completed: '#50fa7b',
  started: '#f1fa8c',
};

const stateLabels: Record<string, string> = {
  completed: 'Done',
  started: 'In progress',
};

export default function ModuleLessonsList({ lessons }: { lessons: LessonItem[] }) {
  const progress = useLessonState();

  if (lessons.length === 0) {
    return <p style={{ opacity: 0.6 }}>No lessons yet.</p>;
  }

  return (
    <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {lessons.map((l) => {
        const badge = badgeForLesson({ type: l.type, preview: l.preview });
        const isAssignment = l.type === 'assignment' || l.type === 'project';
        const href = isAssignment ? `/assignment/${l.id}` : `/lesson/${l.id}`;
        const lessonState = progress.states[l.id];
        const stripeColor = stateStripeColors[lessonState ?? ''] ?? 'var(--border)';
        const stateLabel = stateLabels[lessonState ?? ''];

        return (
          <li key={l.id} style={{ marginBottom: 8 }}>
            <Link
              href={href}
              className="bg-card border-border border rounded block hover:bg-muted shadow-lg"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderLeft: '4px solid ' + badge.color,
                borderRight: '4px solid ' + stripeColor,
                textDecoration: 'none',
                color: 'var(--text)',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 11,
                  color: badge.color,
                  background: badge.color + '22',
                  border: '1px solid ' + badge.color + '55',
                  borderRadius: 999,
                  padding: '3px 10px',
                  minWidth: 140,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                }}
              >
                <badge.Icon size={12} strokeWidth={2.25} />
                {badge.label}
              </span>
              <span style={{ opacity: 0.5, fontFamily: 'monospace', minWidth: 50 }}>
                {l.numberedId}
              </span>
              <span style={{ flex: 1, fontWeight: 500 }}>{l.displayTitle}</span>
              {stateLabel && (
                <span
                  style={{
                    fontSize: 11,
                    color: stripeColor,
                    background: stripeColor + '22',
                    border: '1px solid ' + stripeColor + '55',
                    borderRadius: 999,
                    padding: '2px 8px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {stateLabel}
                </span>
              )}
              {l.estimateMins ? (
                <span style={{ opacity: 0.5, fontSize: 12 }}>~{l.estimateMins} min</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
