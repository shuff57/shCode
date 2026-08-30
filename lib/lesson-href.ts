// Single source of truth for a lesson's route prefix: assignments and
// projects live under /assignment/, everything else under /lesson/.
//
// generateStaticParams() exports BOTH routes for every lesson id, so a wrong
// prefix never 404s — it silently renders the other route's chrome. An
// assignment reached via /lesson/ picks up LessonProgressFooter, which is
// `position: fixed; bottom: 0` and lands on top of the console workspace's
// run/output row. That is the "brokenish" page, and it is invisible from the
// build.
//
// So: never infer the prefix from the current URL. Read the destination
// lesson's own type.

export interface HrefableLesson {
  id: string;
  type?: string | null;
}

export function lessonHref(lesson: HrefableLesson): string {
  // `challenge` rides the assignment side too: it is a terminal, scored stop
  // at the end of a unit, so it wants the score header, not the lesson chrome.
  const isAssignment =
    lesson.type === 'assignment' || lesson.type === 'project' || lesson.type === 'challenge';
  return `${isAssignment ? '/assignment' : '/lesson'}/${lesson.id}`;
}
