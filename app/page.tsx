import Link from 'next/link';
import LessonCard from '../components/LessonCard';
import { loadLessons } from '../lib/lessons';
import { listUnits } from '../lib/curriculum';
import type { Lesson } from '../lib/types';

export default async function HomePage() {
  const lessons = await loadLessons();
  const units = await listUnits();

  // Group lessons by category, hiding legacy buckets on the home page:
  //   - HTML lessons (no category field) — kept as files, reachable at
  //     /lesson/[id], but not listed here.
  //   - Legacy "Unit 5: q5play — Game Physics" category — superseded by
  //     the new Unit 2 q5play content; files remain for direct access.
  const categorized = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const cat = lesson.category;
    if (!cat) continue;
    if (cat.startsWith('Unit 5')) continue;
    if (!categorized.has(cat)) categorized.set(cat, []);
    categorized.get(cat)!.push(lesson);
  }

  // Sort lessons within each category by week, then by title (numeric-aware so "2.1.2" precedes "2.1.10")
  categorized.forEach((catLessons) => {
    catLessons.sort((a, b) => {
      const w = (a.week ?? 99) - (b.week ?? 99);
      if (w !== 0) return w;
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    });
  });

  // Helper: group lessons by unit, preserving insertion order
  function groupByUnit(items: Lesson[]): Map<string, Lesson[]> {
    const unitMap = new Map<string, Lesson[]>();
    for (const lesson of items) {
      const u = lesson.unit || 'Other';
      if (!unitMap.has(u)) unitMap.set(u, []);
      unitMap.get(u)!.push(lesson);
    }
    return unitMap;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4" id="titleRow">
        <h1 className="text-2xl font-bold">Choose a lesson</h1>
        <input className="border p-2" placeholder="Search lessons" />
      </div>

      {/* Curriculum units — links to the build-spec hub pages */}
      {units.length > 0 && (
        <details className="bg-card border-border border rounded w-2/3 mx-auto mb-4" open>
          <summary className="py-4 px-8 w-full list-none cursor-pointer hover:bg-muted text-5xl flex justify-between items-center">
            <span className="font-bold">Curriculum</span>
            <span className="text-lg">({units.length} units)</span>
          </summary>
          <div className="flex flex-col gap-2 p-4">
            {units.map((u) => (
              <Link
                key={u.id}
                href={`/module/${u.id}`}
                className="flex items-baseline gap-3 p-3 bg-muted rounded hover:bg-accent transition"
              >
                <span className="font-bold text-lg">Unit {u.id}</span>
                <span className="text-base">{u.title}</span>
                <span className="ml-auto text-sm opacity-70">
                  Q{u.quarter} · W{u.weeks?.[0]}–{u.weeks?.[u.weeks.length - 1]}
                </span>
              </Link>
            ))}
          </div>
        </details>
      )}

      {/* Data-driven categories with unit sub-grouping */}
      {Array.from(categorized.entries()).map(([category, catLessons]) => {
        const units = groupByUnit(catLessons);
        const hasUnits = !(units.size === 1 && units.has('Other'));

        return (
          <details key={category} className="bg-card border-border border rounded w-2/3 mx-auto mb-4">
            <summary className="py-4 px-8 w-full list-none cursor-pointer hover:bg-muted text-5xl flex justify-between items-center">
              <span className="font-bold">{category}</span>
              <span className="text-lg">({catLessons.length} lessons)</span>
            </summary>
            <div className="p-4">
              {hasUnits ? (
                Array.from(units.entries()).map(([unitName, unitLessons]) => (
                  <details key={unitName} className="bg-card border-border border rounded mb-4">
                    <summary className="py-4 px-8 w-full list-none cursor-pointer hover:bg-muted flex justify-between items-center">
                      <span className="font-bold text-2xl">{unitName}</span>
                      <span className="text-sm">({unitLessons.length} lessons)</span>
                    </summary>
                    <div className="flex flex-col gap-4 p-4">
                      {unitLessons.map((lesson) => (
                        <LessonCard key={lesson.id} lesson={lesson} />
                      ))}
                    </div>
                  </details>
                ))
              ) : (
                <div className="flex flex-col gap-4">
                  {catLessons.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              )}
            </div>
          </details>
        );
      })}
    </div>
  );
}
