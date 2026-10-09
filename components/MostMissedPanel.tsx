'use client';

// "Most missed" on the Gradebook tab: which requirements in console labs this class keeps failing,
// and which students are still stuck on each. Data is best effort (students' browsers report each Run
// in batches to POST /api/requirement-events); it never feeds a grade. Fetched lazily, when the
// teacher opens the panel, from GET /api/classes/<id>/requirement-events (this class's enrolled
// students only). Lesson and requirement words come from the shipped manifest files.

import { useCallback, useState } from 'react';
import { useFeedback } from './FeedbackProvider';
import { errorText } from '../lib/http-error';

interface EventRow {
  studentEmail: string;
  firstName: string | null;
  lastName: string | null;
  lessonId: string;
  reqId: string;
  fails: number;
  firstPassAt: number | null;
}

interface TopRow {
  lessonId: string;
  reqId: string;
  studentsFailed: number;
  totalFails: number;
  studentsNotPast: number;
}

interface Payload {
  rows: EventRow[];
  topMissed: TopRow[];
  truncated?: boolean;
}

const MUTED = '#8393c4';
const BORDER = '#44475a';

const box: React.CSSProperties = { minWidth: 0, overflowWrap: 'anywhere' };

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

function who(r: EventRow): string {
  const name = [r.firstName, r.lastName].filter(Boolean).join(' ').trim();
  return name || r.studentEmail;
}

export default function MostMissedPanel({ classId, onOpenStudent }: { classId: string; onOpenStudent?: (email: string) => void }) {
  const { toast } = useFeedback();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [data, setData] = useState<Payload | null>(null);
  const [lessonTitle, setLessonTitle] = useState<Record<string, string>>({});
  const [reqTitle, setReqTitle] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [evRes, manRes, reqRes] = await Promise.all([
        fetch(`/api/classes/${encodeURIComponent(classId)}/requirement-events`),
        fetch('/lessons-manifest.json').catch(() => null),
        fetch('/lesson-requirements.json').catch(() => null),
      ]);
      if (!evRes.ok) {
        toast(`Could not load most-missed requirements: ${await errorText(evRes)}`, { kind: 'error' });
        return;
      }
      setData((await evRes.json()) as Payload);
      if (manRes && manRes.ok) {
        const m = (await manRes.json()) as { lessons?: { id: string; title: string }[] };
        setLessonTitle(Object.fromEntries((m.lessons ?? []).map((l) => [l.id, l.title])));
      }
      if (reqRes && reqRes.ok) {
        const q = (await reqRes.json()) as Record<string, { id: string; title: string }[]>;
        const flat: Record<string, string> = {};
        for (const [lid, list] of Object.entries(q)) for (const r of list) flat[`${lid}\u0000${r.id}`] = r.title;
        setReqTitle(flat);
      }
      setLoaded(true);
    } catch {
      toast('Could not load most-missed requirements: check your connection.', { kind: 'error' });
    } finally {
      setLoading(false);
    }
  }, [classId, toast]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !loaded && !loading) void load();
  };

  const flip = (key: string) =>
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key); else n.add(key);
      return n;
    });

  return (
    <div style={box}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls="most-missed-body"
        style={{ background: 'transparent', border: `1px solid ${BORDER}`, color: '#f8f8f2', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 14, maxWidth: '100%' }}
      >
        {open ? 'Hide most missed' : 'Show most missed'}
      </button>
      <p style={{ color: MUTED, fontSize: 13, margin: '8px 0 0', ...box }}>
        The checklist items students keep missing in console labs. It fills in as students run their code.
      </p>
      {open && (
        <div id="most-missed-body" style={{ marginTop: 12 }}>
          {loading && <p style={{ color: MUTED, margin: 0 }}>Loading...</p>}
          {!loading && loaded && data && data.topMissed.length === 0 && (
            <p style={{ color: MUTED, margin: 0 }}>Nothing yet: this fills in as students run labs.</p>
          )}
          {!loading && data && data.topMissed.length > 0 && (
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
              {data.topMissed.map((t) => {
                const key = `${t.lessonId}\u0000${t.reqId}`;
                const isOpen = expanded.has(key);
                const students = data.rows.filter((r) => r.lessonId === t.lessonId && r.reqId === t.reqId);
                return (
                  <li key={key} style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: 12, ...box }}>
                    <div style={{ color: MUTED, fontSize: 13, ...box }}>{lessonTitle[t.lessonId] ?? t.lessonId}</div>
                    <div style={{ color: '#f8f8f2', fontWeight: 600, margin: '2px 0 6px', ...box }}>{reqTitle[key] ?? t.reqId}</div>
                    <div style={{ color: '#f8f8f2', fontSize: 14, ...box }}>
                      {plural(t.studentsFailed, 'student', 'students')} stumbled, {plural(t.totalFails, 'miss', 'misses')} in all
                      {t.studentsNotPast > 0 ? `, ${t.studentsNotPast} still failing` : ', all have passed it since'}.
                    </div>
                    <button
                      type="button"
                      onClick={() => flip(key)}
                      aria-expanded={isOpen}
                      style={{ marginTop: 8, background: 'transparent', border: 'none', color: '#8be9fd', cursor: 'pointer', padding: 0, fontSize: 14, textDecoration: 'underline' }}
                    >
                      {isOpen ? 'Hide students' : 'Show students'}
                    </button>
                    {isOpen && (
                      <ul style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, display: 'grid', gap: 6 }}>
                        {students.map((r) => (
                          <li key={r.studentEmail} style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 12px', fontSize: 14, ...box }}>
                            {onOpenStudent ? (
                              <button
                                type="button"
                                onClick={() => onOpenStudent(r.studentEmail)}
                                title={`Open ${who(r)}'s progress`}
                                style={{ background: 'transparent', border: 'none', color: '#8be9fd', cursor: 'pointer', padding: 0, fontSize: 14, textDecoration: 'underline', textAlign: 'left', ...box }}
                              >
                                {who(r)}
                              </button>
                            ) : (
                              <span style={{ color: '#f8f8f2', ...box }}>{who(r)}</span>
                            )}
                            <span style={{ color: MUTED }}>{plural(r.fails, 'miss', 'misses')}</span>
                            <span style={{ color: r.firstPassAt === null ? '#ffb86c' : '#50fa7b' }}>
                              {r.firstPassAt === null ? 'still failing' : 'passed since'}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
          {data?.truncated && <p style={{ color: MUTED, fontSize: 13 }}>Showing the biggest part of a large set.</p>}
        </div>
      )}
    </div>
  );
}
