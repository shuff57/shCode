'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import HomeModuleLessons from './HomeModuleLessons';
import UnitProgressBadge from './UnitProgressBadge';
import DueClassPicker from './DueClassPicker';
import DueDateChip from './DueDateChip';
import {
  moduleOpenSummaryForClass,
  moduleSummaryForClass,
  ownDate,
  ownOpenDate,
  useTeacherDue,
} from '../lib/due-dates-edit';
import type { Lesson } from '../lib/types';

/** Subset of ModuleSummary needed by the home page accordion. */
interface UnitEntry {
  id: string;
  title: string;
  quarter?: number;
  weeks?: number[];
  environment?: string;
  category?: string;
  slug: string;
}

function parseNumberedId(title: string): string | null {
  const m = title.match(/^(\d+\.\d+\.\d+)/);
  return m ? m[1] : null;
}

// Chapter N = book Chapter N (see curriculum/BOOK-TO-MODULE.md). Short
// subtitle shown next to each chapter's heading on the home page.
const CHAPTER_SUBTITLES: Record<string, string> = {
  '1': 'JavaScript Fundamentals',
  '2': 'Control Flow',
  '3': 'Functions and Data',
  '4': 'Q1 Synthesis',
  '5': 'moshion — Game Development Foundations',
  '6': 'moshion — Game Mechanics',
  '7': 'Q2 Synthesis — Game Capstone',
};

function lessonsForModule(lessons: Lesson[], moduleId: string, category?: string): Lesson[] {
  return lessons
    .filter((l) => {
      if (category && l.category !== category) return false;
      const nid = parseNumberedId(l.title);
      return !!nid && (nid === moduleId || nid.startsWith(moduleId + '.'));
    })
    .sort((a, b) => {
      const nidA = parseNumberedId(a.title) ?? '';
      const nidB = parseNumberedId(b.title) ?? '';
      return nidA.localeCompare(nidB, undefined, { numeric: true });
    });
}

interface Props {
  units: UnitEntry[];
  lessons: Lesson[];
}

export default function LessonSearchFilter({ units, lessons }: Props) {
  const [query, setQuery] = useState('');
  // Due dates are per class, so every chip on this page reads one chosen
  // class. Renders nothing at all for a student.
  const teacherDue = useTeacherDue();

  const trimmed = query.trim().toLowerCase();

  const filteredLessons = useMemo(() => {
    if (!trimmed) return lessons;
    return lessons.filter((l) => l.title.toLowerCase().includes(trimmed));
  }, [lessons, trimmed]);

  // When filtering, track which module ids contain at least one match so we
  // can hide empty modules and auto-expand the ones that do match.
  const matchingModuleIds = useMemo(() => {
    if (!trimmed) return null; // null = show all, don't auto-expand
    const ids = new Set<string>();
    for (const l of filteredLessons) {
      const nid = parseNumberedId(l.title);
      if (!nid) continue;
      const parts = nid.split('.');
      ids.add(parts.slice(0, 2).join('.'));
    }
    return ids.size > 0 ? ids : null;
  }, [filteredLessons, trimmed]);

  const hasMatches = !trimmed || filteredLessons.length > 0;

  // Group modules by top-level id (1.x, 2.x, ...) into Chapter sections.
  const groups = useMemo(() => {
    const map = new Map<string, { label: string; modules: UnitEntry[] }>();
    for (const m of units) {
      const top = m.id.split('.')[0];
      if (!map.has(top)) {
        map.set(top, { label: CHAPTER_SUBTITLES[top] ?? '', modules: [] });
      }
      map.get(top)!.modules.push(m);
    }
    return map;
  }, [units]);

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-4" id="titleRow">
        <h1 className="text-2xl font-bold">Choose a lesson</h1>
        <DueClassPicker />
        <input
          className="border p-2"
          placeholder="Search lessons"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            background: '#282a36',
            color: '#f8f8f2',
            borderColor: '#44475a',
            borderRadius: 6,
            padding: '6px 12px',
            fontSize: 14,
            width: 240,
            outline: 'none',
          }}
        />
      </div>

      {!hasMatches && (
        <div className="text-center py-12 text-sm opacity-60">
          No lessons match <strong>&ldquo;{query}&rdquo;</strong>
        </div>
      )}

      {Array.from(groups.entries()).map(([top, group]) => {
        const visibleModules = trimmed
          ? group.modules.filter((m) => matchingModuleIds?.has(m.id))
          : group.modules;

        if (visibleModules.length === 0) return null;

        const unitLessonIds = visibleModules.flatMap((u) =>
          lessonsForModule(filteredLessons, u.id, u.category).map((l) => l.id),
        );

        return (
          <details
            key={top}
            open={!trimmed || visibleModules.length > 0}
            className="bg-card border-border border rounded w-2/3 mx-auto mb-4 overflow-hidden"
          >
            <summary className="flex items-baseline gap-3 p-4 cursor-pointer hover:bg-muted transition list-none">
              <span className="text-2xl font-bold">Chapter {top}</span>
              {group.label && <span className="text-base opacity-80">{group.label}</span>}
              <span className="ml-auto flex items-center gap-4 text-sm opacity-80">
                <UnitProgressBadge lessonIds={unitLessonIds} label={`Chapter ${top}`} />
                <span className="opacity-60">
                  {visibleModules.length} module{visibleModules.length === 1 ? '' : 's'}
                </span>
              </span>
            </summary>
            <div className="flex flex-col gap-3 p-4 border-t border-border">
              {visibleModules.map((u) => {
                const unitLessons = lessonsForModule(filteredLessons, u.id, u.category);
                const moduleLessonIds = unitLessons.map((l) => l.id);
                return (
                  <details
                    key={u.id}
                    className="bg-muted rounded overflow-hidden"
                    open={!!trimmed}
                  >
                    <summary className="flex items-baseline gap-3 p-3 cursor-pointer hover:bg-accent transition list-none">
                      <span className="font-bold">{u.id}</span>
                      <span className="text-base">{u.title}</span>
                      <span className="ml-auto flex items-center gap-4 text-sm opacity-80">
                        <UnitProgressBadge lessonIds={moduleLessonIds} label={`Module ${u.id}`} />
                        <ModuleDueChip
                          snap={teacherDue}
                          moduleId={u.id}
                          lessonIds={moduleLessonIds}
                          unitId={u.category ?? null}
                        />
                      </span>
                    </summary>
                    <div className="flex flex-col gap-3 p-3 border-t border-border bg-card">
                      {unitLessons.length === 0 ? (
                        <div className="text-sm opacity-60 italic px-1">
                          No lessons authored yet.
                        </div>
                      ) : (
                        <HomeModuleLessons lessons={unitLessons} />
                      )}
                      <Link
                        href={`/module/${u.id}`}
                        prefetch={false}
                        className="text-sm underline opacity-70 hover:opacity-100 self-start"
                      >
                        → View full module page
                      </Link>
                    </div>
                  </details>
                );
              })}
            </div>
          </details>
        );
      })}
    </>
  );
}

// The module row's chip. Kept out of the main render so the summary stays
// readable; "Mixed" is computed from the children, never stored.
function ModuleDueChip({
  snap,
  moduleId,
  lessonIds,
  unitId,
}: {
  snap: ReturnType<typeof useTeacherDue>;
  moduleId: string;
  lessonIds: string[];
  unitId: string | null;
}) {
  const summary = moduleSummaryForClass(snap, moduleId, lessonIds, unitId);
  const openSummary = moduleOpenSummaryForClass(snap, moduleId, lessonIds, unitId);
  return (
    <>
      <DueDateChip
        scope="module"
        scopeId={moduleId}
        resolvedAt={openSummary.ownDueAt ?? openSummary.dueAt}
        ownAt={ownOpenDate(snap, 'module', moduleId)}
        mixed={openSummary.kind === 'mixed'}
        min={openSummary.min}
        max={openSummary.max}
        moduleLessonIds={lessonIds}
        size="md"
        kind="open"
      />
      <DueDateChip
        scope="module"
        scopeId={moduleId}
        resolvedAt={summary.ownDueAt ?? summary.dueAt}
        ownAt={ownDate(snap, 'module', moduleId)}
        mixed={summary.kind === 'mixed'}
        min={summary.min}
        max={summary.max}
        moduleLessonIds={lessonIds}
        size="md"
      />
    </>
  );
}
