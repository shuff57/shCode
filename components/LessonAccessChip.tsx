'use client';

// A per-lesson roster-checkbox control. Sits next to the Opens and Due
// fields on a lesson row in the teacher due-dates panel. Two kinds:
//
//   'early' — bypasses the Opens lock. Lets a named student into a lesson
//             before it opens for everyone else. Writes lesson_access_overrides
//             (0024) via /api/classes/[id]/lesson-access.
//   'late'  — clears the Due date. A named student's work on this lesson
//             never reads as late (no red badge, no past-due flag) — Due
//             never blocked submission to begin with, this just stops it
//             from being FLAGGED. Writes lesson_due_waivers (0025) via
//             /api/classes/[id]/lesson-due-waiver.
//
// This is deliberately a DIFFERENT shape from DueDateChip: a due/open date
// is one value with inheritance (unit -> module -> lesson), but a grant here
// is a roster of individual students with no inheritance at all — a teacher
// picks named students, not a scope. So this opens onto a checkbox list, not
// a calendar.
//
// Nothing here enforces anything server-side. A grant flips one student's
// answer client-side — lib/due-dates.ts's lessonAvailability() for 'early',
// resolveDue() for 'late' — same trust boundary the underlying lock already
// has (see each route file's own comment).

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { UserCheck, Clock } from 'lucide-react';

const C = {
  dim: '#6272a4',
  text: '#f8f8f2',
  accent: '#50fa7b',
  late: '#f1fa8c',
  border: '#44475a',
  bg: '#282a36',
  raised: '#343746',
};

interface RosterStudent {
  student_email: string;
}

const PANEL_W = 260;

type Kind = 'early' | 'late';

const KIND: Record<
  Kind,
  { endpoint: string; icon: typeof UserCheck; label: string; color: string; title: (n: number) => string; desc: (title: string) => string }
> = {
  early: {
    endpoint: 'lesson-access',
    icon: UserCheck,
    label: 'early access',
    color: C.accent,
    title: (n) => (n > 0 ? `${n} student${n === 1 ? '' : 's'} let in early. Click to manage.` : 'Let a specific student into this lesson before it opens for everyone else'),
    desc: (title) => `Checked students can open ${title} before it opens for everyone else.`,
  },
  late: {
    endpoint: 'lesson-due-waiver',
    icon: Clock,
    label: 'late access',
    color: C.late,
    title: (n) => (n > 0 ? `${n} student${n === 1 ? '' : 's'} excused from being marked late. Click to manage.` : 'Clear this lesson’s due date for a specific student — nothing about it reads as late for them'),
    desc: (title) => `Checked students' work on ${title} never shows as late — no badge, no past-due flag.`,
  },
};

export interface LessonAccessChipProps {
  classId: string;
  lessonId: string;
  lessonTitle: string;
  kind: Kind;
}

export default function LessonAccessChip({ classId, lessonId, lessonTitle, kind }: LessonAccessChipProps) {
  const cfg = KIND[kind];
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
        fetch(`/api/classes/${classId}/${cfg.endpoint}?lessonId=${encodeURIComponent(lessonId)}`, {
          credentials: 'include',
        }),
      ]);
      if (!classRes.ok) throw new Error(`class GET ${classRes.status}`);
      if (!accessRes.ok) throw new Error(`${cfg.endpoint} GET ${accessRes.status}`);
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
      const res = await fetch(`/api/classes/${classId}/${cfg.endpoint}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries: [{ studentEmail: email, lessonId, granted: next }] }),
      });
      if (!res.ok) throw new Error(`${cfg.endpoint} PUT ${res.status}`);
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
  const Icon = cfg.icon;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={cfg.title(count)}
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
          color: count > 0 ? cfg.color : C.dim,
          cursor: 'pointer',
          fontSize: 12,
          fontFamily: 'inherit',
          padding: '1px 5px',
        }}
      >
        <Icon size={12} strokeWidth={2} />
        {count > 0 ? count : cfg.label}
      </button>

      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={`${kind === 'early' ? 'Early' : 'Late'} access for ${lessonTitle}`}
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
              <div style={{ fontWeight: 600, fontSize: 12 }}>
                {kind === 'early' ? 'Early access' : 'Late access, no penalty'}
              </div>
              <div style={{ color: C.dim, fontSize: 11, marginTop: 2 }}>{cfg.desc(lessonTitle)}</div>
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
