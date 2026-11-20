import { canUseBuild, resolveMode, whyLocked, type LessonMode, type TeacherModes } from './lesson-mode';

// A missing/unreadable teacher policy never exposes hand tools in a script lab.
export function cadPolicy(lessonId: string, teacher: TeacherModes | null, declared: LessonMode = 'code') {
  if (!teacher) return { toolsAllowed: false, reason: 'Checking your teacher’s CAD setting…' };
  const resolved = resolveMode(lessonId, teacher, declared);
  return { toolsAllowed: canUseBuild(resolved), reason: whyLocked(resolved) ?? 'Modelling tools are available. Hand edits do not update your saved script.' };
}

export function sandboxCadPolicy(role:string|null|undefined,authorTools:boolean,teacher:TeacherModes|null){
  if(role==='teacher'||role==='admin')return {toolsAllowed:authorTools,reason:authorTools?'Drawing tools are on for your author workspace.':'Drawing tools are off for your author workspace.'};
  return cadPolicy('sandbox-reshape',teacher,'code');
}
