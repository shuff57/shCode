import LessonWorkspace from '../../../components/LessonWorkspace';
import ContentLessonView from '../../../components/ContentLessonView';
import LessonAccessGate from '../../../components/LessonAccessGate';
import { getLesson, loadLessons } from '../../../lib/lessons';
import { getModule } from '../../../lib/curriculum';
import { rendersAsContent } from '../../../lib/lesson-view';

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

  const numMatch = lesson.title.match(/^(\d+)\.(\d+)\.\d+/);
  const moduleId = numMatch ? `${numMatch[1]}.${numMatch[2]}` : null;
  const mod = moduleId ? await getModule(moduleId) : null;
  const siblingIds = mod ? mod.lessons.map((l) => l.id) : [];

  const body = rendersAsContent(lesson)
    ? <ContentLessonView lesson={lesson} />
    : <LessonWorkspace lesson={lesson} mode="assignment" />;

  return (
    <LessonAccessGate
      currentLessonId={lesson.id}
      siblings={siblingIds}
      moduleId={moduleId}
    >
      {body}
    </LessonAccessGate>
  );
}
