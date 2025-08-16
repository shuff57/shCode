import Link from 'next/link';
import { Lesson } from '../lib/lessons';

export default function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className="bg-card border-border border rounded p-4 hover:bg-muted block border-l-4 shadow-lg"
      style={{ borderLeftColor: 'var(--brand)' }}
    >
      <h3 className="font-semibold text-text">{lesson.title}</h3>
      <p className="text-med text-text/70">{lesson.description}</p>
    </Link>
  );
}
