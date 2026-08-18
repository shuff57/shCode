// Which body a lesson renders: the read-and-answer view, or the code workspace.
//
// /lesson/[lessonId] and /assignment/[id] each used to decide this for
// themselves, and they disagreed: the lesson route honoured `preview`, the
// assignment route looked only at `aiGrader`. A quiz (type 'assignment',
// preview 'quiz', no aiGrader) therefore rendered as a CodeMirror editor
// under /assignment/ and as a quiz under /lesson/.
//
// Nobody noticed because navigation was sending students to the wrong prefix,
// and the two bugs cancelled: quizzes were only ever reached via /lesson/.
// Fixing the routing exposed this one. One helper, both routes.

const CONTENT_PREVIEWS = new Set(['reading', 'video', 'example', 'slides', 'diagram', 'quiz']);

export interface ViewableLesson {
  preview?: string | null;
  aiGrader?: unknown;
  diagram?: unknown;
  quiz?: unknown;
}

export function rendersAsContent(lesson: ViewableLesson): boolean {
  if (lesson.preview && CONTENT_PREVIEWS.has(lesson.preview)) return true;
  return Boolean(lesson.aiGrader || lesson.diagram || lesson.quiz);
}
