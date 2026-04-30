import Link from 'next/link';
import HomeModuleLessons from '../components/HomeModuleLessons';
import UnitProgressBadge from '../components/UnitProgressBadge';
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

      {/* Group modules by top-level id (1.x, 2.x, ...) into Unit sections */}
      {(() => {
        const groups = new Map<string, { label: string; modules: typeof units }>();
        for (const m of units) {
          const top = m.id.split('.')[0];
          if (!groups.has(top)) {
            // Strip "Unit N: " prefix from the module's category to get the
            // big-unit title (e.g. "q5play — Applied Game Development").
            const label = m.category?.replace(/^Unit \d+:\s*/, '') ?? '';
            groups.set(top, { label, modules: [] });
          }
          groups.get(top)!.modules.push(m);
        }
        return Array.from(groups.entries()).map(([top, group]) => {
          const unitLessonIds = group.modules.flatMap((u) =>
            lessonsForModule(lessons, u.id, u.category).map((l) => l.id),
          );
          return (
          <details
            key={top}
            open
            className="bg-card border-border border rounded w-2/3 mx-auto mb-4 overflow-hidden"
          >
            <summary className="flex items-baseline gap-3 p-4 cursor-pointer hover:bg-muted transition list-none">
              <span className="text-2xl font-bold">Unit {top}</span>
              {group.label && <span className="text-base opacity-80">{group.label}</span>}
              <span className="ml-auto flex items-center gap-4 text-sm opacity-80">
                <UnitProgressBadge lessonIds={unitLessonIds} label={`Unit ${top}`} />
                <span className="opacity-60">
                  {group.modules.length} module{group.modules.length === 1 ? '' : 's'}
                </span>
              </span>
            </summary>
            <div className="flex flex-col gap-3 p-4 border-t border-border">
              {group.modules.map((u) => {
                const unitLessons = lessonsForModule(lessons, u.id, u.category);
                const moduleLessonIds = unitLessons.map((l) => l.id);
                return (
                  <details key={u.id} className="bg-muted rounded overflow-hidden">
                    <summary className="flex items-baseline gap-3 p-3 cursor-pointer hover:bg-accent transition list-none">
                      <span className="font-bold">{u.id}</span>
                      <span className="text-base">{u.title}</span>
                      <span className="ml-auto flex items-center gap-4 text-sm opacity-80">
                        <UnitProgressBadge lessonIds={moduleLessonIds} label={`Module ${u.id}`} />
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
        });
      })()}

      <footer className="flex items-center justify-between w-2/3 mx-auto mt-8 pt-4 border-t border-border text-sm opacity-70">
        <span>© {new Date().getFullYear()} shCode</span>
        <span>LHD™</span>
      </footer>
    </div>
  );
}
