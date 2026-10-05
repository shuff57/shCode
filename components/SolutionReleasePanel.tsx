'use client';

// Teacher-facing control for one class: when do students who have used all their
// tries on a performance-assessment part get to see how it is solved? Mounted on
// /teacher?class=<id> beside DueDatesPanel, whose shape and write path this follows.
// Spec: .gauntlet/SPEC-attempt-caps.md, "Release".
//
// A solution is shown to a student only when BOTH hold: they have spent every try,
// AND the part is released here. Nothing is released until you say so. A release is
// an instant: "now" or a day and time (school time); it opens by itself when that
// time arrives, so a test day needs no one at the keyboard.
//
// Per test (module) you can release or hold every part at once; a part can still
// override its test. Writes go through PUT /api/classes/<id>/solution-releases and
// the panel re-reads afterwards: the server owns the timezone maths.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { moduleIdFromTitle } from '../lib/due-dates-core';
import {
  describeRelease,
  isHeldBack,
  isReleased,
  resolveReleaseAt,
  type ReleaseRow,
} from '../lib/solution-release-core';

interface ManifestLesson {
  id: string;
  title: string;
  unit: string | null;
}

interface Part {
  lessonId: string;
  cap: number;
  moduleId: string | null;
  usedAll: number;
}

interface ApiRelease {
  scope: 'module' | 'lesson';
  scopeId: string;
  releaseAt: number;
  held: boolean;
  date: string | null;
  time: string | null;
}

interface Payload {
  now: number;
  enrolled: number;
  parts: Part[];
  releases: ApiRelease[];
}

type Entry =
  | { scope: 'module' | 'lesson'; scopeId: string; now: true }
  | { scope: 'module' | 'lesson'; scopeId: string; hold: true }
  | { scope: 'module' | 'lesson'; scopeId: string; date: string | null; time?: string | null };

const C = {
  border: '#44475a',
  dim: '#6272a4',
  text: '#f8f8f2',
  input: '#282a36',
  accent: '#8be9fd',
  ok: '#50fa7b',
  warn: '#ffb86c',
  held: '#ff79c6',
};

const field: React.CSSProperties = {
  background: C.input,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 13,
  fontFamily: 'inherit',
  colorScheme: 'dark',
};

const btn = (color: string, disabled = false): React.CSSProperties => ({
  background: 'none',
  border: `1px solid ${color}`,
  borderRadius: 4,
  color,
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontSize: 13,
  padding: '3px 10px',
  opacity: disabled ? 0.45 : 1,
});

function numericCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

// The word and colour for a state. 'Held back' is a part that overrides a released test.
function stateLook(releaseAt: number | null, now: number): { text: string; color: string } {
  if (isHeldBack(releaseAt)) return { text: 'Not released (held back)', color: C.held };
  if (isReleased(releaseAt, now)) return { text: 'Released', color: C.ok };
  const text = describeRelease(releaseAt, now);
  return { text, color: text === 'Not released' ? C.dim : C.warn };
}

// A date + time pair and the button that applies it. Local state only; nothing is
// sent until "Release on" is pressed.
function ReleaseOn({
  label,
  onApply,
  disabled,
}: {
  label: string;
  onApply: (date: string, time: string) => void;
  disabled: boolean;
}) {
  const [date, setDate] = useState('');
  // A date always carries a time. Default 3:00 PM (after the school day), never midnight: a date
  // with no time used to open the solution at 12:00 AM, before the test was even sat.
  const [time, setTime] = useState('15:00');
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} aria-label={`Release date for ${label}`} />
      <input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        style={{ ...field, width: 116 }}
        aria-label={`Release time for ${label}`}
        title="School time. Defaults to 3:00 PM so the solution never opens before the test day is over."
        required
      />
      <button
        type="button"
        disabled={disabled || date === '' || time === ''}
        onClick={() => onApply(date, time)}
        style={btn(C.accent, disabled || date === '' || time === '')}
        title={date === '' ? 'Pick a date first' : time === '' ? 'Pick a time' : 'The solution opens on its own at this date and time (school time)'}
      >
        Release on this date
      </button>
    </span>
  );
}

export default function SolutionReleasePanel({ classId }: { classId: string }) {
  const [lessons, setLessons] = useState<ManifestLesson[]>([]);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch(`/api/classes/${classId}/solution-releases`, { credentials: 'same-origin' });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? `HTTP ${res.status}`);
    }
    setData((await res.json()) as Payload);
  }, [classId]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [manifestRes] = await Promise.all([fetch('/lessons-manifest.json'), load()]);
        if (alive && manifestRes.ok) {
          const m = (await manifestRes.json()) as { lessons: ManifestLesson[] };
          setLessons(m.lessons ?? []);
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not load releases.');
      }
    })();
    return () => { alive = false; };
  }, [load]);

  const write = useCallback(
    async (entries: Entry[]) => {
      if (entries.length === 0) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/classes/${classId}/solution-releases`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `Save failed (HTTP ${res.status})`);
          return;
        }
        await load();
      } catch {
        setError('Save failed. Check your connection.');
      } finally {
        setSaving(false);
      }
    },
    [classId, load],
  );

  const titleOf = useMemo(() => {
    const m = new Map(lessons.map((l) => [l.id, l] as const));
    return (id: string) => m.get(id)?.title ?? id;
  }, [lessons]);
  const unitOf = useMemo(() => {
    const m = new Map(lessons.map((l) => [moduleIdFromTitle(l.title) ?? '', l.unit ?? ''] as const));
    return (moduleId: string) => m.get(moduleId) || `Module ${moduleId}`;
  }, [lessons]);

  // Group parts by test (module), parts in course order.
  const modules = useMemo(() => {
    const byModule = new Map<string, Part[]>();
    for (const p of data?.parts ?? []) {
      const key = p.moduleId ?? moduleIdFromTitle(titleOf(p.lessonId)) ?? 'other';
      const list = byModule.get(key) ?? [];
      list.push(p);
      byModule.set(key, list);
    }
    return [...byModule.entries()]
      .sort(([a], [b]) => numericCompare(a, b))
      .map(([moduleId, parts]) => ({
        moduleId,
        parts: parts.sort((a, b) => numericCompare(titleOf(a.lessonId), titleOf(b.lessonId))),
      }));
  }, [data, titleOf]);

  if (!data) return error ? <p style={{ color: '#ff5555', fontSize: 13 }}>{error}</p> : <p style={{ color: C.dim }}>Loading…</p>;

  const rows: ReleaseRow[] = data.releases.map((r) => ({ scope: r.scope, scopeId: r.scopeId, releaseAt: r.releaseAt }));
  const hasRow = (scope: 'module' | 'lesson', scopeId: string) => rows.some((r) => r.scope === scope && r.scopeId === scopeId);
  const rowOf = (scope: 'module' | 'lesson', scopeId: string) => rows.find((r) => r.scope === scope && r.scopeId === scopeId) ?? null;

  const toggle = (moduleId: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });

  return (
    <div>
      <p style={{ color: C.dim, fontSize: 13, margin: '0 0 6px 0' }}>
        A student sees how a part is solved only after they have used all their tries <strong>and</strong> you release it
        here. Nothing is released until you say so. Pick <strong>Release now</strong>, or a date and time and it opens by
        itself then. A date always needs a time (it starts at 3:00 PM, school time). All times are school time.
      </p>
      <p style={{ color: C.dim, fontSize: 13, margin: '0 0 14px 0' }}>
        Releasing a whole test releases each of its parts; a single part can still be held back or given its own time.
      </p>
      {error && <p style={{ color: '#ff5555', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {saving && <p style={{ color: C.dim, fontSize: 12, marginBottom: 12 }}>Saving…</p>}
      {modules.length === 0 && <p style={{ color: C.dim }}>No parts with a solution yet.</p>}

      {modules.map(({ moduleId, parts }) => {
        const modRow = rowOf('module', moduleId);
        const modLook = stateLook(modRow ? modRow.releaseAt : null, data.now);
        const lessonRows = parts.filter((p) => hasRow('lesson', p.lessonId));
        // "Hold back" or a whole-test release also drops every part override, so the test reads as one state.
        const dropOverrides: Entry[] = lessonRows.map((p) => ({ scope: 'lesson', scopeId: p.lessonId, date: null }));
        const isOpen = open.has(moduleId);
        const allStates = parts.map((p) => resolveReleaseAt(rows, { lessonId: p.lessonId, moduleId, unitId: null }));
        const summary = allStates.every((a) => isReleased(a, data.now))
          ? { text: 'All parts released', color: C.ok }
          : allStates.some((a) => isReleased(a, data.now))
            ? { text: 'Some parts released', color: C.warn }
            : { text: modLook.text, color: modLook.color };
        return (
          <div key={moduleId} style={{ border: `1px solid ${C.border}`, borderRadius: 6, marginBottom: 12, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => toggle(moduleId)}
                aria-expanded={isOpen}
                style={{ background: 'none', border: 'none', color: C.text, cursor: 'pointer', fontSize: 14, fontWeight: 700, padding: 0, textAlign: 'left' }}
              >
                {isOpen ? '▾' : '▸'} {unitOf(moduleId)}
              </button>
              <span style={{ fontSize: 12, color: summary.color }}>{summary.text}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <button
                type="button"
                disabled={saving}
                style={btn(C.ok, saving)}
                onClick={() => void write([{ scope: 'module', scopeId: moduleId, now: true }, ...dropOverrides])}
                title="Every part of this test opens now for students who have used all their tries"
              >
                Release all parts now
              </button>
              <ReleaseOn
                label={unitOf(moduleId)}
                disabled={saving}
                onApply={(date, time) => void write([{ scope: 'module', scopeId: moduleId, date, time }, ...dropOverrides])}
              />
              <button
                type="button"
                disabled={saving || (!modRow && lessonRows.length === 0)}
                style={btn(C.held, saving || (!modRow && lessonRows.length === 0))}
                onClick={() => void write([{ scope: 'module', scopeId: moduleId, date: null }, ...dropOverrides])}
                title="Hides the solutions again for every part of this test, even for students who used all their tries"
              >
                Hold back all parts
              </button>
            </div>

            {isOpen && (
              <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
                {parts.map((p) => {
                  const own = rowOf('lesson', p.lessonId);
                  const at = resolveReleaseAt(rows, { lessonId: p.lessonId, moduleId, unitId: null });
                  const look = stateLook(at, data.now);
                  const inherited = !own && at !== null;
                  // Hold back: delete the part's own row when nothing above it would reopen it; otherwise hold it back.
                  const moduleRowReleases = !!modRow && !isHeldBack(modRow.releaseAt);
                  const takeBack = (): Entry =>
                    moduleRowReleases
                      ? { scope: 'lesson', scopeId: p.lessonId, hold: true }
                      : { scope: 'lesson', scopeId: p.lessonId, date: null };
                  return (
                    <div key={p.lessonId} style={{ borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{titleOf(p.lessonId)}</span>
                        <span style={{ fontSize: 12, color: look.color }}>
                          {look.text}
                          {inherited ? ' (from the whole test)' : ''}
                        </span>
                        <span style={{ fontSize: 12, color: C.dim }}>
                          {p.usedAll} of {data.enrolled} students have used all {p.cap} tries
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                        <button
                          type="button"
                          disabled={saving}
                          style={btn(C.ok, saving)}
                          onClick={() => void write([{ scope: 'lesson', scopeId: p.lessonId, now: true }])}
                        >
                          Release now
                        </button>
                        <ReleaseOn
                          label={titleOf(p.lessonId)}
                          disabled={saving}
                          onApply={(date, time) => void write([{ scope: 'lesson', scopeId: p.lessonId, date, time }])}
                        />
                        <button
                          type="button"
                          disabled={saving || at === null || isHeldBack(at)}
                          style={btn(C.held, saving || at === null || isHeldBack(at))}
                          onClick={() => void write([takeBack()])}
                          title="Hides this part's solution again, even for students who used all their tries"
                        >
                          Hold back
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
