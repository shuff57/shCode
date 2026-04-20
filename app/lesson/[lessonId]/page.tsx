import LessonWorkspace from '../../../components/LessonWorkspace';
import { getLesson, getLessonNeighbors, loadLessons } from '../../../lib/lessons';

export async function generateStaticParams() {
  const lessons = await loadLessons();
  return lessons.map((l) => ({ lessonId: l.id }));
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);

  if (!lesson) return <div className="p-4">Lesson not found</div>;
  const { prev, next } = await getLessonNeighbors(lessonId);
  return (
    <LessonWorkspace lesson={lesson} prev={prev} next={next} basePath="/lesson" />
  );
}
