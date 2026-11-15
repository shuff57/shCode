// Who a student's shared picture, sound, font or game goes to (migration 0057; server side
// functions/_shared/audience.ts, picker components/AudiencePicker.tsx). The types are here so the page and the
// server say the same thing; the rules below are pure so the page can check a pick before it asks the server.
//
// Three audiences (the spec is codehs-review/ASSET-AUDIENCE-SPEC.md):
//   'classes'  the classes the student ticks (every class they are in, until they change it);
//   'teacher'  every class of one teacher they have a class with, including ones they are not in;
//   'public'   "Everyone" (migration 0058): any VETTED account (in a class on this site), live at once, and any of the
//              owner's teachers can take it down (a pull is sticky, with an optional short reason). Making something
//              public also keeps it in all the owner's classes, which is where a pulled item falls back to.
// A teacher is only ever a person key and a name; another class is only counted, never named.
//
// Pure on purpose: the server imports its types, and the functions typecheck uses Workers' fetch types, so the
// browser call lives in lib/audience-client.ts.

/** What a share request carries (POST /api/library/[id]/share, /api/games/[id]/share). */
export type AudienceSpec = { classes: string[] } | { teacher: string } | { public: true };

/** How one shared item reads on the owner's lists. */
export type ItemAudience =
  | { kind: 'classes'; classes: string[] }
  | { kind: 'teacher'; teacher: string }
  | { kind: 'public' };

/** A teacher took a public thing down: the optional reason they typed, and when. */
export interface PulledInfo { reason: string | null; at: number }

/** The words a student reads on something a teacher pulled. */
export function pulledText(p: { reason: string | null }): string {
  return p.reason ? `Your teacher took this down: ${p.reason}` : 'Your teacher took this down.';
}

/** GET /api/audiences: what the picker offers. */
export interface AudienceOptions {
  classes: { id: string; name: string; teacherKey: string; teacherName: string }[];
  /** A student only: one entry per teacher whose class they are in. */
  teachers: { key: string; name: string; classCount: number }[];
  /** Whether "Everyone" is open to this person now, and if not, the sentence that says why (migration 0058). */
  public: { allowed: boolean; why?: string };
}

/** The picker's state. */
export type AudiencePick = { mode: 'classes'; classes: string[] } | { mode: 'teacher'; teacher: string } | { mode: 'public' };

export function pickToSpec(p: AudiencePick): AudienceSpec {
  return p.mode === 'public' ? { public: true } : p.mode === 'teacher' ? { teacher: p.teacher } : { classes: p.classes };
}

/** A teacher whose classes are worth a choice of their own: they have more than the one the student is in. */
export function wideTeachers(o: AudienceOptions): AudienceOptions['teachers'] {
  return o.teachers.filter((t) => t.classCount > 1);
}

/**
 * Is there anything to choose? Before Public, a student in one class whose teacher has no other classes had exactly
 * one thing to do. Now "Everyone" is a choice too, so the picker shows whenever it is open to them (or there is
 * more than one class or a wider teacher).
 */
export function pickerMatters(o: AudienceOptions | null): boolean {
  return !!o && (o.classes.length > 1 || wideTeachers(o).length > 0 || o.public.allowed);
}

/** Where the picker starts: what the item already has, else every class the person is in (the old behaviour). */
export function initialPick(o: AudienceOptions, current?: ItemAudience | null): AudiencePick {
  if (current?.kind === 'public' && o.public.allowed) return { mode: 'public' };
  if (current?.kind === 'teacher' && o.teachers.some((t) => t.key === current.teacher)) return { mode: 'teacher', teacher: current.teacher };
  const ids = new Set(o.classes.map((c) => c.id));
  const kept = current?.kind === 'classes' ? current.classes.filter((c) => ids.has(c)) : [];
  return { mode: 'classes', classes: kept.length ? kept : o.classes.map((c) => c.id) };
}

/** Why a pick cannot be sent, in plain words, or null. */
export function pickProblem(p: AudiencePick): string | null {
  if (p.mode === 'classes' && !p.classes.length) return 'Tick at least one class.';
  return null;
}

/** What a pick means as an item's audience, for the sentence a confirmation says. */
export function pickToAudience(p: AudiencePick): ItemAudience {
  return p.mode === 'public' ? { kind: 'public' } : p.mode === 'teacher' ? { kind: 'teacher', teacher: p.teacher } : { kind: 'classes', classes: p.classes };
}

/** "Period 1 and Robotics" / "all of Ms. Huff's classes": the sentence a share confirmation uses. */
export function audienceSummary(o: AudienceOptions | null, current?: ItemAudience | null): string {
  if (current?.kind === 'public') return 'everyone in a class on shCode';
  if (!o) return 'your class';
  if (current?.kind === 'teacher') {
    const t = o.teachers.find((x) => x.key === current.teacher);
    return t ? `all of ${t.name}'s classes` : "all of a teacher's classes";
  }
  const names = o.classes.filter((c) => !current || current.kind !== 'classes' || current.classes.includes(c.id)).map((c) => c.name);
  if (!names.length || names.length === o.classes.length) return o.classes.length === 1 ? o.classes[0].name : 'all your classes';
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Is this pick what the item already has? (A share is only re-sent when the audience really changed.) */
export function samePick(p: AudiencePick, current?: ItemAudience | null): boolean {
  if (!current) return false;
  if (p.mode === 'public') return current.kind === 'public';
  if (p.mode === 'teacher') return current.kind === 'teacher' && current.teacher === p.teacher;
  if (current.kind !== 'classes') return false;
  const a = [...p.classes].sort().join('|');
  const b = [...current.classes].sort().join('|');
  return a === b;
}
