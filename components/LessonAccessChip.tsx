'use client';

// A per-lesson "let this student in early" control. Sits next to the Opens
// and Due fields on a lesson row in the teacher due-dates panel.
//
// This is deliberately a DIFFERENT shape from DueDateChip: a due/open date
// is one value with inheritance (unit -> module -> lesson), but early access
// is a roster of individual grants with no inheritance at all — a teacher
// picks named students, not a scope. So this opens onto a checkbox list, not
// a calendar.
//
// Nothing here enforces anything server-side. A grant here flips one
// student's lib/due-dates.ts lessonAvailability() answer to `available: true`
// for this one lesson, client-side, same trust boundary the open-date lock
// itself already has (functions/api/classes/[id]/lesson-access/index.ts's own
// comment, migrations/0024).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserCheck } from 'lucide-react';

const C = {
  dim: '#6272a4',
  text: '#f8f8f2',
  accent: '#50fa7b',
  border: '#44475a',
  bg: '#282a36',
  raised: '#343746',
};

interface RosterStudent {
  student_email: string;
}

const PANEL_W = 260;

export interface LessonAccessChipProps {
  classId: string;
  lessonId: string;
  lessonTitle: string;
}

export default function LessonAccessChip({ classId, lessonId, lessonTitle }: LessonAccessChipProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roster, setRoster] = useState<string[] | null>(null);
  const [granted, setGranted] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null); // email currently being toggled
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const below = r.bottom + 6;
    const PANEL_H = 320;
    const top = below + PANEL_H > window.innerHeight ? Math.max(6, r.top - PANEL_H - 6) : below;
    const left = Math.min(Math.max(6, r.left), window.innerWidth - PANEL_W - 6);
    setPos({ top, left });
  }, [open]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [classRes, accessRes] = await Promise.all([
        fetch(`/api/classes/${classId}`, { credentials: 'include' }),
        fetch(`/api/classes/${classId}/lesson-access?lessonId=${encodeURIComponent(lessonId)}`, {
          credentials: 'include',
        }),
      ]);
      if (!classRes.ok) throw new Error(`class GET ${classRes.status}`);
      if (!accessRes.ok) throw new Error(`lesson-access GET ${accessRes.status}`);
      const classData = (await classRes.json()) as { roster?: RosterStudent[] };
      const accessData = (await accessRes.json()) as { studentEmails?: string[] };
      setRoster((classData.roster ?? []).map((r) => r.student_email).sort());
      setGranted(new Set(accessData.studentEmails ?? []));
    } catch {
      setError('Could not load the roster.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async (email: string) => {
    const next = !granted.has(email);
    setSaving(email);
    // Optimistic — the roster is small and the common case is a click that
    // succeeds; a failure below reverts it rather than making every click
    // wait a round trip before showing anything.
    setGranted((prev) => {
      const s = new Set(prev);
      if (next) s.add(email);
      else s.delete(email);
      return s;
    });
    try {
      const res = await fetch(`/api/classes/${classId}/lesson-access`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: [{ studentEmail: email, lessonId, granted: next }] }),
      });
      if (!res.ok) throw new Error(`lesson-access PUT ${res.status}`);
    } catch {
      setGranted((prev) => {
        const s = new Set(prev);
        if (next) s.delete(email);
        else s.add(email);
        return s;
      });
      setError('Could not save that — try again.');
    } finally {
      setSaving(null);
    }
  };

  const count = granted.size;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={
          count > 0
            ? `${count} student${count === 1 ? '' : 's'} let in early on this lesson. Click to manage.`
            : 'Let a specific student into this lesson before it opens for everyone else'
        }
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => {
            const next = !v;
            if (next && roster === null) void load();
            return next;
          });
        }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          background: 'none',
          border: `1px solid ${count > 0 ? C.border : 'transparent'}`,
          borderRadius: 4,
          color: count > 0 ? C.accent : C.dim,
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: 'inherit',
          padding: '1px 5px',
        }}
      >
        <UserCheck size={12} strokeWidth={2} />
        {count > 0 ? count : 'early access'}
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`Early access for ${lessonTitle}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: pos.top,
              left: pos.left,
              width: PANEL_W,
              maxHeight: 320,
              display: 'flex',
              flexDirection: 'column',
              background: C.bg,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
              zIndex: 1000,
              fontSize: 13,
              color: C.text,
              fontFamily: 'inherit',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 600, fontSize: 12 }}>Early access</div>
              <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>
                Checked students can open {lessonTitle} before it opens for everyone else.
              </div>
            </div>
            <div style={{ overflowY: 'auto', padding: '4px 0' }}>
              {loading && <div style={{ padding: '10px 12px', color: C.dim }}>Loading…</div>}
              {error && <div style={{ padding: '10px 12px', color: '#ff5555' }}>{error}</div>}
              {!loading && roster !== null && roster.length === 0 && (
                <div style={{ padding: '10px 12px', color: C.dim }}>No students enrolled.</div>
              )}
              {!loading &&
                roster?.map((email) => (
                  <label
                    key={email}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '5px 12px',
                      cursor: saving === email ? 'wait' : 'pointer',
                      opacity: saving === email ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={granted.has(email)}
                      disabled={saving === email}
                      onChange={() => void toggle(email)}
                    />
                    <span style={{ fontSize: 12 }}>{email}</span>
                  </label>
                ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
