// The one-row-per-student grade export: what a teacher copies into Aeries or a spreadsheet.
//
// One row per student, the grade SO FAR (functions/_shared/grading.ts studentGrading: work done plus work
// past due) with the progress count beside it and a column per grade category, so the number can be traced.
// Pure (no DOM) so it is tested; the page only downloads the string.
//
// Names are typed by students at signup and a spreadsheet runs a cell that starts with = + - @ as a
// formula, so every TEXT cell is neutralised by csvCell. Numbers are written as numbers.

import { CATEGORY_LABEL, GRADE_CATEGORIES, type GradeCategory } from './grading-weights';

export interface GradesCsvStudent {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  /** 0-100 grade so far; ignored when `counted` is 0 (nothing is due and nothing is done yet). */
  percent: number;
  counted: number;
  done: number;
  total: number;
  missing: number;
  categories?: Array<{ category: string; percent: number }>;
}

/** Quote a cell. A text cell that would run as a formula in a spreadsheet gets a leading apostrophe. */
export function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let v = value;
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function buildGradesCsv(students: GradesCsvStudent[]): string {
  const header = [
    'last_name',
    'first_name',
    'email',
    'grade_so_far_percent',
    'graded_lessons_done',
    'graded_lessons_total',
    'past_due_not_done',
    ...GRADE_CATEGORIES.map((c) => `${CATEGORY_LABEL[c]} %`),
  ];
  const byName = [...students].sort(
    (a, b) =>
      Number(!(a.lastName || a.firstName)) - Number(!(b.lastName || b.firstName)) ||
      `${a.lastName ?? ''} ${a.firstName ?? ''} ${a.email}`.localeCompare(`${b.lastName ?? ''} ${b.firstName ?? ''} ${b.email}`),
  );
  const rows = byName.map((s) => {
    const cat = new Map<string, number>((s.categories ?? []).map((c) => [c.category, c.percent]));
    return [
      csvCell(s.lastName ?? ''),
      csvCell(s.firstName ?? ''),
      csvCell(s.email),
      csvCell(s.counted > 0 ? s.percent : null),
      csvCell(s.done),
      csvCell(s.total),
      csvCell(s.missing),
      ...GRADE_CATEGORIES.map((c: GradeCategory) => csvCell(cat.has(c) ? cat.get(c)! : null)),
    ].join(',');
  });
  return [header.map(csvCell).join(','), ...rows].join('\r\n');
}

// ---------------------------------------------------------------------------
// The per-lesson export (ux2 T8): the gradebook grid as a spreadsheet
// ---------------------------------------------------------------------------
//
// The second export, and labelled as such on screen: buildGradesCsv is one row per student with the GRADE;
// this is one row per student with a column per graded LESSON. It used to be emails only, a stray due-date row
// under the header, and single-letter codes (C, S, P, L) nobody was told the meaning of. Now: the same name
// columns and grade as the grade export, each lesson's maximum and due date in its header, a number where
// there is a score and plain words where there is not.

/** The cell facts the gradebook grid has (GET /api/classes/[id]/gradebook). */
export interface LessonScoreCell {
  state: 'completed' | 'started' | null;
  score: number | null;
  submitted_score: number | null;
  possible: number | null;
  late?: boolean;
  pending?: boolean;
}

export interface LessonScoresStudent {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  /** Grade so far, or null when nothing counts yet. */
  grade: number | null;
  cells: Record<string, LessonScoreCell | undefined>;
}

export interface LessonScoresColumn {
  id: string;
  title: string;
  maxScore?: number | null;
  /** "2026-11-09" in school time, or null. */
  due?: string | null;
}

/** One cell as a spreadsheet reads it: the score as a number, else a word; " (late)" when handed in late. */
export function lessonScoreText(c: LessonScoreCell | undefined): string | number | null {
  if (!c) return null;
  const late = c.late ? ' (late)' : '';
  // An outage row is completed with no score: it waits for the teacher, it is not a finished lesson.
  if (c.pending) return `needs grading${late}`;
  // A 0-point lab stores 0 of 0 and reads done; a teacher's mark on one is the one number it can hold.
  if (c.state === 'completed' && c.possible === 0) return c.score ? (late ? `${c.score}${late}` : c.score) : `done${late}`;
  if (c.score !== null) return late ? `${c.score}${late}` : c.score;
  if (c.state === 'completed') return `done${late}`;
  if (c.state === 'started') return `started${late}`;
  // Handed in and graded but not passed: WrittenGrader writes no lesson_state for a failing grade.
  if (c.submitted_score !== null) return `handed in, ${c.submitted_score}, not passed${late}`;
  return late ? 'missing' : null;
}

/** Named students first by last name, then first name, then email; accounts with no name last, by email. */
export function compareByLastName(
  a: { email: string; firstName?: string | null; lastName?: string | null },
  b: { email: string; firstName?: string | null; lastName?: string | null },
): number {
  const named = (s: typeof a) => !!((s.lastName ?? '').trim() || (s.firstName ?? '').trim());
  const key = (s: typeof a) => [(s.lastName ?? '').trim(), (s.firstName ?? '').trim()];
  if (named(a) !== named(b)) return named(a) ? -1 : 1;
  if (!named(a)) return a.email.localeCompare(b.email);
  const [al, af] = key(a);
  const [bl, bf] = key(b);
  return al.localeCompare(bl, undefined, { sensitivity: 'base' }) || af.localeCompare(bf, undefined, { sensitivity: 'base' }) || a.email.localeCompare(b.email);
}

export function buildLessonScoresCsv(students: LessonScoresStudent[], lessons: LessonScoresColumn[]): string {
  const head = (l: LessonScoresColumn) => {
    const bits = [l.maxScore && l.maxScore > 0 ? `out of ${l.maxScore}` : null, l.due ? `due ${l.due}` : null].filter(Boolean);
    return bits.length ? `${l.title} (${bits.join(', ')})` : l.title;
  };
  const header = ['last_name', 'first_name', 'email', 'grade_so_far_percent', ...lessons.map(head)];
  const rows = [...students].sort(compareByLastName).map((s) =>
    [
      csvCell(s.lastName ?? ''),
      csvCell(s.firstName ?? ''),
      csvCell(s.email),
      csvCell(s.grade),
      ...lessons.map((l) => csvCell(lessonScoreText(s.cells[l.id]))),
    ].join(','),
  );
  return [header.map(csvCell).join(','), ...rows].join('\r\n');
}

/**
 * A class average for display only (ux2 T8): the mean of the numbers given, ignoring null/undefined/NaN,
 * rounded to a whole number, with how many it averaged. Never a grade for anyone: the caller passes the
 * percents already on the page (each finished lesson's lessonPercent, each student's grade so far).
 */
export function classAverage(values: Array<number | null | undefined>): { avg: number | null; n: number } {
  const xs = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (xs.length === 0) return { avg: null, n: 0 };
  return { avg: Math.round(xs.reduce((a, b) => a + b, 0) / xs.length), n: xs.length };
}
