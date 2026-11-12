'use client';

// One proposed change (/changes?id=<cid>): GitHub's pull request page for beginners. Three parts:
//   Conversation  every comment and event in order, and a box to join in (free text, plain text only;
//                 owner decision 2026-11-10: long back-and-forth, any classmate who can see the game).
//                 It stays open after Accept or No thanks, as on GitHub, until someone closes it.
//   Changes       what the proposer changed (from the version they started at) and, when the game has
//                 moved on since, the game as it would be after accepting
//   Try it        /play with &change=<cid>, the code Accept would save
// The buttons are exactly what the server allows (`can` from GET /api/game-changes/[cid]): the maker
// accepts or says no thanks, the proposer updates or takes it back, the maker or a teacher closes the
// conversation, a teacher removes a comment or the whole proposal.

import { useCallback, useEffect, useState } from 'react';
import DiffViewer from './DiffViewer';
import { hashTargetStyle, useHashTarget } from './useHashTarget';
import {
  actOnChange, changeHref, eventText, gameChangesHref, getChange, markSeen, tryChangeHref, when,
  type ChangeDetail, type ConversationItem,
} from '../lib/game-flow-client';
import { playHref } from '../lib/games-client';
import { COMMENT_MAX, GITHUB_WORD, isChangeEvent } from '../lib/game-flow-core';
import { GitHubWord, SizeBadge, StatusPill, diffHeight, flowBtn, flowCard, flowDanger, flowInput, flowLink, flowPrimary } from './game-flow-ui';

type Tab = 'conversation' | 'changes';

const BADGE_TEXT = { maker: 'made the game', proposer: 'proposed this', teacher: 'teacher' } as const;

function Badge({ b }: { b: ConversationItem['badge'] }) {
  if (!b) return null;
  const c = b === 'teacher' ? 'var(--c-orange)' : b === 'maker' ? 'var(--c-purple)' : 'var(--c-cyan)';
  return (
    <span style={{ fontSize: 11, color: c, border: `1px solid color-mix(in srgb, ${c} 55%, transparent)`, borderRadius: 999, padding: '0 6px', whiteSpace: 'nowrap' }}>
      {BADGE_TEXT[b]}
    </span>
  );
}

function DiffBox({ original, modified, label }: { original: string; modified: string; label: string }) {
  return (
    <div role="region" aria-label={label} style={{ height: `min(${diffHeight(original, modified)}px, 70vh)`, border: '1px solid var(--c-line)', borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
      <DiffViewer original={original} modified={modified} />
    </div>
  );
}

export default function ChangeThread({ id }: { id: string }) {
  const [d, setD] = useState<ChangeDetail | null>(null);
  const [err, setErr] = useState<{ text: string; status: number } | null>(null);
  const [tab, setTab] = useState<Tab>('conversation');
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState('');
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; bad: boolean } | null>(null);

  const load = useCallback(async () => {
    const r = await getChange(id);
    if (r.ok) {
      setD(r.value);
      setErr(null);
      markSeen(id, Math.max(Date.now(), r.value.change.updatedAt));
      document.title = `${r.value.change.title} — shCode`;
    } else setErr({ text: r.error, status: r.status });
  }, [id]);
  // A notification opened this page at one comment (#112).
  const target = useHashTarget(!!d);

  // Load, then look again every 30 s while the tab is in view (a conversation is not live chat).
  useEffect(() => {
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 30_000);
    const onVis = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { window.clearInterval(t); document.removeEventListener('visibilitychange', onVis); };
  }, [load]);

  async function run(a: Parameters<typeof actOnChange>[1], done: string, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return false;
    setBusy(true);
    setNote(null);
    const r = await actOnChange(id, a);
    setBusy(false);
    if (!r.ok) { setNote({ text: r.error, bad: true }); await load(); return false; }
    setNote({ text: done, bad: false });
    await load();
    return true;
  }

  if (err) {
    return (
      <p style={{ fontSize: 14, color: err.status === 404 ? 'var(--c-dim)' : 'var(--c-red)' }}>
        {err.status === 404 ? 'This proposed change is not here. It may have been removed, or the game is not shared with your class.'
          : err.status === 401 ? 'Sign in to see proposed changes.' : err.text}
      </p>
    );
  }
  if (!d) return <p style={{ fontSize: 14, color: 'var(--c-dim)' }}>Loading…</p>;

  const { change: c, game: g, can, role, after } = d;
  const gameTitle = g?.title ?? 'a deleted game';
  const maker = g?.maker ?? 'its maker';
  const moved = !!g?.code && g.code !== c.baseCode;
  const left = COMMENT_MAX - [...draft].length;

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
        {g && <a href={gameChangesHref(g.id)} style={flowLink}>← All proposed changes to {gameTitle}</a>}
        <a href="/library/?tab=games" style={flowLink}>Library</a>
      </div>

      <h1 style={{ fontSize: 22, margin: '8px 0 4px', overflowWrap: 'anywhere' }}>{c.title}</h1>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, color: 'var(--c-dim)' }}>
        <StatusPill status={c.status} locked={c.locked} />
        <span>
          <strong style={{ color: 'var(--c-fg)' }}>{c.from}</strong> wants to change{' '}
          {g ? <a href={playHref(g.id)} style={flowLink}>{gameTitle}</a> : gameTitle} by {maker},
          starting from version {c.baseVersion}.
        </span>
        <SizeBadge size={c.size} />
      </div>
      <GitHubWord>{GITHUB_WORD.propose}</GitHubWord>

      <div role="tablist" aria-label="Proposed change" style={{ display: 'flex', gap: 4, margin: '14px 0 10px', borderBottom: '1px solid var(--c-line)' }}>
        {(['conversation', 'changes'] as Tab[]).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            style={{
              padding: '6px 12px', fontSize: 13, cursor: 'pointer', background: 'transparent', border: 'none',
              color: tab === t ? 'var(--c-fg)' : 'var(--c-dim)', fontWeight: tab === t ? 600 : 400,
              borderBottom: tab === t ? '2px solid var(--c-purple)' : '2px solid transparent', marginBottom: -1,
            }}>
            {t === 'conversation' ? `Conversation (${d.conversation.filter((x) => x.kind === 'comment' && !x.deleted).length})` : 'See the changes'}
          </button>
        ))}
        {g && (
          <a href={tryChangeHref(g.id, c.id)} style={{ ...flowLink, padding: '6px 12px', marginLeft: 'auto' }}>▶ Try it</a>
        )}
      </div>

      {note && (
        <div role="status" aria-live="polite" style={{ fontSize: 13, margin: '0 0 10px', color: note.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
          {note.text}
        </div>
      )}

      {/* What the caller can do, above the tab content so it is never below the fold. */}
      {(can.accept || can.decline || can.withdraw || can.reopen || can.update || can.lock || can.unlock || can.remove) && (
        <div style={{ ...flowCard, margin: '0 0 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {can.accept && (
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {after?.ok
                ? <>Look at the changes and <a href={tryChangeHref(g!.id, c.id)} style={flowLink}>try it</a>. If you like it, Accept puts it into {gameTitle} as version {g!.version + 1}, with {c.from}&apos;s name on it. You can always go back from History.</>
                : after && !after.ok ? <span style={{ color: 'var(--c-orange)' }}>{after.text}</span> : null}
              <GitHubWord>{GITHUB_WORD.accept}</GitHubWord>
            </div>
          )}
          {role.proposer && c.status === 'open' && (
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {after && !after.ok
                ? <span style={{ color: 'var(--c-orange)' }}>{after.text}</span>
                : <>Waiting for {maker}. To change your proposal, edit the code in your <a href="/sandbox/" style={flowLink}>sandbox</a> and press <strong>Propose this change</strong> again: it updates this one.</>}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {can.accept && (
              <button type="button" style={{ ...flowPrimary, opacity: busy || !after?.ok ? 0.6 : 1 }} disabled={busy || !after?.ok}
                onClick={() => void run({ action: 'accept', expectVersion: g!.version }, `Accepted. ${gameTitle} is version ${g!.version + 1} now.`,
                  `Accept "${c.title}"?\n\n${gameTitle} becomes version ${g!.version + 1} with ${c.from}'s change. You can go back to version ${g!.version} from History.`)}>
                Accept
              </button>
            )}
            {can.decline && !declining && (
              <button type="button" style={flowBtn} disabled={busy} onClick={() => setDeclining(true)}>No thanks</button>
            )}
            {can.withdraw && (
              <button type="button" style={flowBtn} disabled={busy}
                onClick={() => void run({ action: 'withdraw' }, 'You took it back. You can open it again from here.', `Take back "${c.title}"? ${maker} will not be able to accept it until you open it again.`)}>
                Take it back
              </button>
            )}
            {can.reopen && (
              <button type="button" style={flowBtn} disabled={busy} onClick={() => void run({ action: 'reopen' }, 'Open again.')}>Open it again</button>
            )}
            {can.lock && (
              <button type="button" style={flowBtn} disabled={busy}
                onClick={() => void run({ action: 'lock' }, 'The conversation is closed to new comments.', 'Close the conversation? Nobody can add comments until it is opened again.')}>
                Close the conversation
              </button>
            )}
            {can.unlock && (
              <button type="button" style={flowBtn} disabled={busy} onClick={() => void run({ action: 'unlock' }, 'The conversation is open again.')}>Open the conversation</button>
            )}
            {can.remove && (
              <button type="button" style={flowDanger} disabled={busy}
                onClick={() => void run({ action: 'remove' }, 'Removed. Students no longer see it; its proposer still does.',
                  `Remove "${c.title}"?\n\nIt disappears for every student except ${c.from}, who sees it marked as removed. The conversation is kept, and you can still read it here.`)}>
                Remove (teacher)
              </button>
            )}
          </div>
          {declining && (
            <div>
              <label htmlFor="decline-reply" style={{ fontSize: 13, display: 'block', margin: '0 0 4px' }}>
                Want to say why? (optional) Something kind and useful helps {c.from} next time.
              </label>
              <textarea id="decline-reply" value={reply} onChange={(e) => setReply(e.target.value)} maxLength={COMMENT_MAX} rows={3} style={flowInput}
                placeholder="Thanks! I want to keep it slow on purpose, it's a calm game." />
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <button type="button" style={flowBtn} disabled={busy}
                  onClick={() => void run({ action: 'decline', reply: reply.trim() || undefined }, 'Done. It is marked "Not taken".').then((ok) => { if (ok) { setDeclining(false); setReply(''); } })}>
                  Say no thanks
                </button>
                <button type="button" style={flowBtn} onClick={() => setDeclining(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'changes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <section>
            <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>What {c.from} changed</h2>
            <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 6px' }}>
              Left: version {c.baseVersion} of {gameTitle}, where {c.from} started. Right: {c.from}&apos;s code. Green lines are new, red lines are gone.
            </p>
            <DiffBox original={c.baseCode} modified={c.code} label={`What ${c.from} changed`} />
          </section>
          {c.status === 'open' && g?.code && moved && (
            <section>
              <h2 style={{ fontSize: 15, margin: '0 0 6px' }}>{gameTitle} after accepting</h2>
              {after?.ok ? (
                <>
                  <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 6px' }}>
                    {gameTitle} changed since version {c.baseVersion}. Left: the game now (version {g.version}). Right: the game with {c.from}&apos;s change put in. This is exactly what Accept saves.
                  </p>
                  <DiffBox original={g.code} modified={after.code} label={`${gameTitle} after accepting`} />
                </>
              ) : after ? <p style={{ fontSize: 13, color: 'var(--c-orange)', margin: 0 }}>{after.text}</p> : null}
            </section>
          )}
          <GitHubWord>{GITHUB_WORD.review}</GitHubWord>
        </div>
      )}

      {tab === 'conversation' && (
        <div>
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.conversation.map((x) => x.kind === 'event' ? (
              <li key={x.id} id={`c-${x.id}`} style={{ fontSize: 13, color: 'var(--c-dim)', padding: '2px 12px', display: 'flex', gap: 8, alignItems: 'baseline', ...(target === `c-${x.id}` ? hashTargetStyle : {}) }}>
                <span aria-hidden="true" style={{ color: x.body === 'accepted' ? 'var(--c-purple)' : 'var(--c-line)' }}>●</span>
                <span>{isChangeEvent(x.body) ? eventText(x.body, x.author || 'Someone', x.extra) : ''}</span>
                <span style={{ fontSize: 12 }}>{when(x.createdAt)}</span>
              </li>
            ) : (
              <li key={x.id} id={`c-${x.id}`} style={{ ...flowCard, ...(target === `c-${x.id}` ? hashTargetStyle : {}) }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', fontSize: 13, marginBottom: 4 }}>
                  <strong>{x.author}</strong>
                  <Badge b={x.badge} />
                  <span style={{ color: 'var(--c-dim)', fontSize: 12 }}>{when(x.createdAt)}</span>
                  {x.canDelete && (
                    <button type="button" style={{ ...flowBtn, fontSize: 12, padding: '1px 8px', marginLeft: 'auto', color: 'var(--c-dim)' }} disabled={busy}
                      onClick={() => void run({ action: 'delete-comment', commentId: x.id }, 'Comment deleted.', role.teacher && x.author ? `Delete ${x.author}'s comment? The thread will say a teacher removed it.` : 'Delete your comment?')}>
                      Delete
                    </button>
                  )}
                </div>
                {x.deleted
                  ? <p style={{ margin: 0, fontSize: 13, color: 'var(--c-dim)', fontStyle: 'italic' }}>{x.deleted === 'teacher' ? 'A teacher removed this comment.' : 'Its writer deleted this comment.'}</p>
                  : <p style={{ margin: 0, fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{x.body}</p>}
              </li>
            ))}
          </ol>

          <div style={{ marginTop: 14 }}>
            {can.comment ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                void run({ action: 'comment', body: draft }, 'Comment posted.').then((ok) => { if (ok) setDraft(''); });
              }}>
                <label htmlFor="comment-box" style={{ fontSize: 13, display: 'block', margin: '0 0 4px' }}>
                  Add to the conversation
                </label>
                <textarea id="comment-box" value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={COMMENT_MAX} style={flowInput}
                  placeholder={role.maker ? 'Thanks! I tried it. Could the coins be a bit bigger?' : 'I tried it: the jump feels better now.'} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                  <button type="submit" style={{ ...flowPrimary, opacity: busy || !draft.trim() ? 0.6 : 1 }} disabled={busy || !draft.trim()}>Comment</button>
                  <span style={{ fontSize: 12, color: left < 50 ? 'var(--c-orange)' : 'var(--c-dim)' }}>{left} characters left</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--c-dim)', margin: '6px 0 0' }}>
                  {role.teacher
                    ? 'Every student who can see this game reads this conversation too.'
                    : 'Everyone who can see this game can read this, and so can your teacher. Talk about the game and the code, and be kind.'}
                </p>
              </form>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0 }}>
                {c.locked ? 'The conversation is closed to new comments.' : 'This change was removed or its game was deleted, so the conversation is closed.'}
              </p>
            )}
          </div>
        </div>
      )}
      <p style={{ fontSize: 12, margin: '18px 0 0' }}>
        <a href={changeHref(c.id)} style={{ ...flowLink, fontSize: 12 }}>Link to this conversation</a>
      </p>
    </div>
  );
}
