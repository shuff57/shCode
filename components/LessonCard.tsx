import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Lesson } from '../lib/lessons';

export default function LessonCard({
  lesson,
  locked,
}: {
  lesson: Lesson;
  locked?: boolean;
}) {
  const isLocked = locked ?? Boolean(lesson.locked);

  return (
    <Link
      href={`/lesson/${lesson.id}`}
      aria-label={isLocked ? `${lesson.title} (locked)` : lesson.title}
      className={`bg-card border-border border rounded p-4 hover:bg-muted block border-l-4 shadow-lg${
        isLocked ? ' opacity-70' : ''
      }`}
      style={{ borderLeftColor: isLocked ? 'var(--border)' : 'var(--brand)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-text">{lesson.title}</h3>
        {isLocked ? (
          <span className="flex items-center gap-1 text-sm text-text/70 shrink-0">
            <Lock size={14} aria-hidden="true" />
            Locked
          </span>
        ) : null}
      </div>
      <p className="text-med text-text/70">{lesson.description}</p>
    </Link>
  );
}
