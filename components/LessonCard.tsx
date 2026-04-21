import Link from 'next/link';
import type { Lesson } from '../lib/types';
import { badgeForLesson } from '../lib/lesson-badges';

const typeBadgeColors: Record<string, string> = {
  lesson: '#5baafd',
  assignment: '#f59e0b',
  project: '#10b981',
  example: '#a78bfa',
};

export default function LessonCard({ lesson }: { lesson: Lesson }) {
  const type = lesson.type || 'lesson';
  const isAssignment = type === 'assignment' || type === 'project';
  const href = isAssignment ? `/assignment/${lesson.id}` : `/lesson/${lesson.id}`;
  const pBadge = badgeForLesson({ type: lesson.type, preview: lesson.preview });

  return (
    <Link
      href={href}
      className="bg-card border-border border rounded p-4 hover:bg-muted block border-l-4 shadow-lg"
      style={{ borderLeftColor: pBadge?.color ?? typeBadgeColors[type] ?? 'var(--brand)' }}
    >
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        {pBadge && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: pBadge.color + '22',
              color: pBadge.color,
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 600,
              border: '1px solid ' + pBadge.color + '55',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            <pBadge.Icon size={12} strokeWidth={2.25} />
            {pBadge.label}
          </span>
        )}
        <h3 className="font-semibold text-text">{lesson.title}</h3>
        {!pBadge && (
          <span
            className="lesson-type-badge"
            style={{ backgroundColor: typeBadgeColors[type] || 'var(--brand)' }}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)}
          </span>
        )}
        {lesson.week && (
          <span className="lesson-week-badge">Week {lesson.week}</span>
        )}
      </div>
      <p className="text-med text-text/70">{lesson.description}</p>
    </Link>
  );
}
