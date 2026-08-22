'use client';

// Teacher-facing due-date editor for one class. Mounted on /teacher?class=<id>
// alongside AnnouncementsPanel, whose shape this follows.
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
import {
  buildDueIndex,
  formatDue,
  moduleDueSummary,
  moduleIdFromTitle,
  type DueDateRow,
  type DueScope,
} from '../lib/due-dates-core';

interface ManifestLesson {
  id: string;
  title: string;
  unit: string | null;
  category: string | null;
}

interface ApiDueDate {
  scope: DueScope;
  scopeId: string;
  dueAt: number;
  date: string;
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

const C = {
  border: '#44475a',
  dim: '#6272a4',
  text: '#f8f8f2',
  input: '#282a36',
  accent: '#8be9fd',
  warn: '#ffb86c',
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

export default function DueDatesPanel({ classId }: { classId: string }) {
  const [lessons, setLessons] = useState<ManifestLesson[]>([]);
  const [dueDates, setDueDates] = useState<ApiDueDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const [manifestRes, dueRes] = await Promise.all([
          fetch('/lessons-manifest.json'),
          fetch(`/api/classes/${classId}/due-dates`, { credentials: 'same-origin' }),
        ]);
        if (!alive) return;
        if (manifestRes.ok) {
          const data = (await manifestRes.json()) as { lessons: ManifestLesson[] };
          if (alive) setLessons(data.lessons ?? []);
        }
        if (!dueRes.ok) {
          const body = (await dueRes.json().catch(() => ({}))) as { error?: string };
          if (alive) setError(body.error ?? `HTTP ${dueRes.status}`);
        } else {
          const data = (await dueRes.json()) as { dueDates: ApiDueDate[] };
          if (alive) setDueDates(data.dueDates ?? []);
        }
      } catch {
        if (alive) setError('Could not load due dates.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [classId]);

  const units = useMemo(() => groupLessons(lessons), [lessons]);

  const byKey = useMemo(() => {
    const map = new Map<string, ApiDueDate>();
    for (const row of dueDates) map.set(`${row.scope}:${row.scopeId}`, row);
    return map;
  }, [dueDates]);

  const index = useMemo(
    () => buildDueIndex(dueDates.map((d): DueDateRow => ({ scope: d.scope, scopeId: d.scopeId, dueAt: d.dueAt }))),
    [dueDates],
  );

  // One write path for every edit. `date: null` deletes the row.
  const write = useCallback(
    async (entries: { scope: DueScope; scopeId: string; date: string | null }[]) => {
      if (entries.length === 0) return;
      setSaving(true);
      setError(null);
      try {
        const res = await fetch(`/api/classes/${classId}/due-dates`, {
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
        // conversion, so dueAt for a date we just sent is not ours to guess.
        const fresh = await fetch(`/api/classes/${classId}/due-dates`, { credentials: 'same-origin' });
        if (fresh.ok) {
          const data = (await fresh.json()) as { dueDates: ApiDueDate[] };
          setDueDates(data.dueDates ?? []);
        }
      } catch {
        setError('Save failed — check your connection.');
      } finally {
        setSaving(false);
      }
    },
    [classId],
  );

  const toggle = (moduleId: string) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  };

  if (loading) return <p style={{ color: C.dim }}>Loading due dates…</p>;

  return (
    <div>
      <p style={{ color: C.dim, fontSize: 13, margin: '0 0 14px 0' }}>
        A module&apos;s date applies to every lesson inside it. Give one lesson its own date and the
        module reads <strong>Mixed</strong>; clear that date and the lesson goes back to inheriting.
        Nothing locks — a past-due lesson still opens and still submits.
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
            const summary = moduleDueSummary(index, mod.moduleId, mod.lessons.map((l) => l.id), mod.unitId);
            const ownRow = byKey.get(`module:${mod.moduleId}`);
            const isOpen = open.has(mod.moduleId);

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
                      fontSize: 14, fontFamily: 'inherit', flex: '1 1 260px', textAlign: 'left',
                    }}
                  >
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {mod.label}
                    <span style={{ color: C.dim, fontSize: 12 }}>
                      ({mod.lessons.length})
                    </span>
                  </button>

                  <input
                    type="date"
                    value={ownRow?.date ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      void write([{ scope: 'module', scopeId: mod.moduleId, date: value === '' ? null : value }]);
                    }}
                    style={dateInput}
                    aria-label={`Due date for module ${mod.moduleId}`}
                  />

                  <span style={{ fontSize: 12, color: summary.kind === 'mixed' ? C.warn : C.dim, minWidth: 150 }}>
                    {summary.kind === 'mixed'
                      ? `Mixed · ${summary.overrides} override${summary.overrides === 1 ? '' : 's'}`
                      : summary.kind === 'single' && summary.dueAt !== null
                        ? `All lessons: ${formatDue(summary.dueAt)}`
                        : 'No due date'}
                  </span>

                  {summary.kind === 'mixed' && ownRow && (
                    <button
                      type="button"
                      onClick={() => {
                        void write([
                          { scope: 'module', scopeId: mod.moduleId, date: ownRow.date },
                          ...mod.lessons
                            .filter((l) => byKey.has(`lesson:${l.id}`))
                            .map((l) => ({ scope: 'lesson' as DueScope, scopeId: l.id, date: null })),
                        ]);
                      }}
                      style={{
                        background: 'none', border: `1px solid ${C.border}`, color: C.warn,
                        borderRadius: 4, padding: '3px 8px', fontSize: 12, cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Apply {formatDue(ownRow.dueAt)} to all
                    </button>
                  )}
                </div>

                {isOpen && (
                  <div style={{ margin: '10px 0 6px 22px' }}>
                    {mod.lessons.map((lesson) => {
                      const override = byKey.get(`lesson:${lesson.id}`);
                      return (
                        <div
                          key={lesson.id}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0', flexWrap: 'wrap' }}
                        >
                          <span style={{ flex: '1 1 260px', fontSize: 13, color: override ? C.text : C.dim }}>
                            {lesson.title}
                          </span>

                          <input
                            type="date"
                            value={override?.date ?? ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              void write([{ scope: 'lesson', scopeId: lesson.id, date: value === '' ? null : value }]);
                            }}
                            style={dateInput}
                            aria-label={`Due date for lesson ${lesson.title}`}
                          />

                          {override ? (
                            <button
                              type="button"
                              title="Clear this override — the lesson goes back to the module's date"
                              onClick={() => { void write([{ scope: 'lesson', scopeId: lesson.id, date: null }]); }}
                              style={{
                                background: 'none', border: 'none', color: C.dim, cursor: 'pointer',
                                display: 'inline-flex', alignItems: 'center', padding: 2,
                              }}
                            >
                              <X size={14} />
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: C.dim, minWidth: 60 }}>inherits</span>
                          )}
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
