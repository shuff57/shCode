'use client';

// Who is behind, and on what. Reads GET /api/classes/[id]/past-due, which
// resolves each lesson's due date through the module inheritance chain and
// then checks lesson_state — see that file for why it can't be one query.
//
// Renders nothing but a one-line note when the class has no due dates set,
// so the section is harmless on a class that never uses them.

import { useEffect, useState } from 'react';
import { formatDue } from '../lib/due-dates';

interface OverdueLesson {
  lessonId: string;
  title: string;
  dueAt: number;
}

interface StudentRow {
  email: string;
  pastDue: number;
  lessons: OverdueLesson[];
  truncated: boolean;
}

interface PastDueData {
  asOf: number;
  lessonCount: number;
  students: StudentRow[];
  warning?: string;
}

const C = { border: '#44475a', dim: '#6272a4', text: '#f8f8f2', late: '#ff5555', ok: '#50fa7b' };

export default function PastDuePanel({ classId }: { classId: string }) {
  const [data, setData] = useState<PastDueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch(`/api/classes/${classId}/past-due`, { credentials: 'same-origin' });
        if (!alive) return;
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `HTTP ${res.status}`);
          return;
        }
        setData((await res.json()) as PastDueData);
      } catch {
        if (alive) setError('Could not load past-due data.');
      }
    })();
    return () => { alive = false; };
  }, [classId]);

  if (error) return <p style={{ color: C.late, fontSize: 13 }}>{error}</p>;
  if (!data) return <p style={{ color: C.dim, fontSize: 13 }}>Loading…</p>;
  if (data.warning) return <p style={{ color: C.dim, fontSize: 13 }}>{data.warning}</p>;

  if (data.lessonCount === 0) {
    return (
      <p style={{ color: C.dim, fontSize: 13, margin: 0 }}>
        Nothing is past due — either no due dates are set for this class yet, or every deadline is
        still ahead.
      </p>
    );
  }

  const behind = data.students.filter((s) => s.pastDue > 0);

  return (
    <div>
      <p style={{ color: C.dim, fontSize: 13, margin: '0 0 12px 0' }}>
        {data.lessonCount} lesson{data.lessonCount === 1 ? '' : 's'} past due ·{' '}
        {behind.length} of {data.students.length} student{data.students.length === 1 ? '' : 's'} behind.
        Nothing is locked; this is a reporting view only.
      </p>

      {behind.length === 0 ? (
        <p style={{ color: C.ok, fontSize: 13, margin: 0 }}>Everyone is caught up.</p>
      ) : (
        behind.map((student) => (
          <div key={student.email} style={{ borderBottom: `1px solid ${C.border}`, padding: '6px 0' }}>
            <button
              type="button"
              onClick={() => setOpen(open === student.email ? null : student.email)}
              style={{
                background: 'none', border: 'none', color: C.text, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, padding: 0, width: '100%',
                fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span style={{ flex: 1 }}>{student.email}</span>
              <span style={{ color: C.late, fontWeight: 600 }}>
                {student.pastDue} past due
              </span>
            </button>

            {open === student.email && (
              <ul style={{ margin: '8px 0 8px 12px', padding: 0, listStyle: 'none' }}>
                {student.lessons.map((lesson) => (
                  <li key={lesson.lessonId} style={{ fontSize: 12, color: C.dim, padding: '2px 0' }}>
                    <span style={{ color: C.text }}>{lesson.title}</span> · was due {formatDue(lesson.dueAt)}
                  </li>
                ))}
                {student.truncated && (
                  <li style={{ fontSize: 12, color: C.dim, padding: '2px 0' }}>
                    … and {student.pastDue - student.lessons.length} more
                  </li>
                )}
              </ul>
            )}
          </div>
        ))
      )}
    </div>
  );
}
