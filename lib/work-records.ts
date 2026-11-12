// This browser's copy of a student's quiz picks, written answer and flowchart
// assignment, kept under the page's owner (lib/owned-storage.ts):
//
//   w1:<owner>:quiz:<lessonId>      QuizView      { answers, graded?, checked? }
//   w1:<owner>:written:<lessonId>   WrittenGrader { response, lastResult?, lastSubmittedAt? }
//   w1:<owner>:diagram:<lessonId>   DiagramAssignmentView, the DiagramDoc as JSON text
//
// One module so the components and scripts/test-owned-storage.mjs run the same code.
// Reads are synchronous; writes never throw (a full store keeps the previous copy).

import { ownedLocal, type WriteResult } from './owned-storage';

export const QUIZ_KEY = 'quiz:';
export const WRITTEN_KEY = 'written:';
export const DIAGRAM_KEY = 'diagram:';

/** An absent key means "not answered yet": 0 is a real first option. */
export type QuizAnswers = Record<string, number>;
export interface QuizRecord {
  answers: QuizAnswers;
  graded?: boolean;
  /** The answers as they were at the last Check. */
  checked?: QuizAnswers | null;
}

export function loadQuizRecord(lessonId: string): QuizRecord {
  const v = ownedLocal.getJSON<QuizRecord>(QUIZ_KEY + lessonId);
  if (v && typeof v === 'object' && v.answers && typeof v.answers === 'object') return v;
  return { answers: {} };
}
export function saveQuizRecord(lessonId: string, state: QuizRecord): WriteResult {
  return ownedLocal.setJSON(QUIZ_KEY + lessonId, state);
}

export interface WrittenRecord<R = unknown> {
  response: string;
  lastResult?: R;
  lastSubmittedAt?: number;
}
export function loadWrittenRecord<R = unknown>(lessonId: string): WrittenRecord<R> {
  const v = ownedLocal.getJSON<WrittenRecord<R>>(WRITTEN_KEY + lessonId);
  if (v && typeof v === 'object' && typeof v.response === 'string') return v;
  return { response: '' };
}
export function saveWrittenRecord<R = unknown>(lessonId: string, state: WrittenRecord<R>): WriteResult {
  return ownedLocal.setJSON(WRITTEN_KEY + lessonId, state);
}

export function loadDiagramText(lessonId: string): string | null {
  return ownedLocal.getItem(DIAGRAM_KEY + lessonId);
}
export function saveDiagramText(lessonId: string, json: string): WriteResult {
  return ownedLocal.setItem(DIAGRAM_KEY + lessonId, json);
}
