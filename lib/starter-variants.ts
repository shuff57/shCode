// Lessons that offer a choice of problem ship one starter per problem.
//
// 3.9.1 gives the pair a complete plan with four mistakes planted in it; the
// plan is worded per problem ("set meet to saveMeet()" vs "set stock to
// saveStock()"), so a Lap Times pair should open the editor onto the Lap Times
// starter, not the Snack Shack one. Picking a problem writes that text over the
// graded file and remembers the pick here, which is what lets Reset put back the
// pair's own starter instead of the first problem's.
//
// The memory is localStorage and best effort: a private window forgets the
// pick, and the file it already holds is still correct.

import type { Lesson, StarterVariant } from './types';

export type { StarterVariant };

/** Fired on `window` when a problem is picked; detail is `{ lessonId, id }`. */
export const STARTER_PICKED = 'shcode:starter-picked';

/** Fired on `window` by the Flow Chart tabs to ask for a problem's starter. detail is
 *  `{ lessonId, id, handled }`; StarterPicker sets `handled` when `id` is one of its problems. */
export const STARTER_REQUESTED = 'shcode:starter-requested';

export const starterKey = (lessonId: string) => `shCode:starter:${lessonId}`;
const key = starterKey;

/** The file a starter seeds. README.md is the graded file of a text lesson. */
export const starterFile = (variant: StarterVariant) => variant.file ?? 'README.md';

export function rememberedStarter(lesson: Lesson): StarterVariant | null {
  const all = lesson.starterVariants;
  if (!all || all.length === 0 || typeof window === 'undefined') return null;
  let id: string | null = null;
  try {
    id = localStorage.getItem(key(lesson.id));
  } catch {
    return null; // private mode: the pick is not remembered
  }
  return all.find((v) => v.id === id) ?? null;
}

export function rememberStarter(lessonId: string, id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key(lessonId), id);
  } catch {
    /* not remembered */
  }
  // The lesson's Flow Chart follows the pick (components/LabPlanChart.tsx), and
  // it works even where storage is blocked, so tell it directly as well.
  window.dispatchEvent(new CustomEvent(STARTER_PICKED, { detail: { lessonId, id } }));
}

/** Whether `text` is one of this lesson's starters, i.e. nothing typed yet.
 *  Used to decide whether picking another problem would destroy work. */
export function isUntouchedStarter(lesson: Lesson, text: string): boolean {
  const all = lesson.starterVariants ?? [];
  const t = text.replace(/\r\n?/g, '\n').trim();
  return t === '' || all.some((v) => v.text.replace(/\r\n?/g, '\n').trim() === t);
}
