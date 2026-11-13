'use client';

// Comments on a class game, under the game on /play (migration 0051, owner's
// decision 2026-11-12). Anyone who can open the game writes in their own words
// and replies to a comment (one level: replies stay under their top comment).
// The game's maker holds a switch, "Let classmates give feedback", which closes
// comments and suggestions together; a teacher can close them for one game or
// the whole class from the class page. Closed, a classmate sees only a short
// note; the maker and the class's teachers still read everything.
//
// A comment's writer, a teacher of the class and an admin can delete it. The
// panel says plainly that teachers read every comment, as the proposed-change
// conversations do. Routes: GET|POST|DELETE /api/games/[id]/comments,
// POST /api/games/[id]/feedback.

import { useCallback, useEffect, useState } from 'react';
import { FeedbackProvider, useFeedback } from './FeedbackProvider';
import { hashTargetStyle, useHashTarget } from './useHashTarget';
import { markGameCommentsSeen } from '../lib/game-notices';
import { deleteGameComment, getGameComments, postGameComment, setGameFeedback } from '../lib/games-client';
import { COMMENT_MAX, closedText, type GameComment, type GameCommentsView } from '../lib/game-comments-core';

interface Props {
  gameId: string;
  /** The maker, as first name + last initial. */
  owner: string;
}

const box: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: 6, fontSize: 14, lineHeight: 1.45,
  border: '1px solid var(--c-line)', background: 'var(--c-deep)', color: 'var(--c-fg)', resize: 'vertical', fontFamily: 'inherit',
};
const smallBtn: React.CSSProperties = {
  background: 'none', border: 0, padding: 0, fontSize: 12, cursor: 'pointer', color: 'var(--c-cyan)',
};

function when(ms: number): string {
  const d = new Date(ms);
  const sameDay = new Date().toDateString() === d.toDateString();
  return sameDay
    ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function GameComments(props: Props) {
  return <FeedbackProvider><GameCommentsInner {...props} /></FeedbackProvider>;
}

function GameCommentsInner({ gameId, owner }: Props) {
  const { confirm } = useFeedback();
  const [view, setView] = useState<GameCommentsView | null>(null);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await getGameComments(gameId);
    if (r.ok) {
      setView(r.value);
      // Shown: the bell (#112) stops counting this game's comments up to now.
      if (r.value.canWrite || r.value.isMaker || r.value.canModerate) markGameCommentsSeen(gameId);
    }
  }, [gameId]);
  useEffect(() => { void load(); }, [load]);
  // A notification opened this page at one comment (#112).
  const target = useHashTarget(!!view);

  if (!view) return null;
  const note = view.closed ? closedText(view.closed, view.isMaker) : '';
  // Closed to a classmate: a short note and nothing else.
  if (!view.canWrite && !view.isMaker && !view.canModerate) {
    return note ? <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '12px 0 0' }}>{note}</p> : null;
  }

  async function send(body: string, parentId?: string) {
    setBusy(true);
    setError(null);
    const r = await postGameComment(gameId, body, parentId);
    setBusy(false);
    if (!r.ok) { setError(r.error); return false; }
    setView(r.value);
    return true;
  }

  async function remove(c: GameComment) {
    const theirs = !c.mine;
    if (!(await confirm({
      title: 'Delete this comment?',
      message: theirs
        ? `It disappears for everyone. ${c.author} is not told why. Replies to it stay.`
        : 'It disappears for everyone. Replies to it stay.',
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    const r = await deleteGameComment(gameId, c.id);
    if (!r.ok) { setError(r.error); return; }
    setView(r.value);
  }

  async function toggle(on: boolean) {
    setBusy(true);
    setError(null);
    const r = await setGameFeedback(gameId, on);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    await load();
  }

  const tops = view.comments.filter((c) => !c.parentId).sort((a, b) => b.createdAt - a.createdAt);
  const repliesTo = (id: string) => view.comments.filter((c) => c.parentId === id).sort((a, b) => a.createdAt - b.createdAt);
  const count = view.comments.filter((c) => !c.deleted).length;

  const one = (c: GameComment, isReply: boolean) => (
    <div key={c.id} id={`comment-${c.id}`} style={{ marginLeft: isReply ? 22 : 0, padding: '6px 0', borderTop: isReply ? 'none' : '1px solid var(--c-line)', ...(target === `comment-${c.id}` ? hashTargetStyle : {}) }}>
      <div style={{ fontSize: 12, color: 'var(--c-dim)', display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' }}>
        <strong style={{ color: 'var(--c-fg)', fontSize: 13 }}>{c.mine ? `${c.author} (you)` : c.author}</strong>
        {c.byMaker && <span style={{ fontSize: 11, padding: '0 6px', borderRadius: 8, border: '1px solid var(--c-purple)', color: 'var(--c-purple)' }}>maker</span>}
        <span>{when(c.createdAt)}</span>
      </div>
      {c.deleted
        ? <div style={{ fontSize: 13, color: 'var(--c-dim)', fontStyle: 'italic' }}>This comment was deleted.</div>
        : <div style={{ fontSize: 14, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '2px 0' }}>{c.body}</div>}
      {!c.deleted && (
        <div style={{ display: 'flex', gap: 12 }}>
          {view.canWrite && (
            <button type="button" style={smallBtn} onClick={() => { setReplyTo(c.parentId ?? c.id); setReply(''); }}
              aria-label={`Reply to ${c.author}`}>
              Reply
            </button>
          )}
          {(c.mine || view.canModerate) && (
            <button type="button" style={{ ...smallBtn, color: 'var(--c-red)' }} onClick={() => void remove(c)} aria-label={`Delete ${c.author}'s comment`}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <section aria-labelledby="game-comments-h" style={{ marginTop: 12, padding: '10px 12px', border: '1px solid var(--c-line)', borderRadius: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <h2 id="game-comments-h" style={{ fontSize: 15, margin: 0 }}>Comments ({count})</h2>
        {view.isMaker && (
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <input type="checkbox" checked={view.feedbackOn} disabled={busy} onChange={(e) => void toggle(e.target.checked)} />
            Let classmates give feedback
          </label>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--c-dim)', margin: '4px 0 8px' }}>
        {view.isMaker ? 'What classmates say about your game. Reply to say thanks or ask for more.' : `Tell ${owner} what you think, or answer someone else.`}
        {' '}Your teacher can read every comment.
      </p>
      {note && <p role="note" style={{ fontSize: 13, color: 'var(--c-orange)', margin: '0 0 8px' }}>{note}</p>}

      {view.canWrite && (
        <form onSubmit={async (e) => { e.preventDefault(); if (text.trim() && await send(text)) setText(''); }} style={{ marginBottom: 8 }}>
          <label htmlFor="game-comment-new" style={{ position: 'absolute', left: -9999 }}>Write a comment</label>
          <textarea id="game-comment-new" value={text} onChange={(e) => setText(e.target.value)} rows={2} maxLength={COMMENT_MAX}
            placeholder={view.isMaker ? 'Write a note for players…' : `What did you like? What could be better?`} style={box} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <button type="submit" className="btn-run" disabled={busy || !text.trim()}>Post</button>
            <span style={{ fontSize: 11, color: 'var(--c-dim)' }}>{[...text].length} / {COMMENT_MAX}</span>
          </div>
        </form>
      )}
      {error && <div role="alert" style={{ fontSize: 13, color: 'var(--c-red)', margin: '0 0 6px' }}>{error}</div>}

      {tops.length === 0 && (
        <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0 }}>
          {view.isMaker ? 'No comments yet.' : 'No comments yet. Be the first.'}
        </p>
      )}
      {tops.map((c) => (
        <div key={c.id}>
          {one(c, false)}
          {repliesTo(c.id).map((r) => one(r, true))}
          {replyTo === c.id && view.canWrite && (
            <form style={{ marginLeft: 22, marginBottom: 6 }} onSubmit={async (e) => {
              e.preventDefault();
              if (reply.trim() && await send(reply, c.id)) { setReplyTo(null); setReply(''); }
            }}>
              <label htmlFor={`reply-${c.id}`} style={{ position: 'absolute', left: -9999 }}>Write a reply to {c.author}</label>
              <textarea id={`reply-${c.id}`} value={reply} onChange={(e) => setReply(e.target.value)} rows={2} maxLength={COMMENT_MAX}
                autoFocus placeholder={`Reply to ${c.author}…`} style={box} />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button type="submit" className="btn-run" disabled={busy || !reply.trim()}>Reply</button>
                <button type="button" className="btn-secondary btn-sm" onClick={() => setReplyTo(null)}>Cancel</button>
              </div>
            </form>
          )}
        </div>
      ))}
    </section>
  );
}
