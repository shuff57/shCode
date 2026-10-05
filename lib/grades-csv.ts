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
