// One ordering for lessons wherever the teacher side lists them (gradebook columns, student drawer,
// CSV header, "what is this lesson" labels). Lesson FOLDER ids are not in course order
// (3-2-2, 3-2-20, 3-2-22 ... 3-2-1), so order comes from the number the author wrote at the front of
// lesson.json's title: "3.2.10 Loops" -> [3, 2, 10], compared segment by segment as numbers.

/** The leading dotted number of a title as numbers, or null when the title has none. */
export function titleNumber(title: string | null | undefined): number[] | null {
  const m = /^\s*(\d+(?:\.\d+)*)/.exec(title ?? '');
  return m ? m[1].split('.').map(Number) : null;
}

/** The leading dotted number as text ("3.2.10"), or '' when there is none. */
export function titleNumberText(title: string | null | undefined): string {
  const m = /^\s*(\d+(?:\.\d+)*)/.exec(title ?? '');
  return m ? m[1] : '';
}

function compareSegments(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    // A shorter prefix ("3.2") sorts before its children ("3.2.1").
    if (a[i] === undefined) return -1;
    if (b[i] === undefined) return 1;
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

interface Orderable { id: string; title?: string | null }

/** Compare two lessons: numbered titles first in numeric order, unnumbered ones after, by id. */
export function compareLessons(a: Orderable, b: Orderable): number {
  const na = titleNumber(a.title);
  const nb = titleNumber(b.title);
  if (na && nb) return compareSegments(na, nb) || a.id.localeCompare(b.id, undefined, { numeric: true });
  if (na) return -1;
  if (nb) return 1;
  return a.id.localeCompare(b.id, undefined, { numeric: true });
}

/** Compare unit/module labels such as "3.2" or "3.10 Loops"; "Other" and unnumbered labels go last. */
export function compareUnitLabels(a: string, b: string): number {
  const na = titleNumber(a);
  const nb = titleNumber(b);
  if (na && nb) return compareSegments(na, nb) || a.localeCompare(b, undefined, { numeric: true });
  if (na) return -1;
  if (nb) return 1;
  if (a === 'Other') return b === 'Other' ? 0 : 1;
  if (b === 'Other') return -1;
  return a.localeCompare(b, undefined, { numeric: true });
}

/** What to show a teacher for a lesson id: its title when known, else the id. */
export function lessonLabel(id: string, titles?: Record<string, string> | null): string {
  const t = titles?.[id];
  return t && t.trim() ? t.trim() : id;
}
