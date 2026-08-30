import LessonWorkspace from '../../../components/LessonWorkspace';
import ContentLessonView from '../../../components/ContentLessonView';
import LessonProgressFooter from '../../../components/LessonProgressFooter';
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

  // Same progress strip as /lesson/. It used to be lesson-only, and
  // lib/lesson-href.ts still warns that the footer "lands on top of the
  // console workspace's run/output row" -- that was true when the note was
  // written, and `body:has(.lesson-progress-footer) { padding-bottom: 60px }`
  // in globals.css is what fixed it. Without the strip here a student lost
  // every way of moving through the module the moment they opened an
  // assignment, which is most of the unit.
  const footer = mod ? (
    <LessonProgressFooter
      moduleId={mod.summary.id}
      currentLessonId={lesson.id}
      lessons={mod.lessons.map((l) => ({
        id: l.id,
        numberedId: l.numberedId,
        displayTitle: l.displayTitle,
        type: l.type,
      }))}
    />
  ) : null;

  return (
    <>
      <LessonAccessGate
        currentLessonId={lesson.id}
        siblings={siblingIds}
        moduleId={moduleId}
      >
        {body}
      </LessonAccessGate>
      {footer}
    </>
  );
}
