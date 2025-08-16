import LessonCard from '../components/LessonCard';
import { loadLessons } from '../lib/lessons';

export default async function HomePage() {
  const lessons = await loadLessons();

  const basicHtmlLessons = lessons.filter(lesson => 
    ['basic-html', 'html-intro', 'debug-pet-adoption', 'debug-camper-bot'].includes(lesson.id)
  );

  const semanticHtmlLessons = lessons.filter(lesson => 
    ['build-a-cat-photo-app'].includes(lesson.id)
  );

  const formsAndTablesLessons = lessons.filter(lesson => 
    ['build-a-cat-photo-app'].includes(lesson.id)
  );

  const accessibilityLessons = lessons.filter(lesson => 
    ['build-a-cat-photo-app'].includes(lesson.id)
  );
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4" id="titleRow">
        <h1 className="text-2xl font-bold">Choose a lesson</h1>
        <input className="border p-2" placeholder="Search lessons" />
      </div>
      <details className="bg-card border-border border rounded w-2/3 mx-auto">
        <summary className="py-4 px-8 w-full list-none cursor-pointer hover:bg-muted text-5xl flex justify-between items-center">
          <span className="font-bold">HTML</span>
          <span className="text-lg">({lessons.length} lessons)</span>
        </summary>
        <div className="p-4">
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
          <details className="bg-card border-border border rounded mb-4">
            <summary className="py-4 px-8 w-full list-none cursor-pointer hover:bg-muted flex justify-between items-center">
              <span className="font-bold text-2xl">Forms and Tables</span>
              <span className="text-sm">({formsAndTablesLessons.length} lessons)</span>
            </summary>
            <div className="flex flex-col gap-4 p-4">
              {formsAndTablesLessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </details>
          <details className="bg-card border-border border rounded">
            <summary className="py-4 px-8 w-full list-none cursor-pointer hover:bg-muted flex justify-between items-center">
              <span className="font-bold text-2xl">Accessibility</span>
              <span className="text-sm">({accessibilityLessons.length} lessons)</span>
            </summary>
            <div className="flex flex-col gap-4 p-4">
              {accessibilityLessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </div>
          </details>
        </div>
      </details>
    </div>
  );
}
