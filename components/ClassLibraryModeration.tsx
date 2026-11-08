'use client';

// The class page's list of every texture and sound students shared into this
// class, with Hide / Show again / Remove (functions/api/classes/[id]/library-shares).
// Hiding takes an item out of students' view at once; removing takes it out of
// the class library. Neither touches the student's own copy.

import { useCallback, useEffect, useState } from 'react';
import { errorText } from '../lib/http-error';
import { useFeedback } from './FeedbackProvider';

interface Row {
  id: string;
  kind: 'texture' | 'sound';
  name: string;
  owner: string;
  ownerEmail: string;
  sharedAt: number;
  hidden: boolean;
}

export default function ClassLibraryModeration({ classId }: { classId: string }) {
  const { toast, confirm } = useFeedback();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [art, setArt] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/library-shares`, { credentials: 'same-origin' });
    if (!res.ok) { setError(await errorText(res)); return; }
    setError(null);
    setRows(((await res.json()) as { items: Row[] }).items);
  }, [classId]);
  useEffect(() => { void load(); }, [load]);

  const preview = useCallback(async (id: string) => {
    if (art[id]) return art[id];
    const res = await fetch(`/api/library/shared/${id}`, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const { dataUri } = (await res.json()) as { dataUri: string };
    setArt((a) => ({ ...a, [id]: dataUri }));
    return dataUri;
  }, [art]);
  useEffect(() => {
    for (const r of rows ?? []) if (r.kind === 'texture' && !art[r.id]) void preview(r.id);
  }, [rows, art, preview]);

  const act = async (r: Row, action: 'hide' | 'unhide' | 'remove') => {
    if (action === 'remove' && !(await confirm({
      title: `Remove "${r.name}" from the class's Library?`,
      message: `Classmates will no longer see or copy it. ${r.owner}'s own copy stays in their account, and copies classmates already made stay theirs.`,
      confirmLabel: 'Remove',
      danger: true,
    }))) return;
    const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/library-shares`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: r.id, action }),
    });
    if (!res.ok) { toast(await errorText(res), { kind: 'error' }); return; }
    toast(action === 'hide' ? `Hid "${r.name}" from students.` : action === 'unhide' ? `"${r.name}" is visible to students again.` : `Removed "${r.name}" from the class's Library.`);
    await load();
  };

  if (error) return <p style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</p>;
  if (!rows) return <p style={{ color: 'var(--c-dim)', fontSize: 13 }}>Loading…</p>;
  if (!rows.length) {
    return <p style={{ color: 'var(--c-dim)', fontSize: 13, margin: 0 }}>Nothing shared yet. When a student presses &ldquo;Share with class&rdquo; on a texture or sound, it shows up here and in every classmate&rsquo;s library at once.</p>;
  }
  const btn = { fontSize: 12, padding: '3px 8px', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: 'var(--c-cyan)', border: '1px solid var(--c-line)' } as const;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', opacity: r.hidden ? 0.7 : 1 }}>
          <div style={{ width: 36, height: 36, background: 'var(--x-202020)', borderRadius: 4, overflow: 'hidden', flex: 'none', display: 'grid', placeItems: 'center' }}>
            {r.kind === 'texture'
              ? art[r.id] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={art[r.id]} alt="" style={{ height: 36, imageRendering: 'pixelated', objectFit: 'cover', objectPosition: 'left', maxWidth: 'none' }} />
              )
              : (
                <button type="button" aria-label={`Play ${r.name}`} style={{ ...btn, border: 'none' }}
                  onClick={async () => { const d = await preview(r.id); if (d) new Audio(d).play().catch(() => {}); }}>▶</button>
              )}
          </div>
          <div style={{ fontSize: 13, minWidth: 160 }}>
            <code>{r.name}</code> <span style={{ color: 'var(--c-dim)' }}>({r.kind}) by {r.owner}</span>
            {r.hidden && <span style={{ color: 'var(--c-orange)' }}> · hidden from students</span>}
          </div>
          <span style={{ flex: 1 }} />
          {r.hidden
            ? <button type="button" style={btn} onClick={() => void act(r, 'unhide')}>Show again</button>
            : <button type="button" style={btn} onClick={() => void act(r, 'hide')}>Hide</button>}
          <button type="button" style={{ ...btn, color: 'var(--c-red)' }} onClick={() => void act(r, 'remove')}>Remove</button>
        </div>
      ))}
    </div>
  );
}
