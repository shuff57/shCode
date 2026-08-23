// Which editor a student gets for a lesson, and who decided.
//
// Two teacher gates, resolved most-specific-first. Both live in one table
// (migrations/0016_lesson_modes.sql) with '*' as the class-wide lesson id, so
// this resolution is written once rather than once per gate.

export type LessonMode = 'visual' | 'code' | 'both';

export interface TeacherModes {
  /** Class-wide default, or null if no teacher set one. */
  classDefault: LessonMode | null;
  /** Per-assignment overrides, keyed by lesson id. */
  lessons: Record<string, LessonMode>;
}

export const NO_TEACHER_MODES: TeacherModes = { classDefault: null, lessons: {} };

export interface ResolvedMode {
  mode: LessonMode;
  /** Where it came from, so the UI can say why a tab is missing. */
  source: 'assignment' | 'class' | 'lesson' | 'default';
}

export function resolveMode(
  lessonId: string,
  teacher: TeacherModes | null | undefined,
  lessonDeclared?: LessonMode | null
): ResolvedMode {
  const t = teacher ?? NO_TEACHER_MODES;
  const perLesson = t.lessons?.[lessonId];
  if (perLesson) return { mode: perLesson, source: 'assignment' };
  if (t.classDefault) return { mode: t.classDefault, source: 'class' };
  if (lessonDeclared) return { mode: lessonDeclared, source: 'lesson' };
  return { mode: 'both', source: 'default' };
}

export function canUseBuild(m: ResolvedMode): boolean {
  return m.mode === 'visual' || m.mode === 'both';
}

export function canUseCode(m: ResolvedMode): boolean {
  return m.mode === 'code' || m.mode === 'both';
}

/** Shown when only one editor is available, so the missing one is explained
 *  rather than just absent. */
export function whyLocked(m: ResolvedMode): string | null {
  if (m.mode === 'both') return null;
  const what = m.mode === 'visual' ? 'the shape tools' : 'code';
  if (m.source === 'assignment') return `Your teacher set this assignment to ${what}.`;
  if (m.source === 'class') return `Your teacher set this class to ${what}.`;
  if (m.source === 'lesson') return `This lesson is worked with ${what}.`;
  return null;
}
