import Link from 'next/link';
import { Lesson } from '../lib/lessons';

export default function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className="p-4 block"
      style={{
        border: '1px solid var(--border)',
        borderRadius: '0.25rem',
        backgroundColor: 'var(--card)',
      }}
    >
      <h3 className="font-semibold">{lesson.title}</h3>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{lesson.description}</p>
    </Link>
  );
}
