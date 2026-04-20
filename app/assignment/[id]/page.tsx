import LessonWorkspace from '../../../components/LessonWorkspace';
import { getLesson, loadLessons } from '../../../lib/lessons';

export async function generateStaticParams() {
  const lessons = await loadLessons();
  return lessons.map((l) => ({ id: l.id }));
}

export default async function AssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lesson = await getLesson(id);

  if (!lesson) return <div className="p-4">Assignment not found</div>;
  return <LessonWorkspace lesson={lesson} mode="assignment" />;
}
