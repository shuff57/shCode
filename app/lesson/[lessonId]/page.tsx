import LessonWorkspace from '../../../components/LessonWorkspace';
import { getLesson } from '../../../lib/lessons';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);
  if (!lesson) return <div className="p-4">Lesson not found</div>;
  return <LessonWorkspace lesson={lesson} />;
}
