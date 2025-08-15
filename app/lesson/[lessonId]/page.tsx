import LessonWorkspace from '../../../components/LessonWorkspace';
import { lessons } from '../../../lib/lessons';

export default function LessonPage({ params }: { params: { lessonId: string } }) {
  const lesson = lessons.find((l) => l.id === params.lessonId);
  if (!lesson) return <div className="p-4">Lesson not found</div>;
  return <LessonWorkspace lesson={lesson} />;
}
