import { Lesson } from '../lib/lessons';

export default function LessonSteps({ lesson }: { lesson: Lesson }) {
  return (
    <ol>
      {lesson.steps.map((s) => (
        <li key={s.id}>{s.title}</li>
      ))}
    </ol>
  );
}
