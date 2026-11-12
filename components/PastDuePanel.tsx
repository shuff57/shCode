'use client';

// Who is behind, and on what. Reads GET /api/classes/[id]/past-due, which
// resolves each lesson's due date through the module inheritance chain and
// then checks lesson_state — see that file for why it can't be one query.
//
// Renders nothing but a one-line note when the class has no due dates set,
// so the section is harmless on a class that never uses them.

import { useEffect, useState } from 'react';
import { formatDue } from '../lib/due-dates';
import { errorText } from '../lib/http-error';

interface OverdueLesson {
  lessonId: string;
  title: string;
  dueAt: number;
}

interface StudentRow {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
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

const C = { border: 'var(--c-line)', dim: 'var(--c-meta)', text: 'var(--c-fg)', late: 'var(--c-red)', ok: 'var(--c-green)' };

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
          setError(`Could not load who is behind: ${(await errorText(res)).replace(/\.$/, '')}.`);
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
      {/* ux2 T6: the same count as the roster's Past due column and the class card (graded lessons only). */}
      <p style={{ color: C.dim, fontFamily: 'var(--font-prose)', fontSize: 14, lineHeight: 1.5, margin: '0 0 12px 0', maxWidth: '70ch' }}>
        {behind.length} of {data.students.length} student{data.students.length === 1 ? '' : 's'} behind: graded work past due
        and not done ({data.lessonCount} graded lesson{data.lessonCount === 1 ? ' has' : 's have'} passed {data.lessonCount === 1 ? 'its' : 'their'} due date).
        Readings and slides are not counted. Nothing is locked.
      </p>

      {behind.length === 0 ? (
        <p style={{ color: C.ok, fontSize: 13, margin: 0 }}>Everyone is caught up.</p>
      ) : (
        behind.map((student) => (
          <div key={student.email} style={{ borderBottom: `1px solid ${C.border}`, padding: '8px 0' }}>
            <button
              type="button"
              onClick={() => setOpen(open === student.email ? null : student.email)}
              aria-expanded={open === student.email}
              style={{
                background: 'none', border: 'none', color: C.text, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12, padding: 0, width: '100%',
                fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
              }}
            >
              <span style={{ flex: 1 }}>{[student.firstName, student.lastName].filter(Boolean).join(' ') || student.email}</span>
              <span style={{ color: C.late, fontWeight: 600 }}>
                {student.pastDue} graded past due
              </span>
            </button>

            {open === student.email && (
              <ul style={{ margin: '8px 0 8px 12px', padding: 0, listStyle: 'none' }}>
                {student.lessons.map((lesson) => (
                  <li key={lesson.lessonId} style={{ fontSize: 13, color: C.dim, padding: '4px 0' }}>
                    <span style={{ color: C.text }}>{lesson.title}</span> · was due {formatDue(lesson.dueAt)}
                  </li>
                ))}
                {student.truncated && (
                  <li style={{ fontSize: 13, color: C.dim, padding: '4px 0' }}>
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
