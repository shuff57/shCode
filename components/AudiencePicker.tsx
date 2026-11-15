'use client';

// "Who can see it": which of the student's classes a share goes to (migration 0057, lib/audience.ts). One radio
// per way to choose: "My classes" with a tick per class, and "All of <teacher>'s classes (n)" for each teacher
// who has more classes than the one the student is in. It renders nothing when there is nothing to choose (one
// class, a teacher with no others, and Everyone not open to them), and with one class it says "My class" with no ticks.
// "Everyone" (migration 0058): any account in a class on shCode, live at once, a teacher can take it down. It is
// disabled with the reason when a class switched it off, and when a teacher pulled this very thing (`pulled`).
// Used by ShareToggle (pictures, sounds, fonts) and Publish game.

import { pickProblem, pickerMatters, pulledText, wideTeachers, type AudienceOptions, type AudiencePick, type PulledInfo } from '../lib/audience';

export default function AudiencePicker({ options, value, onChange, idPrefix, compact = false, pulled = null }: {
  options: AudienceOptions | null;
  value: AudiencePick;
  onChange: (p: AudiencePick) => void;
  /** A teacher took this very thing down from Everyone: that option is closed, with their reason. */
  pulled?: PulledInfo | null;
  /** Unique per mounted picker: names the radio group. */
  idPrefix: string;
  /** Smaller type, for a popover. */
  compact?: boolean;
}) {
  if (!options || !(pickerMatters(options) || pulled)) return null;
  const size = compact ? 12 : 13;
  const teachers = wideTeachers(options);
  const problem = pickProblem(value);
  const chosen = new Set(value.mode === 'classes' ? value.classes : []);
  const single = options.classes.length === 1;
  const publicClosed = !options.public.allowed || !!pulled;
  const publicWhy = pulled ? `${pulledText(pulled)} It stays with your classes until a teacher puts it back.` : options.public.why;

  const toggle = (id: string) => {
    const next = new Set(chosen);
    if (next.has(id)) next.delete(id); else next.add(id);
    // Keep the classes in the order the picker lists them.
    onChange({ mode: 'classes', classes: options.classes.map((c) => c.id).filter((c) => next.has(c)) });
  };

  return (
    <fieldset data-testid="audience-picker" style={{ border: '1px solid var(--c-line)', borderRadius: 4, padding: '6px 10px 8px', margin: '0 0 10px', minWidth: 0 }}>
      <legend style={{ fontSize: size, padding: '0 4px', color: 'var(--c-fg)' }}>Who can see it</legend>
      <div role="radiogroup" aria-label="Who can see it" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label htmlFor={`${idPrefix}-classes`} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', cursor: 'pointer', fontSize: size, lineHeight: 1.4 }}>
          <input id={`${idPrefix}-classes`} type="radio" name={`${idPrefix}-audience`} checked={value.mode === 'classes'}
            onChange={() => onChange({ mode: 'classes', classes: options.classes.map((c) => c.id) })} style={{ marginTop: 3 }} />
          <span style={{ minWidth: 0 }}>
            <strong style={{ color: 'var(--c-fg)', fontWeight: 600 }}>{single ? 'My class' : 'My classes'}</strong>
            <span style={{ display: 'block', color: 'var(--c-dim)', fontSize: size - 1 }}>
              {single ? `Only ${options.classes[0].name}.` : 'Only the classes you tick.'}
            </span>
          </span>
        </label>
        {value.mode === 'classes' && !single && (
          <ul aria-label="Classes" style={{ listStyle: 'none', margin: '0 0 0 22px', padding: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            {options.classes.map((c) => (
              <li key={c.id}>
                <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: size, cursor: 'pointer', color: 'var(--c-fg)' }}>
                  <input type="checkbox" checked={chosen.has(c.id)} onChange={() => toggle(c.id)} data-testid="audience-class" />
                  <span>{c.name}</span>
                  {options.teachers.length > 1 && <span style={{ color: 'var(--c-dim)', fontSize: size - 1 }}>{c.teacherName}</span>}
                </label>
              </li>
            ))}
          </ul>
        )}
        {teachers.map((t) => (
          <label key={t.key} htmlFor={`${idPrefix}-t-${t.key}`} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', cursor: 'pointer', fontSize: size, lineHeight: 1.4 }}>
            <input id={`${idPrefix}-t-${t.key}`} type="radio" name={`${idPrefix}-audience`} data-testid="audience-teacher"
              checked={value.mode === 'teacher' && value.teacher === t.key} onChange={() => onChange({ mode: 'teacher', teacher: t.key })} style={{ marginTop: 3 }} />
            <span style={{ minWidth: 0 }}>
              <strong style={{ color: 'var(--c-fg)', fontWeight: 600 }}>All of {t.name}&apos;s classes ({t.classCount})</strong>
              <span style={{ display: 'block', color: 'var(--c-dim)', fontSize: size - 1 }}>
                Students in any of {t.name}&apos;s classes can see it, even ones you are not in.
              </span>
            </span>
          </label>
        ))}
        <label htmlFor={`${idPrefix}-public`} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', cursor: publicClosed ? 'default' : 'pointer', opacity: publicClosed ? 0.65 : 1, fontSize: size, lineHeight: 1.4 }}>
          <input id={`${idPrefix}-public`} type="radio" name={`${idPrefix}-audience`} data-testid="audience-public" disabled={publicClosed}
            checked={value.mode === 'public'} onChange={() => onChange({ mode: 'public' })} style={{ marginTop: 3 }} />
          <span style={{ minWidth: 0 }}>
            <strong style={{ color: 'var(--c-fg)', fontWeight: 600 }}>Everyone</strong>
            <span style={{ display: 'block', color: 'var(--c-dim)', fontSize: size - 1 }}>
              {publicClosed
                ? publicWhy
                : 'Anyone in a class on shCode can see it, with your first name and last initial. Your teacher can take it down.'}
            </span>
          </span>
        </label>
      </div>
      {problem && <p role="alert" style={{ margin: '6px 0 0', fontSize: size - 1, color: 'var(--c-red)' }}>{problem}</p>}
    </fieldset>
  );
}
