import { Lesson } from '../lib/lessons';

export default function LessonSteps({ lesson }: { lesson: Lesson }) {
  return (
    <ol className="list-decimal ml-4">
      {lesson.steps.map((s) => (
        <li key={s.id} className="mb-2">{s.title}</li>
      ))}
    </ol>
  );
}
