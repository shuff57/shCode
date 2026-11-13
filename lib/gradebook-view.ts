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

// ---- Paging by module (climb 4 round 5) ---------------------------------------------------------
// The grid shows ONE module's columns at a time (or every module, the old scrolling grid). These are
// the rules for which modules are pages, what the address says, and where the pager starts.

/** The short, stable id a module goes by in the address (`&module=1.1`): its leading number, else the label. */
export function moduleKey(unit: string): string {
  const m = unit.match(/^\d+(?:\.\d+)*/);
  return m ? m[0] : unit;
}

/** How many columns a module's page draws under the current "include ungraded" switch. */
export function pageSize(o: ModuleOption, showAll: boolean): number {
  return showAll || o.counted === 0 ? o.total : o.counted;
}

/**
 * The modules the pager steps through, in course order. A module with nothing that counts is skipped
 * unless ungraded lessons are shown (it would be a page of readings); if NOTHING counts anywhere (an
 * older manifest) every module is a page, the same fallback selectGradebookLessons makes.
 */
export function modulePages(options: ModuleOption[], showAll: boolean): ModuleOption[] {
  const pages = options.filter((o) => (showAll ? o.total > 0 : o.counted > 0));
  return pages.length > 0 ? pages : options.filter((o) => o.total > 0);
}

/**
 * What a `module` address value means: 'all' is the every-module grid (null), a module key or full
 * label that is still a page is that module's unit, anything else (absent, stale) is undefined, i.e.
 * "no choice made, use the default".
 */
export function resolveModuleParam(pages: ModuleOption[], param: string | null | undefined): string | null | undefined {
  if (param === null || param === undefined || param === '') return undefined;
  if (param === 'all') return null;
  const hit = pages.find((p) => moduleKey(p.unit) === param || p.unit === param);
  return hit ? hit.unit : undefined;
}

export interface PagerState {
  /** The module shown, or null for every module. */
  unit: string | null;
  /** 1-based position among the pages; 0 when every module is shown. */
  position: number;
  total: number;
  prev: string | null;
  next: string | null;
}

/** Position and neighbours of the shown page. "All modules" has no previous; its next is the first module. */
export function pagerFor(pages: ModuleOption[], unit: string | null): PagerState {
  const i = unit === null ? -1 : pages.findIndex((p) => p.unit === unit);
  if (i < 0) return { unit: null, position: 0, total: pages.length, prev: null, next: pages[0]?.unit ?? null };
  return {
    unit: pages[i].unit,
    position: i + 1,
    total: pages.length,
    prev: i > 0 ? pages[i - 1].unit : null,
    next: i < pages.length - 1 ? pages[i + 1].unit : null,
  };
}

/**
 * The page to open on when the teacher has not picked one: the module of the counted lesson whose due
 * date passed most recently (what was just due is what a teacher is checking), else the module of the
 * next lesson coming due, else the first page. Null only when there are no pages at all.
 */
export function defaultModule<T extends ViewLesson>(
  pages: ModuleOption[],
  ordered: T[],
  isCounted: (l: T) => boolean,
  dueDates: Record<string, number> | undefined,
  now: number,
): string | null {
  if (pages.length === 0) return null;
  const isPage = new Set(pages.map((p) => p.unit));
  let past: { at: number; unit: string } | null = null;
  let future: { at: number; unit: string } | null = null;
  for (const l of ordered) {
    const at = dueDates?.[l.id];
    const unit = l.unit ?? 'Other';
    if (typeof at !== 'number' || !isCounted(l) || !isPage.has(unit)) continue;
    if (at <= now) { if (!past || at > past.at) past = { at, unit }; }
    else if (!future || at < future.at) future = { at, unit };
  }
  return past?.unit ?? future?.unit ?? pages[0].unit;
}

/**
 * Column width for a page: at least `min` (two lines of a 13px title), growing to share the room the
 * grid has, up to `max`. The every-module grid keeps `min` (its columns scroll anyway).
 */
export function pagedColumnWidth(available: number, columns: number, min = 168, max = 240): number {
  if (columns <= 0 || !Number.isFinite(available) || available <= 0) return min;
  return Math.max(min, Math.min(max, Math.floor(available / columns)));
}
