'use client';

// Which class am I setting due dates for? Due dates are per class — Period 2
// and Period 5 pace independently — so every chip on the page needs one
// answer to this question. Renders nothing for students.
//
// The choice persists in localStorage, so a teacher who works in one class all
// week does not re-pick it on every page load.

import { selectClass, useTeacherDue } from '../lib/due-dates-edit';

export default function DueClassPicker() {
  const due = useTeacherDue();

  if (!due.canEdit || due.classes.length === 0) return null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
      {/* No visible label — the chips beside it already say what the class is
          for. The name survives as aria-label so a screen reader still gets it. */}
      <select
        id="due-class"
        aria-label="Class these due dates apply to"
        value={due.activeClassId ?? ''}
        disabled={due.saving}
        onChange={(e) => void selectClass(e.target.value)}
        style={{
          background: '#282a36',
          color: '#f8f8f2',
          border: '1px solid #44475a',
          borderRadius: 6,
          fontSize: 13,
          padding: '5px 8px',
          fontFamily: 'inherit',
          outline: 'none',
        }}
      >
        {due.classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      {due.error && <span style={{ color: '#ff5555' }}>{due.error}</span>}
    </span>
  );
}
