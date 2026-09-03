'use client';

// Teacher-facing date editor for one class. Mounted on /teacher?class=<id>
// alongside AnnouncementsPanel, whose shape this follows.
//
// TWO dates per row, and they are not the same kind of thing:
//
//   Opens — "available after". A GATE. Before it, a student cannot open the
//           lesson at all. Writes class_open_dates.
//   Due   — advisory. A badge, and what the gradebook compares against. A
//           past-due lesson still opens and still submits. Writes
//           class_due_dates.
//
// Both inherit the same way (lesson overrides module overrides unit) and both
// take a time of day, so they share one <DateTimeField> and one write path
// parameterised by which endpoint it hits.
//
// Collapsed to modules by default. There are 512 lesson folders in the course;
// rendering every date input at once is both unusable and slow, so a module's
// lessons only mount when you open it.
//
// Writes go straight through on change — one PUT per edit, optimistic locally.
// "Apply to all lessons" is the one multi-row write: it sets the module date
// and deletes every child override in the same batch, which is why the API
// takes an entries array rather than a single row.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import LessonAccessChip from './LessonAccessChip';
import {
  buildDueIndex,
  buildOpenIndex,
  formatDue,
  formatDueTime,
  moduleDueSummary,
  moduleIdFromTitle,
  type DueDateRow,
  type DueScope,
  type OpenDateRow,
} from '../lib/due-dates-core';

interface ManifestLesson {
  id: string;
  title: string;
  unit: string | null;
  category: string | null;
}

// Both endpoints echo back date + time already split for the inputs, so the
// panel never redoes the timezone math the server owns.
interface ApiDate {
  scope: DueScope;
  scopeId: string;
  /** epoch ms — due_at or open_at depending on which list this came from */
  at: number;
  date: string;
  time: string;
}

interface ModuleGroup {
  moduleId: string;   // "1.1"
  label: string;      // "1.1 Software Lifecycle"
  unitId: string;     // "Unit 1: JavaScript Fundamentals"
  lessons: { id: string; title: string }[];
}

interface UnitGroup {
  unitId: string;
  modules: ModuleGroup[];
}

// Which of the two date kinds a control is editing. Every write, index and
// summary below is parameterised by this rather than duplicated.
type Kind = 'open' | 'due';

const ENDPOINT: Record<Kind, string> = { open: 'open-dates', due: 'due-dates' };

const C = {
  border: '#44475a',
  dim: '#6272a4',
  text: '#f8f8f2',
  input: '#282a36',
  accent: '#8be9fd',
  warn: '#ffb86c',
  open: '#bd93f9',
};

const dateInput: React.CSSProperties = {
  background: C.input,
  color: C.text,
  border: `1px solid ${C.border}`,
  borderRadius: 4,
  padding: '4px 6px',
  fontSize: 13,
  fontFamily: 'inherit',
  colorScheme: 'dark',
};

const timeInput: React.CSSProperties = { ...dateInput, width: 96 };

function numericCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true });
}

// Manifest -> Unit -> Module -> lessons, each level in course order.
function groupLessons(lessons: ManifestLesson[]): UnitGroup[] {
  const modules = new Map<string, ModuleGroup>();

  for (const lesson of lessons) {
    const moduleId = moduleIdFromTitle(lesson.title ?? '');
    if (!moduleId) continue; // unnumbered lessons have no module to hang off
    const unitId = lesson.category ?? 'Other';
    const key = `${unitId}::${moduleId}`;
    let group = modules.get(key);
    if (!group) {
      group = { moduleId, label: lesson.unit ?? moduleId, unitId, lessons: [] };
      modules.set(key, group);
    }
    group.lessons.push({ id: lesson.id, title: lesson.title });
  }

  const units = new Map<string, UnitGroup>();
  for (const group of modules.values()) {
    group.lessons.sort((a, b) => numericCompare(a.title, b.title));
    let unit = units.get(group.unitId);
    if (!unit) {
      unit = { unitId: group.unitId, modules: [] };
      units.set(group.unitId, unit);
    }
    unit.modules.push(group);
  }

  const out = [...units.values()];
  for (const unit of out) unit.modules.sort((a, b) => numericCompare(a.moduleId, b.moduleId));
  out.sort((a, b) => numericCompare(a.modules[0]?.moduleId ?? '', b.modules[0]?.moduleId ?? ''));
  return out;
}

// One date + time pair. The time input is disabled until a date exists,
// because a time with no date has nothing to write — the server takes the
// pair or nothing, and a lone time silently doing nothing is worse than a
// control that says it isn't ready.
function DateTimeField({
  label,
  color,
  row,
  onWrite,
  onClear,
  ariaSuffix,
}: {
  label: string;
  color: string;
  row: ApiDate | undefined;
  onWrite: (date: string | null, time: string | null) => void;
  onClear?: () => void;
  ariaSuffix: string;
}) {
  const date = row?.date ?? '';
  const time = row?.time ?? '';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 11, color, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
        {label}
      </span>
      <input
        type="date"
        value={date}
        onChange={(e) => {
          const value = e.target.value;
          // Clearing the date clears the whole row — there is no such thing
          // as a time-only entry.
          onWrite(value === '' ? null : value, value === '' ? null : time || null);
        }}
        style={dateInput}
        aria-label={`${label} date for ${ariaSuffix}`}
      />
      <input
        type="time"
        value={time}
        disabled={date === ''}
        onChange={(e) => {
          const value = e.target.value;
          if (date === '') return;
          onWrite(date, value === '' ? null : value);
        }}
        style={{ ...timeInput, opacity: date === '' ? 0.4 : 1 }}
        aria-label={`${label} time for ${ariaSuffix}`}
        title={date === '' ? 'Set a date first' : undefined}
      />
      {onClear && row && (
        <button
          type="button"
          title={`Clear this ${label.toLowerCase()} override — the lesson goes back to the module's date`}
          onClick={onClear}
          style={{
            background: 'none', border: 'none', color: C.dim, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', padding: 2,
          }}
        >
          <X size={14} />
        </button>
      )}
    </span>
  );
}

export default function DueDatesPanel({ classId }: { classId: string }) {
  const [lessons, setLessons] = useState<ManifestLesson[]>([]);
  const [dates, setDates] = useState<Record<Kind, ApiDate[]>>({ open: [], due: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  // Both endpoints, one shape. The GET bodies differ only in the key they
  // hang the array off and the name of the timestamp field.
  const fetchKind = useCallback(
    async (kind: Kind): Promise<ApiDate[]> => {
      const res = await fetch(`/api/classes/${classId}/${ENDPOINT[kind]}`, { credentials: 'same-origin' });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        dueDates?: { scope: DueScope; scopeId: string; dueAt: number; date: string; time: string }[];
        openDates?: { scope: DueScope; scopeId: string; openAt: number; date: string; time: string }[];
      };
      const rows = kind === 'due' ? data.dueDates ?? [] : data.openDates ?? [];
      return rows.map((r) => ({
        scope: r.scope,
        scopeId: r.scopeId,
        at: 'dueAt' in r ? r.dueAt : (r as { openAt: number }).openAt,
        date: r.date,
        time: r.time,
      }));
    },
    [classId],
  );

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [manifestRes, openRows, dueRows] = await Promise.all([
          fetch('/lessons-manifest.json'),
          fetchKind('open'),
          fetchKind('due'),
        ]);
        if (!alive) return;
        if (manifestRes.ok) {
          const data = (await manifestRes.json()) as { lessons: ManifestLesson[] };
          if (alive) setLessons(data.lessons ?? []);
        }
        if (alive) setDates({ open: openRows, due: dueRows });
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : 'Could not load dates.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [classId, fetchKind]);

  const units = useMemo(() => groupLessons(lessons), [lessons]);

  const byKey = useMemo(() => {
    const build = (rows: ApiDate[]) => {
      const map = new Map<string, ApiDate>();
      for (const row of rows) map.set(`${row.scope}:${row.scopeId}`, row);
      return map;
    };
    return { open: build(dates.open), due: build(dates.due) };
  }, [dates]);

  // moduleDueSummary is index-shaped, not due-specific, so the open dates run
  // through the very same summary logic — "Mixed", the range, the override
  // count are all one implementation.
  const index = useMemo(
    () => ({
      due: buildDueIndex(dates.due.map((d): DueDateRow => ({ scope: d.scope, scopeId: d.scopeId, dueAt: d.at }))),
      open: buildOpenIndex(dates.open.map((d): OpenDateRow => ({ scope: d.scope, scopeId: d.scopeId, openAt: d.at }))),
    }),
    [dates],
  );

  // One write path for every edit. `date: null` deletes the row.
  const write = useCallback(
    async (kind: Kind, entries: { scope: DueScope; scopeId: string; date: string | null; time?: string | null }[]) => {
      if (entries.length === 0) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/classes/${classId}/${ENDPOINT[kind]}`, {
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
        // Re-read rather than patch locally: the server owns the timezone
        // conversion, so the instant for a date we just sent is not ours to
        // guess. Only the kind we wrote is re-read — the other is untouched.
        const fresh = await fetchKind(kind);
        setDates((prev) => ({ ...prev, [kind]: fresh }));
      } catch {
        setError('Save failed — check your connection.');
      } finally {
        setSaving(false);
      }
    },
    [classId, fetchKind],
  );

  const toggle = (moduleId: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  if (loading) return <p style={{ color: C.dim }}>Loading dates…</p>;

  return (
    <div>
      <p style={{ color: C.dim, fontSize: 13, margin: '0 0 6px 0' }}>
        A module&apos;s date applies to every lesson inside it. Give one lesson its own date and the
        module reads <strong>Mixed</strong>; clear that date and the lesson goes back to inheriting.
      </p>
      <p style={{ color: C.dim, fontSize: 13, margin: '0 0 14px 0' }}>
        <strong style={{ color: C.open }}>Opens</strong> is a lock: before it, students see the lesson
        greyed out with the date on it and cannot open it. Leave it blank and the lesson is available
        immediately, which is how all 512 lessons behave today.{' '}
        <strong>Due</strong> never locks — a past-due lesson still opens and still submits. Set a date
        and leave the time blank and Opens starts at midnight, Due lands at 11:59 PM. All times are
        school time.
      </p>

      {error && (
        <p style={{ color: '#ff5555', fontSize: 13, marginBottom: 12 }}>{error}</p>
      )}
      {saving && <p style={{ color: C.dim, fontSize: 12, marginBottom: 12 }}>Saving…</p>}

      {units.length === 0 && <p style={{ color: C.dim }}>No lessons found.</p>}

      {units.map((unit) => (
        <div key={unit.unitId} style={{ marginBottom: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 8 }}>
            {unit.unitId}
          </div>

          {unit.modules.map((mod) => {
            const lessonIds = mod.lessons.map((l) => l.id);
            const dueSummary = moduleDueSummary(index.due, mod.moduleId, lessonIds, mod.unitId);
            const openSummary = moduleDueSummary(index.open, mod.moduleId, lessonIds, mod.unitId);
            const isOpen = open.has(mod.moduleId);

            // "Set the module date, drop every child override" — the one
            // multi-row write, and the reason the API takes an array.
            const applyToAll = (kind: Kind) => {
              const own = byKey[kind].get(`module:${mod.moduleId}`);
              if (!own) return;
              void write(kind, [
                { scope: 'module', scopeId: mod.moduleId, date: own.date, time: own.time },
                ...mod.lessons
                  .filter((l) => byKey[kind].has(`lesson:${l.id}`))
                  .map((l) => ({ scope: 'lesson' as DueScope, scopeId: l.id, date: null })),
              ]);
            };

            return (
              <div key={mod.moduleId} style={{ borderBottom: `1px solid ${C.border}`, padding: '8px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => toggle(mod.moduleId)}
                    aria-expanded={isOpen}
                    style={{
                      background: 'none', border: 'none', color: C.text, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: 0,
                      fontSize: 14, fontFamily: 'inherit', flex: '1 1 240px', textAlign: 'left',
                    }}
                  >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {mod.label}
                    <span style={{ color: C.dim, fontSize: 12 }}>
                      ({mod.lessons.length})
                    </span>
                  </button>

                  <DateTimeField
                    label="Opens"
                    color={C.open}
                    row={byKey.open.get(`module:${mod.moduleId}`)}
                    onWrite={(date, time) => { void write('open', [{ scope: 'module', scopeId: mod.moduleId, date, time }]); }}
                    ariaSuffix={`module ${mod.moduleId}`}
                  />

                  <DateTimeField
                    label="Due"
                    color={C.dim}
                    row={byKey.due.get(`module:${mod.moduleId}`)}
                    onWrite={(date, time) => { void write('due', [{ scope: 'module', scopeId: mod.moduleId, date, time }]); }}
                    ariaSuffix={`module ${mod.moduleId}`}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', margin: '6px 0 0 22px' }}>
                  {openSummary.kind !== 'none' && (
                    <span style={{ fontSize: 12, color: openSummary.kind === 'mixed' ? C.warn : C.open }}>
                      {openSummary.kind === 'mixed'
                        ? `Opens: mixed · ${openSummary.overrides} override${openSummary.overrides === 1 ? '' : 's'}`
                        : openSummary.dueAt !== null
                          ? `Opens: ${formatDueTime(openSummary.dueAt)}`
                          : ''}
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: dueSummary.kind === 'mixed' ? C.warn : C.dim }}>
                    {dueSummary.kind === 'mixed'
                      ? `Due: mixed · ${dueSummary.overrides} override${dueSummary.overrides === 1 ? '' : 's'}`
                      : dueSummary.kind === 'single' && dueSummary.dueAt !== null
                        ? `Due: ${formatDueTime(dueSummary.dueAt)} for all lessons`
                        : 'No due date'}
                  </span>

                  {openSummary.kind === 'mixed' && openSummary.ownDueAt !== null && (
                    <button
                      type="button"
                      onClick={() => applyToAll('open')}
                      style={{
                        background: 'none', border: `1px solid ${C.border}`, color: C.open,
                        borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Apply this Opens to all
                    </button>
                  )}

                  {dueSummary.kind === 'mixed' && dueSummary.ownDueAt !== null && (
                    <button
                      type="button"
                      onClick={() => applyToAll('due')}
                      style={{
                        background: 'none', border: `1px solid ${C.border}`, color: C.warn,
                        borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Apply {formatDue(dueSummary.ownDueAt)} to all
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div style={{ margin: '10px 0 6px 22px' }}>
                    {mod.lessons.map((lesson) => {
                      const openRow = byKey.open.get(`lesson:${lesson.id}`);
                      const dueRow = byKey.due.get(`lesson:${lesson.id}`);
                      return (
                        <div
                          key={lesson.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', flexWrap: 'wrap' }}
                        >
                          <span
                            style={{
                              flex: '1 1 240px',
                              fontSize: 13,
                              color: openRow || dueRow ? C.text : C.dim,
                            }}
                          >
                            {lesson.title}
                            {!openRow && !dueRow && (
                              <span style={{ fontSize: 12, color: C.dim }}> · inherits</span>
                            )}
                          </span>

                          <DateTimeField
                            label="Opens"
                            color={C.open}
                            row={openRow}
                            onWrite={(date, time) => { void write('open', [{ scope: 'lesson', scopeId: lesson.id, date, time }]); }}
                            onClear={() => { void write('open', [{ scope: 'lesson', scopeId: lesson.id, date: null }]); }}
                            ariaSuffix={lesson.title}
                          />

                          <DateTimeField
                            label="Due"
                            color={C.dim}
                            row={dueRow}
                            onWrite={(date, time) => { void write('due', [{ scope: 'lesson', scopeId: lesson.id, date, time }]); }}
                            onClear={() => { void write('due', [{ scope: 'lesson', scopeId: lesson.id, date: null }]); }}
                            ariaSuffix={lesson.title}
                          />

                          <LessonAccessChip classId={classId} lessonId={lesson.id} lessonTitle={lesson.title} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
