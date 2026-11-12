// Server-side lookup of a quiz's questions, options and key for a TEACHER reading a hand-in (ux2 T3b).
//
// The data is baked by scripts/generate-quiz-teacher.mjs into quiz-teacher.generated.ts and bundled into
// the worker. It holds answer keys, so the only caller is the teacher/admin-gated submission-queue GET;
// nothing a student can fetch reads it. Fails closed: an unknown lesson has no content.

import type { TeacherQuiz } from '../../lib/teacher-drawer';
import { QUIZ_TEACHER } from './quiz-teacher.generated';

export function teacherQuiz(lessonId: string): TeacherQuiz | null {
  // Own properties only: "__proto__" or "constructor" must not resolve off Object.prototype.
  return Object.prototype.hasOwnProperty.call(QUIZ_TEACHER, lessonId) ? QUIZ_TEACHER[lessonId] : null;
}
