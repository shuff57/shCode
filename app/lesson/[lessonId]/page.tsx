import { cookies } from 'next/headers';
import LessonWorkspace from '../../../components/LessonWorkspace';
import LessonLock from '../../../components/LessonLock';
import { getLesson } from '../../../lib/lessons';
import { cookieName, isUnlocked, readLock } from '../../../lib/lock.js';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getLesson(lessonId);

  if (!lesson) return <div className="p-4">Lesson not found</div>;

  // Read lock state from disk, not from the lesson cache, so opening a lesson
  // on test day does not need a restart.
  const jar = await cookies();
  const open = await isUnlocked(lesson.id, jar.get(cookieName(lesson.id))?.value);
  if (!open) {
    const { unlockCode } = await readLock(lesson.id);
    return (
      <LessonLock
        lessonId={lesson.id}
        title={lesson.title}
        description={lesson.description}
        hasCode={Boolean(unlockCode)}
      />
    );
  }

  return <LessonWorkspace lesson={lesson} />;
}
