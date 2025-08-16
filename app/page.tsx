import LessonCard from '../components/LessonCard';
import { lessons } from '../lib/lessons';

export default function HomePage() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4" id="titleRow">
        <h1 className="text-2xl font-bold">Choose a lesson</h1>
        <input
          className="p-2"
          style={{
            border: '1px solid var(--border)',
            backgroundColor: 'var(--card)',
            color: 'var(--text)',
          }}
          placeholder="Search lessons"
        />
      </div>
      <div className="grid gap-4" style={{gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))'}}>
        {lessons.map((lesson) => (
          <LessonCard key={lesson.id} lesson={lesson} />
        ))}
      </div>
    </div>
  );
}
