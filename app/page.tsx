import LessonCard from '../components/LessonCard';
import { loadLessons } from '../lib/lessons';
import type { Lesson } from '../lib/types';

export default async function HomePage() {
  const lessons = await loadLessons();

  // Group lessons by category
  const categorized = new Map<string, Lesson[]>();
  for (const lesson of lessons) {
    const cat = lesson.category || 'HTML';
    if (!categorized.has(cat)) categorized.set(cat, []);
    categorized.get(cat)!.push(lesson);
  }

  // Sort lessons within each category by week, then by title (so "5.1.1" precedes "5.1.2")
  categorized.forEach((catLessons) => {
    catLessons.sort((a, b) => {
      const w = (a.week ?? 99) - (b.week ?? 99);
      if (w !== 0) return w;
      return a.title.localeCompare(b.title);
    });
  });

  // Separate HTML (legacy hardcoded subcategories) from data-driven categories
  const htmlLessons = categorized.get('HTML') || [];
  const otherCategories = Array.from(categorized.entries()).filter(([k]) => k !== 'HTML');

  const basicHtmlLessons = htmlLessons.filter(lesson =>
    ['basic-html', 'html-intro', 'debug-pet-adoption', 'debug-camper-bot'].includes(lesson.id)
  );
  const semanticHtmlLessons = htmlLessons.filter(lesson =>
    ['build-a-cat-photo-app'].includes(lesson.id)
  );
  const ungroupedHtml = htmlLessons.filter(
    (l) => !basicHtmlLessons.includes(l) && !semanticHtmlLessons.includes(l)
  );

  // Helper: group lessons by unit, preserving insertion order
  function groupByUnit(items: Lesson[]): Map<string, Lesson[]> {
    const units = new Map<string, Lesson[]>();
    for (const lesson of items) {
      const u = lesson.unit || 'Other';
      if (!units.has(u)) units.set(u, []);
      units.get(u)!.push(lesson);
    }
    return units;
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4" id="titleRow">
        <h1 className="text-2xl font-bold">Choose a lesson</h1>
        <input className="border p-2" placeholder="Search lessons" />
      </div>

      {/* HTML section with legacy subcategories */}
      {htmlLessons.length > 0 && (
        <details className="bg-card border-border border rounded w-2/3 mx-auto mb-4">
          <summary className="py-4 px-8 w-full list-none cursor-pointer hover:bg-muted text-5xl flex justify-between items-center">
            <span className="font-bold">HTML</span>
            <span className="text-lg">({htmlLessons.length} lessons)</span>
          </summary>
          <div className="p-4">
            {basicHtmlLessons.length > 0 && (
              <details className="bg-card border-border border rounded mb-4">
                <summary className="py-4 px-8 w-full list-none cursor-pointer hover:bg-muted flex justify-between items-center">
                  <span className="font-bold text-2xl">Basic HTML</span>
                  <span className="text-sm">({basicHtmlLessons.length} lessons)</span>
                </summary>
                <div className="flex flex-col gap-4 p-4">
                  {basicHtmlLessons.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              </details>
            )}
            {semanticHtmlLessons.length > 0 && (
              <details className="bg-card border-border border rounded mb-4">
                <summary className="py-4 px-8 w-full list-none cursor-pointer hover:bg-muted flex justify-between items-center">
                  <span className="font-bold text-2xl">Semantic HTML</span>
                  <span className="text-sm">({semanticHtmlLessons.length} lessons)</span>
                </summary>
                <div className="flex flex-col gap-4 p-4">
                  {semanticHtmlLessons.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              </details>
            )}
            {ungroupedHtml.length > 0 && (
              <details className="bg-card border-border border rounded mb-4">
                <summary className="py-4 px-8 w-full list-none cursor-pointer hover:bg-muted flex justify-between items-center">
                  <span className="font-bold text-2xl">Other</span>
                  <span className="text-sm">({ungroupedHtml.length} lessons)</span>
                </summary>
                <div className="flex flex-col gap-4 p-4">
                  {ungroupedHtml.map((lesson) => (
                    <LessonCard key={lesson.id} lesson={lesson} />
                  ))}
                </div>
              </details>
            )}
          </div>
        </details>
      )}

      {/* Data-driven categories with unit sub-grouping */}
      {otherCategories.map(([category, catLessons]) => {
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
