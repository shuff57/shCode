import { canUseBuild, resolveMode, whyLocked, type LessonMode, type TeacherModes } from './lesson-mode';

// A missing/unreadable teacher policy never exposes hand tools in a script lab.
export function cadPolicy(lessonId: string, teacher: TeacherModes | null, declared: LessonMode = 'code') {
  if (!teacher) return { toolsAllowed: false, reason: 'Checking your teacher’s CAD setting…' };
  const resolved = resolveMode(lessonId, teacher, declared);
  return { toolsAllowed: canUseBuild(resolved), reason: whyLocked(resolved) ?? 'Modelling tools are available. Hand edits do not update your saved script.' };
}
