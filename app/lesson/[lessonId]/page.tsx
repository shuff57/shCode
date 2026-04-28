import LessonWorkspace from '../../../components/LessonWorkspace';
import ContentLessonView from '../../../components/ContentLessonView';
import LessonProgressFooter from '../../../components/LessonProgressFooter';
import { getLesson, getLessonNeighbors, loadLessons } from '../../../lib/lessons';
import { getModule } from '../../../lib/curriculum';

// Content-only preview types (no code editor). Lessons with an aiGrader also
// render through ContentLessonView so WrittenGrader shows up.
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

  const numMatch = lesson.title.match(/^(\d+)\.(\d+)\.\d+/);
  const moduleId = numMatch ? `${numMatch[1]}.${numMatch[2]}` : null;
  const mod = moduleId ? await getModule(moduleId) : null;

  const footer = mod ? (
    <LessonProgressFooter
      moduleId={mod.summary.id}
      currentLessonId={lesson.id}
      lessons={mod.lessons.map((l) => ({
        id: l.id,
        numberedId: l.numberedId,
        displayTitle: l.displayTitle,
      }))}
    />
  ) : null;

  const isContentPreview = lesson.preview && CONTENT_PREVIEWS.has(lesson.preview);
  if (isContentPreview || lesson.aiGrader) {
    return (
      <>
        <ContentLessonView lesson={lesson} prev={prev} next={next} basePath="/lesson" />
        {footer}
      </>
    );
  }
  return (
    <>
      <LessonWorkspace lesson={lesson} />
      {footer}
    </>
  );
}
