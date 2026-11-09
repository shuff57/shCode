'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, type CurrentUser } from '../../lib/auth';
import { useLessonState } from '../../lib/progress';
import { lessonGradeCategory, lessonPercent } from '../../lib/grading-weights';
import { sortLessons } from '../../lib/lesson-order';
import { pickUpNext } from '../../lib/up-next';
import StudentGradebook from '../../components/StudentGradebook';

interface ManifestLesson {
  id: string;
  title: string;
  unit?: string;
  category?: string;
  /** Quiz questions, rubric points, or pass/fail criteria; null = completion is the grade. */
  maxScore?: number | null;
  preview?: string | null;
  assignmentCode?: string | null;
  scoreKind?: 'quiz' | 'written' | null;
}

interface ManifestData {
  lessons: ManifestLesson[];
}

function formatTime(totalMins: number): string {
  if (totalMins <= 0) return '0 min';
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `~${mins} min`;
  if (mins === 0) return `~${hrs} hr`;
  return `~${hrs} hr ${mins} min`;
}

export default function ProgressPage() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [manifest, setManifest] = useState<ManifestData | null>(null);
  const progress = useLessonState();

  useEffect(() => {
    getCurrentUser().then(setUser);
    fetch('/lessons-manifest.json')
      .then((r) => r.json())
      .then(setManifest)
      .catch(() => setManifest(null));
  }, []);

  if (user === undefined || !progress.loaded || !manifest) {
    return (
      <div className="page-frame" style={containerStyle}>
        <p style={{ color: 'var(--c-meta)' }}>Loading...</p>
      </div>
    );
  }

  if (!user || !progress.authed) {
    return (
      <div className="page-frame" style={containerStyle}>
        <nav style={navStyle}>
          <Link href="/" style={linkStyle}>Home</Link>
          <span style={{ color: 'var(--c-meta)' }}>›</span>
          <span style={{ color: 'var(--c-meta)' }}>Progress</span>
        </nav>
        <div style={cardStyle}>
          <h2 style={{ margin: 0 }}>Sign in to see your progress</h2>
          <p style={{ color: 'var(--c-meta)', marginTop: 12 }}>Your lesson completion and scores will appear here once you sign in.</p>
        </div>
      </div>
    );
  }

  const completedIds = manifest.lessons.filter((l) => progress.states[l.id] === 'completed').map((l) => l.id);
  const totalLessons = manifest.lessons.length;
  const completionPct = totalLessons > 0 ? Math.round((completedIds.length / totalLessons) * 100) : 0;

  // lesson_state.score is raw POINTS in each lesson's own units (a quiz's correct count, a rubric's
  // earned points, a pass/fail rubric's criteria met), never a percent. Every percent on this page
  // is lessonPercent() over the manifest's maxScore, the function the synced grade is built from;
  // printing the raw score with a "%" read "Completed 3%" for a quiz scored 3 of 8.
  const pctFor = (l: ManifestLesson) => lessonPercent(progress.states[l.id], progress.scores[l.id], l.maxScore);
  // Both lists below slice a SEQUENCE, so they need course order, not the
  // manifest's folder-id order — which reads 1.1.19, 1.1.2, 1.1.20 and made
  // "Up Next" name lessons the Next button would not go to. See
  // lib/lesson-order.ts.
  const orderedLessons = sortLessons(manifest.lessons);

  // Recently completed: last 5 completed lessons in course order
  const recentlyCompleted = orderedLessons
    .filter((l) => progress.states[l.id] === 'completed')
    .slice(-5)
    .reverse();

  // Up Next: not-completed lessons AFTER the furthest completed one, graded items first (lib/up-next.ts).
  const nextLocked = pickUpNext(orderedLessons, progress.states, (l) => lessonGradeCategory(l) !== null);

  // Per-unit breakdown
  const unitMap = new Map<string, { completed: number; started: number; total: number; category?: string }>();
  for (const l of manifest.lessons) {
    const unitName = l.unit || 'Other';
    if (!unitMap.has(unitName)) {
      unitMap.set(unitName, { completed: 0, started: 0, total: 0, category: l.category });
    }
    const entry = unitMap.get(unitName)!;
    entry.total++;
    if (progress.states[l.id] === 'started') entry.started++;
    if (progress.states[l.id] === 'completed') entry.completed++;
  }
  const unitEntries = Array.from(unitMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div className="page-frame" style={containerStyle}>
      <nav style={navStyle}>
        <Link href="/" style={linkStyle}>Home</Link>
        <span style={{ color: 'var(--c-meta)' }}>›</span>
        <span style={{ color: 'var(--c-meta)' }}>Progress</span>
      </nav>

      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 12px' }}>Your progress</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16, color: 'var(--c-meta)', fontSize: 14 }}>
        <span><strong style={{ color: 'var(--c-fg)' }}>{completedIds.length}</strong> of {totalLessons} lessons done</span>
        <a href="#missing-late-filter" style={{ color: 'var(--c-cyan)' }}>Review missing or late work →</a>
      </div>

      {/* Per-assignment gradebook — the student's own row of the same matrix
          the teacher reads from /api/classes/[id]/gradebook. */}
      <StudentGradebook lessons={manifest.lessons} />

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Recently completed */}
        <div style={{ ...cardStyle, flex: '1 1 340px', minWidth: 280 }}>
          <h3 style={{ margin: '0 0 14px 0', borderBottom: '1px solid var(--c-line)', paddingBottom: 8 }}>
            Recently Completed
          </h3>
          {recentlyCompleted.length === 0 ? (
            <p style={{ color: 'var(--c-meta)', fontSize: 14 }}>No lessons completed yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recentlyCompleted.map((l) => {
                // Work with no grade category does not count, so it gets no percent (its 100 is a placeholder).
                const counts = lessonGradeCategory({ title: l.title, preview: l.preview, scoreKind: l.scoreKind, assignmentCode: l.assignmentCode }) !== null;
                const score = !counts ? undefined : progress.scores[l.id] !== undefined || l.maxScore != null ? pctFor(l) : undefined;
                return (
                  <li key={l.id} style={listItemStyle}>
                    <span style={{ flex: 1, fontWeight: 500 }}>{l.title}</span>
                    <span style={{
                      fontSize: 12,
                      color: 'var(--c-green)',
                      background: 'color-mix(in srgb, var(--c-green) 12.0%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--c-green) 30.0%, transparent)',
                      borderRadius: 999,
                      padding: '2px 10px',
                      fontWeight: 600,
                    }}>
                      {counts ? `Completed${score !== undefined ? ` ${score}%` : ''}` : 'Done \u00b7 practice'}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upcoming */}
        <div style={{ ...cardStyle, flex: '1 1 340px', minWidth: 280 }}>
          <h3 style={{ margin: '0 0 14px 0', borderBottom: '1px solid var(--c-line)', paddingBottom: 8 }}>
            Up Next
          </h3>
          {nextLocked.length === 0 ? (
            <p style={{ color: 'var(--c-meta)', fontSize: 14 }}>All lessons started!</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {nextLocked.map((l) => (
                <li key={l.id} style={listItemStyle}>
                  <span style={{ flex: 1, fontWeight: 500 }}>{l.title}</span>
                  <span style={{
                    fontSize: 12,
                    color: 'var(--x-94a3b8)',
                    background: 'color-mix(in srgb, var(--x-94a3b8) 12.0%, transparent)',
                    border: '1px solid color-mix(in srgb, var(--x-94a3b8) 30.0%, transparent)',
                    borderRadius: 999,
                    padding: '2px 10px',
                    fontWeight: 600,
                  }}>
                    {progress.states[l.id] === 'started' ? 'In progress' : 'Not started'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Per-unit breakdown */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 14px 0', borderBottom: '1px solid var(--c-line)', paddingBottom: 8 }}>
          By Unit
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {unitEntries.map(([unitName, data]) => {
            const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            return (
              <div key={unitName}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{unitName}</span>
                  <span style={{ color: 'var(--c-meta)' }}>
                    {data.completed === data.total ? '✓ Done' : data.completed + data.started === 0 ? 'Not started' : `${data.completed} of ${data.total}`} 
                  </span>
                </div>
                {data.completed + data.started > 0 && data.completed < data.total && <div style={unitBarOuter}>
                  <div
                    style={{
                      ...unitBarInner,
                      width: `${pct}%`,
                    }}
                  />
                </div>}
              </div>
            );
          })}
        </div>
      </div>

      <Link href="/" style={{ ...linkStyle, display: 'inline-block', marginTop: 8 }}>
        Back to lessons
      </Link>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 960,
  // body is display:flex, so without width:100% + minWidth:0 this item sizes to its widest child and
  // pushes the whole page sideways on a phone.
  width: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
  margin: '0 auto',
  padding: '24px 20px 48px',
};

const navStyle: React.CSSProperties = {
  marginBottom: 20,
  fontSize: 13,
  color: 'var(--c-meta)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const linkStyle: React.CSSProperties = {
  color: 'var(--brand)',
  textDecoration: 'none',
};

const cardStyle: React.CSSProperties = {
  background: 'var(--c-deep)',
  border: '1px solid var(--c-line)',
  borderRadius: 8,
  padding: 20,
  marginBottom: 16,
};

const progressBarOuter: React.CSSProperties = {
  width: '100%',
  height: 10,
  background: 'var(--c-line)',
  borderRadius: 999,
  overflow: 'hidden',
};

const progressBarInner: React.CSSProperties = {
  height: '100%',
  background: 'var(--c-green)',
  borderRadius: 999,
  transition: 'width 0.3s ease',
};

const unitBarOuter: React.CSSProperties = {
  width: '100%',
  height: 6,
  background: 'color-mix(in srgb, var(--c-line) 60.0%, transparent)',
  borderRadius: 999,
  overflow: 'hidden',
};

const unitBarInner: React.CSSProperties = {
  height: '100%',
  background: 'var(--c-purple)',
  borderRadius: 999,
  transition: 'width 0.3s ease',
};

const listItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 0',
  borderBottom: '1px solid color-mix(in srgb, var(--c-line) 40.0%, transparent)',
};
