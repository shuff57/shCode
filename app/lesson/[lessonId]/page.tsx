import LessonWorkspace from '../../../components/LessonWorkspace';
import ContentLessonView from '../../../components/ContentLessonView';
import { getLesson, getLessonNeighbors, loadLessons } from '../../../lib/lessons';

// Content-only preview types (no code editor). Challenge + assignment stay in LessonWorkspace
// so they run the regex autograder against student code.
const CONTENT_PREVIEWS = new Set(['reading', 'video', 'example', 'slides']);

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

  if (lesson.preview && CONTENT_PREVIEWS.has(lesson.preview)) {
    return <ContentLessonView lesson={lesson} prev={prev} next={next} basePath="/lesson" />;
  }
  return (
    <LessonWorkspace lesson={lesson} prev={prev} next={next} basePath="/lesson" />
  );
}
