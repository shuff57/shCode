'use client';

// The card a sandbox program makes in a message (migration 0054): in the mailbox (components/Mailbox.tsx)
// and the teacher's class panel (components/ClassMessages.tsx). A copy opens on /shared (run it, Remix
// it); an invitation to Code together opens the sandbox with the session's code ready to join, or says
// the session has ended. The link is an ordinary link, so it opens in this tab or a new one.

import { Code2, Eye, Users } from 'lucide-react';
import { LANG_LABEL, type ShareCard } from '../lib/messages-core';
import { shareHref } from '../lib/messages-client';

/** `onlooker`: a teacher reading a conversation between two students (the invitation was not to them). */
export default function ShareCardView({ card, mine, author, onlooker = false }: { card: ShareCard; mine: boolean; author: string; onlooker?: boolean }) {
  const together = card.kind === 'together';
  const watch = card.kind === 'watch';
  const live = together || watch;
  const ended = live && !card.open;
  const who = mine ? 'your' : `${author}'s`;
  const title = card.title || 'A program';
  const line = together
    ? (mine ? 'You invited them to Code together' : onlooker ? `${author} sent an invitation to Code together` : `${author} invited you to Code together`)
    : watch
      ? (mine ? 'You invited them to watch you code live' : onlooker ? `${author} sent an invitation to watch live` : `${author} invited you to watch them code live`)
      : `A copy of ${who} ${LANG_LABEL[card.lang]} program`;
  return (
    <div data-testid="share-card" data-kind={card.kind}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, marginTop: 4,
        background: 'var(--c-deep)', border: '1px solid var(--c-line)', minWidth: 0,
      }}>
      <span aria-hidden="true" style={{ color: live ? 'var(--c-purple)' : 'var(--c-cyan)', display: 'inline-flex', flex: 'none' }}>
        {together ? <Users size={18} /> : watch ? <Eye size={18} /> : <Code2 size={18} />}
      </span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--c-fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <span style={{ display: 'block', fontSize: 11, color: 'var(--c-meta)' }}>
          {ended ? 'This Code together session has ended.' : line}
        </span>
      </span>
      {/* Your own invitation has no button: you are in that session already. */}
      {!ended && !(live && mine) && (
        <a href={shareHref(card)} data-testid="share-open"
          style={{
            flex: 'none', fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 4, textDecoration: 'none',
            background: 'var(--brand)', color: 'var(--on-brand)',
          }}>
          {together ? 'Join' : watch ? 'Watch' : 'Open'}
        </a>
      )}
    </div>
  );
}
