import LessonWorkspace from '../../../components/LessonWorkspace';
import ContentLessonView from '../../../components/ContentLessonView';
import LessonProgressFooter from '../../../components/LessonProgressFooter';
import LessonAccessGate from '../../../components/LessonAccessGate';
import LessonGroupBanner from '../../../components/LessonGroupBanner';
import { getLesson, loadLessons } from '../../../lib/lessons';
import { getModule } from '../../../lib/curriculum';
import { groupOf } from '../../../lib/lesson-groups';
import { rendersAsContent } from '../../../lib/lesson-view';
import { redactLessonForClient } from '../../../lib/quiz-redact';

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
        type: l.type,
      }))}
    />
  ) : null;

  // Where this screen sits in the module's lesson layer. Null for every module
  // that has not been grouped yet, so this renders nothing there.
  const inLesson = mod ? groupOf(mod.groups, lesson.id) : null;

  const siblingIds = mod ? mod.lessons.map((l) => l.id) : [];
  // The last point at which the answer key can be taken out. Both views below
  // are 'use client', so whatever is handed to them is serialised into the
  // page and readable with View Source. See lib/quiz-redact.ts.
  const forClient = redactLessonForClient(lesson);
  const body = rendersAsContent(forClient)
    ? <ContentLessonView lesson={forClient} />
    : <LessonWorkspace lesson={forClient} />;

  return (
    <>
      {inLesson && moduleId && (
        <LessonGroupBanner
          moduleId={moduleId}
          group={inLesson.group}
          index={inLesson.index}
          total={inLesson.total}
          screenCount={inLesson.group.screens.length}
        />
      )}
      <LessonAccessGate
        currentLessonId={lesson.id}
        siblings={siblingIds}
        moduleId={moduleId}
        unitId={lesson.category ?? null}
      >
        {body}
      </LessonAccessGate>
      {footer}
    </>
  );
}
