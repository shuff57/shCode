// Typed dates and times for the teacher's Schedule (ux2 T4). Pure, so scripts/test-typed-date.mjs pins it.
//
// The native <input type="date"> is three segments, and a click in the middle of the box lands on the year:
// a teacher who clicked there and typed 12/15/2026 got 11/04/152026 and the message "not a whole date". The
// Schedule now uses a plain text field that takes what people type (12/15/2026, 12-15-2026, 2026-12-15,
// 12152026) and says exactly what is wrong when it cannot read it. The calendar button stays for picking.

import { dateWindowProblem } from './due-dates-core';

export type Parsed<T> = { ok: true; value: T } | { ok: false; problem: string };

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const EXAMPLE = 'Type a date like 12/15/2026 (month/day/year).';

function daysIn(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** "2026-12-15" from parts, after checking them; a sentence saying what is wrong otherwise. */
function fromParts(y: string, m: string, d: string, typed: string): Parsed<string> {
  if (y.length > 4) return { ok: false, problem: `The year ${y} has too many digits. ${EXAMPLE}` };
  if (y.length === 3 || y.length === 1) return { ok: false, problem: `Type the whole year (4 digits), like 12/15/2026.` };
  const year = y.length === 2 ? 2000 + Number(y) : Number(y);
  const month = Number(m);
  const day = Number(d);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { ok: false, problem: `There is no month ${m}. Put the month first: ${EXAMPLE.replace('Type a date like ', '')}` };
  }
  if (!Number.isInteger(day) || day < 1 || day > daysIn(year, month)) {
    return { ok: false, problem: `${MONTHS[month - 1]} ${year} has ${daysIn(year, month)} days, so "${typed}" is not a date.` };
  }
  return { ok: true, value: `${year}-${pad(month)}-${pad(day)}` };
}

/**
 * What a teacher typed into a date field, as "YYYY-MM-DD". Accepts M/D/YYYY (also with - or . between),
 * M/D/YY (20YY), YYYY-MM-DD and 8 digits MMDDYYYY. Empty text is `{ ok: true, value: '' }`: the field
 * was cleared. Never guesses a year or swaps day and month.
 */
export function parseTypedDate(text: string): Parsed<string> {
  const t = text.trim();
  if (t === '') return { ok: true, value: '' };
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return fromParts(m[1], m[2], m[3], t);
  m = /^(\d{1,2})\s*[/.-]\s*(\d{1,2})\s*[/.-]\s*(\d+)$/.exec(t);
  if (m) return fromParts(m[3], m[1], m[2], t);
  m = /^(\d{2})(\d{2})(\d{4})$/.exec(t);
  if (m) return fromParts(m[3], m[1], m[2], t);
  if (/^\d{1,2}\s*[/.-]\s*\d{1,2}$/.test(t)) return { ok: false, problem: `Add the year: ${EXAMPLE.replace('Type a date like ', 'like ')}` };
  return { ok: false, problem: `"${t}" is not a date the page can read. ${EXAMPLE}` };
}

/** "12/15/2026" for a stored "2026-12-15"; '' for ''. */
export function formatDateForField(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

/**
 * What a teacher typed into a time field, as 24-hour "HH:MM". Accepts 3:00 PM, 3pm, 3 p, 0300P, 15:00,
 * 1500 and 9:05am. Empty text is `{ ok: true, value: '' }` (no time: the server's default applies).
 */
export function parseTypedTime(text: string): Parsed<string> {
  const t = text.trim().toLowerCase().replace(/\./g, '');
  if (t === '') return { ok: true, value: '' };
  const m = /^(\d{1,2})(?::?(\d{2}))?\s*(a|am|p|pm)?$/.exec(t);
  if (!m) return { ok: false, problem: `"${text.trim()}" is not a time the page can read. Type a time like 3:00 PM.` };
  let hour = Number(m[1]);
  const minute = m[2] === undefined ? 0 : Number(m[2]);
  const half = m[3];
  if (minute > 59) return { ok: false, problem: `There is no minute ${m[2]}. Type a time like 3:00 PM.` };
  if (half) {
    if (hour < 1 || hour > 12) return { ok: false, problem: `With AM or PM the hour is 1 to 12. Type a time like 3:00 PM.` };
    if (half.startsWith('p') && hour !== 12) hour += 12;
    if (half.startsWith('a') && hour === 12) hour = 0;
  } else if (hour > 23) {
    return { ok: false, problem: `There is no hour ${m[1]}. Type a time like 3:00 PM.` };
  }
  return { ok: true, value: `${pad(hour)}:${pad(minute)}` };
}

/** "3:00 PM" for a stored "15:00"; '' for ''. */
export function formatTimeForField(hhmm: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return hhmm;
  const h = Number(m[1]);
  return `${h % 12 === 0 ? 12 : h % 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

// ---------------------------------------------------------------------------
// One date + time edit, from what is typed to what is sent (ux2 review fix)
// ---------------------------------------------------------------------------
//
// The field keeps what is typed as text drafts (null = showing the saved value). An edit can be typed while
// the previous one is still being saved; these two rules make sure such an edit is neither lost nor
// mistaken for the one that was sent.

export type CommitPlan =
  /** Nothing typed: nothing to do, keep everything as it is. */
  | { kind: 'idle' }
  /** What is typed is what is saved: drop the drafts, send nothing. */
  | { kind: 'unchanged' }
  /** The page cannot read it, or the date is outside the school window: say so, send nothing. */
  | { kind: 'refuse'; problem: string }
  /** A time was typed with no date to go with it. */
  | { kind: 'needs-date'; problem: string }
  /** Send this pair. `date: null` clears the row (and its time). */
  | { kind: 'send'; date: string | null; time: string | null };

/**
 * What one commit of the pair should do. `saved` is what the server holds as far as the field knows (after a
 * save it is what was just sent, before the list has been read back). `picked` is a date chosen from the
 * calendar grid, which wins over a typed date. `today` is the school date ("YYYY-MM-DD").
 */
export function planDateCommit(input: {
  saved: { date: string; time: string };
  draftDate: string | null;
  draftTime: string | null;
  picked?: string;
  today: string;
}): CommitPlan {
  const { saved, draftDate, draftTime, picked, today } = input;
  if (draftDate === null && draftTime === null && picked === undefined) return { kind: 'idle' };
  let date = saved.date;
  if (picked !== undefined) date = picked;
  else if (draftDate !== null) {
    const d = parseTypedDate(draftDate);
    if (!d.ok) return { kind: 'refuse', problem: d.problem };
    date = d.value;
  }
  let time = saved.time;
  if (draftTime !== null) {
    const t = parseTypedTime(draftTime);
    if (!t.ok) return { kind: 'refuse', problem: t.problem };
    time = t.value;
  }
  if (date === '') {
    if (saved.date !== '') return { kind: 'send', date: null, time: null };
    return draftTime !== null && draftTime.trim()
      ? { kind: 'needs-date', problem: 'Type a date first; a time needs a date. Nothing was saved.' }
      : { kind: 'unchanged' };
  }
  if (date !== saved.date) {
    const p = dateWindowProblem(date, today);
    if (p) return { kind: 'refuse', problem: p };
  }
  if (date === saved.date && time === saved.time) return { kind: 'unchanged' };
  return { kind: 'send', date, time: time || null };
}

/**
 * The drafts to keep once a save returns. A draft is dropped only if it is still exactly the text that was
 * sent; one typed after the save started is a newer edit and stays (compared by value, not by "was there a
 * save"). Null in `sent` means that half was not a draft when it was sent, so any draft there now is newer.
 */
export function draftsAfterSave(
  sent: { date: string | null; time: string | null },
  now: { date: string | null; time: string | null },
): { date: string | null; time: string | null } {
  return {
    date: now.date !== null && now.date === sent.date ? null : now.date,
    time: now.time !== null && now.time === sent.time ? null : now.time,
  };
}
