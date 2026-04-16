import Link from 'next/link';
import type { Lesson } from '../lib/types';

const typeBadgeColors: Record<string, string> = {
  lesson: '#5baafd',
  assignment: '#f59e0b',
  project: '#10b981',
};

export default function LessonCard({ lesson }: { lesson: Lesson }) {
  const type = lesson.type || 'lesson';
  const isAssignment = type === 'assignment' || type === 'project';
  const href = isAssignment ? `/assignment/${lesson.id}` : `/lesson/${lesson.id}`;

  return (
    <Link
      href={href}
      className="bg-card border-border border rounded p-4 hover:bg-muted block border-l-4 shadow-lg"
      style={{ borderLeftColor: typeBadgeColors[type] || 'var(--brand)' }}
    >
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-text">{lesson.title}</h3>
        <span
          className="lesson-type-badge"
          style={{ backgroundColor: typeBadgeColors[type] || 'var(--brand)' }}
        >
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
        {lesson.week && (
          <span className="lesson-week-badge">Week {lesson.week}</span>
        )}
      </div>
      <p className="text-med text-text/70">{lesson.description}</p>
    </Link>
  );
}
