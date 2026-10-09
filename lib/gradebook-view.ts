/**
 * Which gradebook columns to draw: pure, so the rule is testable without a browser.
 *
 * Two independent narrowings, applied in this order:
 *   1. `module` (a lesson's `unit` string in the manifest, e.g. "3.4 Function Expressions...")
 *      keeps one module's lessons; null keeps all of them.
 *   2. Unless `showAll`, only lessons that COUNT toward the grade stay. If nothing in what is left
 *      counts (an older manifest, or a module of pure reading) everything left is shown instead of
 *      an empty grid.
 * This only chooses columns. Cell data and the grade are never touched.
 */
export interface ViewLesson {
  id: string;
  unit: string | null;
}

export interface GradebookSelection<T extends ViewLesson> {
  lessons: T[];
  /** Column groups, in order, for the header row. */
  spans: Array<{ unit: string; count: number }>;
  /** How many lessons of the chosen scope are left out because they do not count toward the grade. */
  hidden: number;
  /** True when the narrowing to counted lessons actually happened. */
  narrowed: boolean;
}

export interface ModuleOption {
  unit: string;
  total: number;
  counted: number;
}

export function moduleOptions<T extends ViewLesson>(ordered: T[], isCounted: (l: T) => boolean): ModuleOption[] {
  const out: ModuleOption[] = [];
  const at = new Map<string, ModuleOption>();
  for (const l of ordered) {
    const unit = l.unit ?? 'Other';
    let o = at.get(unit);
    if (!o) { o = { unit, total: 0, counted: 0 }; at.set(unit, o); out.push(o); }
    o.total += 1;
    if (isCounted(l)) o.counted += 1;
  }
  return out;
}

export function selectGradebookLessons<T extends ViewLesson>(
  ordered: T[],
  opts: { module: string | null; showAll: boolean; isCounted: (l: T) => boolean },
): GradebookSelection<T> {
  const scope = opts.module === null ? ordered : ordered.filter((l) => (l.unit ?? 'Other') === opts.module);
  const counted = scope.filter(opts.isCounted);
  const narrowed = !opts.showAll && counted.length > 0;
  const lessons = narrowed ? counted : scope;
  const spans: Array<{ unit: string; count: number }> = [];
  for (const l of lessons) {
    const unit = l.unit ?? 'Other';
    const last = spans[spans.length - 1];
    if (last && last.unit === unit) last.count += 1;
    else spans.push({ unit, count: 1 });
  }
  return { lessons, spans, hidden: narrowed ? scope.length - counted.length : 0, narrowed };
}
