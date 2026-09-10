'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCurrentUser, type CurrentUser } from '../../lib/auth';
import { useLessonState } from '../../lib/progress';
import { sortLessons } from '../../lib/lesson-order';
import StudentGradebook from '../../components/StudentGradebook';

interface ManifestLesson {
  id: string;
  title: string;
  unit?: string;
  category?: string;
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
      <div style={containerStyle}>
        <p style={{ opacity: 0.6 }}>Loading...</p>
      </div>
    );
  }

  if (!user || !progress.authed) {
    return (
      <div style={containerStyle}>
        <nav style={navStyle}>
          <Link href="/" style={linkStyle}>Home</Link>
          <span style={{ opacity: 0.4 }}>›</span>
          <span style={{ opacity: 0.6 }}>Progress</span>
        </nav>
        <div style={cardStyle}>
          <h2 style={{ margin: 0 }}>Sign in to see your progress</h2>
          <p style={{ opacity: 0.6, marginTop: 12 }}>Your lesson completion and scores will appear here once you sign in.</p>
        </div>
      </div>
    );
  }

  const completedIds = manifest.lessons.filter((l) => progress.states[l.id] === 'completed').map((l) => l.id);
  const totalLessons = manifest.lessons.length;
  const completionPct = totalLessons > 0 ? Math.round((completedIds.length / totalLessons) * 100) : 0;

  // Average score across completed lessons that have a score
  const scoredIds = completedIds.filter((id) => progress.scores[id] !== undefined);
  const avgScore = scoredIds.length > 0
    ? Math.round(scoredIds.reduce((sum, id) => sum + (progress.scores[id] ?? 0), 0) / scoredIds.length)
    : null;

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

  // Next locked: first 5 incomplete lessons the student hasn't started
  const nextLocked = orderedLessons
    .filter((l) => !progress.states[l.id])
    .slice(0, 5);

  // Per-unit breakdown
  const unitMap = new Map<string, { completed: number; total: number; category?: string }>();
  for (const l of manifest.lessons) {
    const unitName = l.unit || 'Other';
    if (!unitMap.has(unitName)) {
      unitMap.set(unitName, { completed: 0, total: 0, category: l.category });
    }
    const entry = unitMap.get(unitName)!;
    entry.total++;
    if (progress.states[l.id] === 'completed') entry.completed++;
  }
  const unitEntries = Array.from(unitMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <div style={containerStyle}>
      <nav style={navStyle}>
        <Link href="/" style={linkStyle}>Home</Link>
        <span style={{ opacity: 0.4 }}>›</span>
        <span style={{ opacity: 0.6 }}>Progress</span>
      </nav>

      {/* Summary card */}
      <div style={cardStyle}>
        <h2 style={{ margin: 0, marginBottom: 12 }}>Progress</h2>
        <p style={{ fontSize: 18, fontWeight: 600, margin: '0 0 10px 0' }}>
          {completedIds.length} of {totalLessons} lessons completed
        </p>
        <div style={progressBarOuter}>
          <div
            style={{
              ...progressBarInner,
              width: `${completionPct}%`,
            }}
          />
        </div>
        <p style={{ opacity: 0.5, fontSize: 13, marginTop: 8 }}>
          {completionPct}% complete
        </p>
        {avgScore !== null && (
          <p style={{ margin: '12px 0 0 0', fontSize: 15 }}>
            Average score: <strong>{avgScore}%</strong>
          </p>
        )}
      </div>

      {/* Per-assignment gradebook — the student's own row of the same matrix
          the teacher reads from /api/classes/[id]/gradebook. */}
      <StudentGradebook lessons={manifest.lessons} />

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Recently completed */}
        <div style={{ ...cardStyle, flex: '1 1 340px', minWidth: 280 }}>
          <h3 style={{ margin: '0 0 14px 0', borderBottom: '1px solid #44475a', paddingBottom: 8 }}>
            Recently Completed
          </h3>
          {recentlyCompleted.length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: 14 }}>No lessons completed yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {recentlyCompleted.map((l) => {
                const score = progress.scores[l.id];
                return (
                  <li key={l.id} style={listItemStyle}>
                    <span style={{ flex: 1, fontWeight: 500 }}>{l.title}</span>
                    <span style={{
                      fontSize: 12,
                      color: '#50fa7b',
                      background: 'rgba(80,250,123,0.12)',
                      border: '1px solid rgba(80,250,123,0.3)',
                      borderRadius: 999,
                      padding: '2px 10px',
                      fontWeight: 600,
                    }}>
                      Completed{score !== undefined ? ` ${score}%` : ''}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upcoming */}
        <div style={{ ...cardStyle, flex: '1 1 340px', minWidth: 280 }}>
          <h3 style={{ margin: '0 0 14px 0', borderBottom: '1px solid #44475a', paddingBottom: 8 }}>
            Up Next
          </h3>
          {nextLocked.length === 0 ? (
            <p style={{ opacity: 0.5, fontSize: 14 }}>All lessons started!</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {nextLocked.map((l) => (
                <li key={l.id} style={listItemStyle}>
                  <span style={{ flex: 1, fontWeight: 500 }}>{l.title}</span>
                  <span style={{
                    fontSize: 12,
                    color: '#94a3b8',
                    background: 'rgba(148,163,184,0.12)',
                    border: '1px solid rgba(148,163,184,0.3)',
                    borderRadius: 999,
                    padding: '2px 10px',
                    fontWeight: 600,
                  }}>
                    Not started
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Per-unit breakdown */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 14px 0', borderBottom: '1px solid #44475a', paddingBottom: 8 }}>
          By Unit
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {unitEntries.map(([unitName, data]) => {
            const pct = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
            return (
              <div key={unitName}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{unitName}</span>
                  <span style={{ opacity: 0.6 }}>
                    {data.completed}/{data.total} ({pct}%)
                  </span>
                </div>
                <div style={unitBarOuter}>
                  <div
                    style={{
                      ...unitBarInner,
                      width: `${pct}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Link href="/" style={{ ...linkStyle, display: 'inline-block', marginTop: 8, opacity: 0.7 }}>
        Back to lessons
      </Link>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  maxWidth: 960,
  margin: '0 auto',
  padding: '24px 20px 48px',
};

const navStyle: React.CSSProperties = {
  marginBottom: 20,
  fontSize: 13,
  opacity: 0.6,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const linkStyle: React.CSSProperties = {
  color: '#5baafd',
  textDecoration: 'none',
};

const cardStyle: React.CSSProperties = {
  background: '#1e1f29',
  border: '1px solid #44475a',
  borderRadius: 8,
  padding: '20px 24px',
  marginBottom: 20,
};

const progressBarOuter: React.CSSProperties = {
  width: '100%',
  height: 10,
  background: '#44475a',
  borderRadius: 999,
  overflow: 'hidden',
};

const progressBarInner: React.CSSProperties = {
  height: '100%',
  background: '#50fa7b',
  borderRadius: 999,
  transition: 'width 0.3s ease',
};

const unitBarOuter: React.CSSProperties = {
  width: '100%',
  height: 6,
  background: 'rgba(68,71,90,0.6)',
  borderRadius: 999,
  overflow: 'hidden',
};

const unitBarInner: React.CSSProperties = {
  height: '100%',
  background: '#bd93f9',
  borderRadius: 999,
  transition: 'width 0.3s ease',
};

const listItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '8px 0',
  borderBottom: '1px solid rgba(68,71,90,0.4)',
};
