'use client';

// The teacher's end of the two gates in migrations/0016_lesson_modes.sql.
//
// Without this the gates were unreachable: the POST route had no caller
// anywhere in the app, the browser checks passed because a dev stub was the
// only writer, and a teacher could not set one at all. Authored, tested, wired
// to nothing — the failure this repo's CLAUDE.md warns about for `steps` and
// `aiGrader.prompt`, and the one scripts/sandbox-checks.py could not see
// because it exercised the read path only.

import { useCallback, useEffect, useState } from 'react';
import type { LessonMode } from '../lib/lesson-mode';

interface LessonOption {
  id: string;
  title: string;
}

interface Props {
  classId: string;
  /** Assignments a per-lesson override can be set on. */
  lessons: LessonOption[];
}

interface ModesResponse {
  classDefault: LessonMode | null;
  lessons: Array<{ lesson_id: string; mode: string; set_by_email: string; updated_at: number }>;
}

const CHOICES: Array<{ value: LessonMode | null; label: string; hint: string }> = [
  { value: null, label: 'Their choice', hint: 'Students pick Code or Build themselves' },
  { value: 'both', label: 'Both', hint: 'Explicitly allow either' },
  { value: 'visual', label: 'Shape tools', hint: 'Build only — no code editor' },
  { value: 'code', label: 'Code', hint: 'Code only — no shape tools' },
];

export default function LessonModeControl({ classId, lessons }: Props) {
  const [modes, setModes] = useState<ModesResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/classes/${classId}/lesson-modes`);
      if (!r.ok) throw new Error(`${r.status}`);
      setModes(await r.json());
      setError('');
    } catch {
      setError('Could not read the current settings.');
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  async function set(lessonId: string, mode: LessonMode | null) {
    setBusy(lessonId);
    setError('');
    try {
      const r = await fetch(`/api/classes/${classId}/lesson-modes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId, mode }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      await load();
    } catch {
      setError('That did not save. Nothing has changed.');
    }
    setBusy(null);
  }

  const perLesson = new Map((modes?.lessons ?? []).map((r) => [r.lesson_id, r.mode as LessonMode]));

  function Row({ id, label, current }: { id: string; label: string; current: LessonMode | null }) {
    return (
      <div className="lmc-row">
        <span className="lmc-label" title={id}>{label}</span>
        <span className="lmc-choices">
          {CHOICES.map((c) => (
            <button
              key={String(c.value)}
              type="button"
              disabled={busy === id}
              aria-pressed={current === c.value}
              title={c.hint}
              className={current === c.value ? 'on' : undefined}
              onClick={() => set(id, c.value)}
            >
              {c.label}
            </button>
          ))}
        </span>
      </div>
    );
  }

  return (
    <div className="lmc">
      <div className="lmc-head">
        <strong>Shape tools or code</strong>
        <span className="lmc-sub">
          An assignment setting beats the class setting. Anything left on
          &ldquo;their choice&rdquo; lets the student decide.
        </span>
      </div>

      {error && <p className="lmc-error">{error}</p>}

      <Row id="*" label="Whole class" current={modes?.classDefault ?? null} />

      {lessons.length > 0 && (
        <>
          <div className="lmc-sep">Per assignment</div>
          {lessons.map((l) => (
            <Row key={l.id} id={l.id} label={l.title} current={perLesson.get(l.id) ?? null} />
          ))}
        </>
      )}

      <style>{`
        .lmc {
          background: var(--card); border: 1px solid var(--border);
          border-radius: 4px; padding: 12px 14px; margin-bottom: 16px;
        }
        .lmc-head { display: flex; flex-direction: column; gap: 3px; margin-bottom: 10px; }
        .lmc-head strong { color: var(--text); font-size: 0.95rem; }
        .lmc-sub { color: #6272a4; font-size: 0.78rem; line-height: 1.45; }
        .lmc-error {
          margin: 0 0 8px; padding: 6px 8px; font-size: 12px;
          color: #ff5555; background: rgba(255, 85, 85, 0.1);
          border-left: 2px solid #ff5555;
        }
        .lmc-sep {
          color: #6272a4; font-size: 0.72rem; text-transform: uppercase;
          letter-spacing: 0.08em; margin: 12px 0 6px;
          border-top: 1px solid var(--border); padding-top: 8px;
        }
        .lmc-row {
          display: flex; align-items: center; gap: 10px;
          padding: 4px 0; flex-wrap: wrap;
        }
        .lmc-label {
          flex: 1 1 200px; min-width: 0; color: var(--text);
          font-size: 0.82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .lmc-choices { display: inline-flex; gap: 4px; flex-shrink: 0; }
        .lmc-choices button {
          padding: 3px 9px; font-size: 12px; cursor: pointer;
          background: transparent; color: #6272a4;
          border: 1px solid #44475a; border-radius: 3px;
        }
        .lmc-choices button:hover:not(:disabled) { color: var(--text); }
        .lmc-choices button.on { background: #bd93f9; color: #282a36; border-color: #bd93f9; }
        .lmc-choices button:disabled { opacity: 0.5; cursor: wait; }
      `}</style>
    </div>
  );
}
