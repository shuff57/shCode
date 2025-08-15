import Link from 'next/link';
import { Lesson } from '../lib/lessons';

export default function LessonCard({ lesson }: { lesson: Lesson }) {
  return (
    <Link
      href={`/lesson/${lesson.id}`}
      className="border rounded p-4 hover:bg-gray-50 block"
    >
      <h3 className="font-semibold">{lesson.title}</h3>
      <p className="text-sm text-gray-600">{lesson.description}</p>
    </Link>
  );
}
