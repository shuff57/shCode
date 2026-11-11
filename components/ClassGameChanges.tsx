'use client';

// The class page's "Proposed changes to games" (Students tab): every proposed change on a game shared
// into this class, and the newest comments across their conversations, from
// GET /api/classes/[id]/game-changes. The conversations are free text between students (owner decision
// 2026-11-10), so the class's teachers read them here. Open takes the teacher to the conversation, where
// they can delete any comment, close the conversation or remove the proposal (POST /api/game-changes/[cid]
// gives a teacher of the class those powers).

import { useCallback, useEffect, useState } from 'react';
import { changeHref, getClassChanges, when, type ClassChangesView } from '../lib/game-flow-client';
import { StatusPill } from './game-flow-ui';

export default function ClassGameChanges({ classId }: { classId: string }) {
  const [data, setData] = useState<ClassChangesView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'changes' | 'comments'>('changes');

  const load = useCallback(async () => {
    const r = await getClassChanges(classId);
    if (r.ok) { setData(r.value); setError(null); } else setError(r.error);
  }, [classId]);
  useEffect(() => { void load(); }, [load]);

  if (error) return <p style={{ color: 'var(--c-red)', fontSize: 13 }}>{error}</p>;
  if (!data) return <p style={{ color: 'var(--c-dim)', fontSize: 13 }}>Loading…</p>;
  if (!data.changes.length) {
    return (
      <p style={{ color: 'var(--c-dim)', fontSize: 13, margin: 0, lineHeight: 1.5 }}>
        None yet. When a student remixes a classmate&apos;s game and proposes the change back, it shows here with its conversation.
        Students are told teachers can read every conversation.
      </p>
    );
  }
  const tabBtn = (v: 'changes' | 'comments', label: string) => (
    <button type="button" aria-pressed={view === v} onClick={() => setView(v)}
      style={{
        fontSize: 12, padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
        background: view === v ? 'var(--c-deep2)' : 'transparent', color: view === v ? 'var(--c-fg)' : 'var(--c-dim)',
        border: '1px solid var(--c-line)',
      }}>{label}</button>
  );
  return (
    <div>
      <p style={{ color: 'var(--c-dim)', fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 }}>
        Students propose changes to each other&apos;s games and talk them over. View a conversation to delete a comment, close it to new comments, or remove the proposal.
      </p>
      <div style={{ display: 'flex', gap: 6, margin: '0 0 8px' }}>
        {tabBtn('changes', `Proposals (${data.changes.length})`)}
        {tabBtn('comments', `Newest comments (${data.recentComments.length})`)}
      </div>
      {view === 'changes' && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.changes.map((c) => (
            <li key={c.id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, padding: '6px 8px', border: '1px solid var(--c-line)', borderRadius: 6 }}>
              <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                <strong style={{ overflowWrap: 'anywhere' }}>{c.title}</strong>
                <div style={{ fontSize: 12, color: 'var(--c-dim)' }}>
                  {c.from} → {c.gameTitle} · {c.comments} {c.comments === 1 ? 'comment' : 'comments'} · {when(c.updatedAt)}
                </div>
              </div>
              <StatusPill status={c.status} locked={c.locked} />
              <a href={changeHref(c.id)} style={{ color: 'var(--c-cyan)', fontSize: 13 }}>View</a>
            </li>
          ))}
        </ul>
      )}
      {view === 'comments' && (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {data.recentComments.map((k) => (
            <li key={k.id} style={{ fontSize: 13, padding: '6px 8px', border: '1px solid var(--c-line)', borderRadius: 6 }}>
              <div style={{ fontSize: 12, color: 'var(--c-dim)', marginBottom: 2 }}>
                <strong style={{ color: 'var(--c-fg)' }}>{k.author}</strong> on &ldquo;{k.changeTitle}&rdquo; ({k.gameTitle}) · {when(k.createdAt)}
                {' · '}<a href={changeHref(k.changeId)} style={{ color: 'var(--c-cyan)' }}>View</a>
              </div>
              {k.deleted
                ? <em style={{ color: 'var(--c-dim)' }}>{k.deleted === 'teacher' ? 'Removed by a teacher.' : 'Deleted by its writer.'}</em>
                : <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{k.body}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
