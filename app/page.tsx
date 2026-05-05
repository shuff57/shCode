import LessonSearchFilter from '../components/LessonSearchFilter';
import { loadLessons } from '../lib/lessons';
import { listUnits } from '../lib/curriculum';

export default async function HomePage() {
  const lessons = await loadLessons();
  const units = await listUnits();

  return (
    <div className="p-4">
      <LessonSearchFilter units={units} lessons={lessons} />

      <footer className="flex items-center justify-between w-2/3 mx-auto mt-8 pt-4 border-t border-border text-sm opacity-70">
        <span>© {new Date().getFullYear()} shCode</span>
        <span>LHD™</span>
      </footer>
    </div>
  );
}
