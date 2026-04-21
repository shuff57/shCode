import Link from 'next/link';
import LessonCard from '../components/LessonCard';
import { loadLessons } from '../lib/lessons';
import { listUnits } from '../lib/curriculum';
import type { Lesson } from '../lib/types';

// Parse the "2.1.3" prefix from a lesson title so we can map lessons
// to modules by id prefix (mirrors lib/curriculum.ts).
function parseNumberedId(title: string): string | null {
  const m = title.match(/^(\d+\.\d+\.\d+[a-zA-Z]?)/);
  return m ? m[1] : null;
}

function lessonsForModule(lessons: Lesson[], moduleId: string, category?: string): Lesson[] {
  return lessons
    .filter((l) => {
      if (category && l.category !== category) return false;
      const nid = parseNumberedId(l.title);
      return !!nid && (nid === moduleId || nid.startsWith(moduleId + '.'));
    })
    .sort((a, b) => {
      const w = (a.week ?? 99) - (b.week ?? 99);
      if (w !== 0) return w;
      return a.title.localeCompare(b.title, undefined, { numeric: true });
    });
}

export default async function HomePage() {
  const lessons = await loadLessons();
  const units = await listUnits();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4" id="titleRow">
        <h1 className="text-2xl font-bold">Choose a lesson</h1>
        <input className="border p-2" placeholder="Search lessons" />
      </div>

      {/* Curriculum units — each is its own top-level expandable section */}
      {units.map((u) => {
        const unitLessons = lessonsForModule(lessons, u.id, u.category);
        return (
          <details key={u.id} className="bg-card border-border border rounded w-2/3 mx-auto mb-3 overflow-hidden">
            <summary className="flex items-baseline gap-3 p-4 cursor-pointer hover:bg-muted transition list-none">
              <span className="font-bold text-lg">Unit {u.id}</span>
              <span className="text-base">{u.title}</span>
              <span className="ml-auto text-sm opacity-70">
                Q{u.quarter} · W{u.weeks?.[0]}–{u.weeks?.[u.weeks.length - 1]}
              </span>
            </summary>
            <div className="flex flex-col gap-3 p-4 border-t border-border">
              {unitLessons.length === 0 ? (
                <div className="text-sm opacity-60 italic px-1">
                  No lessons authored yet.
                </div>
              ) : (
                unitLessons.map((lesson) => (
                  <LessonCard key={lesson.id} lesson={lesson} />
                ))
              )}
              <Link
                href={`/module/${u.id}`}
                className="text-sm underline opacity-70 hover:opacity-100 self-start"
              >
                → View full module page
              </Link>
            </div>
          </details>
        );
      })}
    </div>
  );
}
