'use client';

// The class page's list of every game students shared into this class (the
// Games library, functions/api/classes/[id]/game-shares), with Play, Hide /
// Show again and Remove, beside the texture and sound moderation. Hiding takes
// a game out of students' view at once; removing takes it out of the class's
// Games. Neither touches the student's own game. Delete (in the row's menu,
// POST /api/classes/[id]/game-delete) removes the game from the student's own
// Library too; only for a student enrolled in this class (`canDelete`).

import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../lib/http-error';
import { playHref } from '../lib/games-client';
import { useFeedback } from './FeedbackProvider';
import { RowMenu } from './RowMenu';
import { deleteGameConfirm } from '../lib/library-delete-words';

interface Row {
  id: string;
  title: string;
  modeLabel: string;
  owner: string;
  sharedAt: number;
  hidden: boolean;
  /** The publisher is a student enrolled in this class now, so a teacher may delete it outright. */
  canDelete?: boolean;
  /** Suggestions this class's students picked on it (#96). */
  suggestions?: number;
  /** Live comments on it (migration 0051), and whether this class's feedback on it is turned off. */
  comments?: number;
  feedbackOff?: boolean;
}

export default function ClassGamesModeration({ classId }: { classId: string }) {
  const { toast, confirm } = useFeedback();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [classOff, setClassOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/game-shares`, { credentials: 'same-origin' });
    if (!res.ok) { setError(await errorText(res)); return; }
    setError(null);
    const body = (await res.json()) as { games: Row[]; classFeedbackOff?: boolean };
    setRows(body.games);
    setClassOff(!!body.classFeedbackOff);
  }, [classId]);
  useEffect(() => { void load(); }, [load]);

  const act = async (r: Row, action: 'hide' | 'unhide' | 'remove') => {
    if (action === 'remove' && !(await confirm({
      title: `Remove "${r.title}" from the class's Games?`,
      message: `Classmates will no longer see, play or remix it. ${r.owner}'s own game stays in their account, and copies classmates already remixed stay theirs.`,
      confirmLabel: 'Remove',
      danger: true,
    }))) return;
    const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/game-shares`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: r.id, action }),
    });
    if (!res.ok) { toast(await errorText(res), { kind: 'error' }); return; }
    toast(action === 'hide' ? `Hid "${r.title}" from students.` : action === 'unhide' ? `"${r.title}" is visible to students again.` : `Removed "${r.title}" from the class's Games.`);
    await load();
  };

  const remove = async (r: Row) => {
    if (!(await confirm({ ...deleteGameConfirm(r.owner, r.title), confirmLabel: 'Delete', danger: true }))) return;
    const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/game-delete`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: r.id }),
    });
    if (!res.ok) { toast(await errorText(res), { kind: 'error' }); return; }
    toast(`Deleted ${r.owner}'s game "${r.title}".`);
    await load();
  };

  const clearSuggestions = async (r: Row) => {
    if (!(await confirm({
      title: `Clear the suggestions on "${r.title}"?`,
      message: `The ${r.suggestions} suggestion${r.suggestions === 1 ? '' : 's'} this class's students picked on it go away, for ${r.owner} too. Students can pick again afterwards. The game is not changed.`,
      confirmLabel: 'Clear',
      danger: true,
    }))) return;
    const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/game-shares`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId: r.id, action: 'clear-suggestions' }),
    });
    if (!res.ok) { toast(await errorText(res), { kind: 'error' }); return; }
    const { cleared } = (await res.json()) as { cleared: number };
    toast(`Cleared ${cleared} suggestion${cleared === 1 ? '' : 's'} on "${r.title}".`);
    await load();
  };

  // Feedback (comments and suggestions, migration 0051): one game, or every game in the class.
  const feedback = async (body: { gameId?: string; action: 'feedback-off' | 'feedback-on' | 'class-feedback-off' | 'class-feedback-on' }, done: string) => {
    const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/game-shares`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) { toast(await errorText(res), { kind: 'error' }); return; }
    toast(done);
    await load();
  };
  const classSwitch = (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 8 }}>
      <input type="checkbox" checked={!classOff} onChange={(e) => void feedback(
        { action: e.target.checked ? 'class-feedback-on' : 'class-feedback-off' },
        e.target.checked ? 'Students can comment on and suggest things for the class\'s games again.' : 'Feedback is off on every game in this class. Makers and teachers can still read what was written.',
      )} />
      Let students comment on and suggest things for this class&apos;s games
    </label>
  );

  if (error) return <p style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</p>;
  if (!rows) return <p style={{ color: 'var(--c-dim)', fontSize: 13 }}>Loading…</p>;
  if (!rows.length) {
    return <>{classSwitch}<p style={{ color: 'var(--c-dim)', fontSize: 13, margin: 0 }}>No games shared yet. When a student presses &ldquo;Publish game&rdquo; in the moSHion sandbox and shares it, it shows up here and in every classmate&rsquo;s Library under Games.</p></>;
  }
  const btn = { fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)', textDecoration: 'none' } as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {classSwitch}
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', opacity: r.hidden ? 0.7 : 1 }}>
          <div style={{ fontSize: 13, minWidth: 160 }}>
            <strong>{r.title}</strong> <span style={{ color: 'var(--c-dim)' }}>by {r.owner} · {r.modeLabel}</span>
            {r.hidden && <span style={{ color: 'var(--c-orange)' }}> · hidden from students</span>}
            {!!r.suggestions && <span style={{ color: 'var(--c-dim)' }}> · {r.suggestions} suggestion{r.suggestions === 1 ? '' : 's'}</span>}
            {!!r.comments && <span style={{ color: 'var(--c-dim)' }}> · {r.comments} comment{r.comments === 1 ? '' : 's'}</span>}
            {r.feedbackOff && !classOff && <span style={{ color: 'var(--c-orange)' }}> · feedback off</span>}
          </div>
          <span style={{ flex: 1 }} />
          <a href={playHref(r.id)} target="_blank" rel="noopener noreferrer" style={btn}>Play ↗</a>
          {r.hidden
            ? <button type="button" style={btn} onClick={() => void act(r, 'unhide')}>Show again</button>
            : <button type="button" style={btn} onClick={() => void act(r, 'hide')}>Hide</button>}
          <button type="button" style={{ ...btn, color: 'var(--c-red)' }} onClick={() => void act(r, 'remove')}>Remove</button>
          {(
            <RowMenu
              label={`More actions for ${r.title}`}
              items={[
                r.feedbackOff
                  ? { label: 'Turn feedback on', title: 'Students in this class can comment on it and suggest things again.', onSelect: () => { void feedback({ gameId: r.id, action: 'feedback-on' }, `Feedback is on again for "${r.title}".`); } }
                  : { label: 'Turn feedback off', title: 'Students in this class can no longer comment on it or suggest things. Its maker and you can still read them.', onSelect: () => { void feedback({ gameId: r.id, action: 'feedback-off' }, `Feedback is off for "${r.title}" in this class.`); } },
                ...(r.suggestions ? [{ label: 'Clear suggestions…', danger: true, title: "Removes what this class's students suggested on it.", onSelect: () => { void clearSuggestions(r); } }] : []),
                ...(r.canDelete ? [{ label: 'Delete…', danger: true, title: `Deletes it from ${r.owner}'s own Library too, on every computer.`, onSelect: () => { void remove(r); } }] : []),
              ]}
            />
          )}
        </div>
      ))}
    </div>
  );
}
