'use client';

// /messages: the same conversations as the envelope's dropdown, as a full page, Discord-style: the list on
// the left (each class's channels, groups, direct messages, and Issues), the open conversation on the right.
// ?c=<id> opens one conversation (a link can point at it). On a narrow screen the two take turns.
// The pieces are components/Mailbox.tsx's; the rules are lib/messages-core.ts.

import { useEffect, useState } from 'react';
import { Bug } from 'lucide-react';
import { ConversationList, NewButtons, NewThing, ThreadPane, useThreads, type MailView } from './Mailbox';
import { isThreadId } from '../lib/messages-core';
import { getCurrentUser, type CurrentUser } from '../lib/auth';

function useNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const q = window.matchMedia('(max-width: 760px)');
    const on = () => setNarrow(q.matches);
    on();
    q.addEventListener('change', on);
    return () => q.removeEventListener('change', on);
  }, []);
  return narrow;
}

export default function MessagesPage() {
  const [view, setView] = useState<MailView>({ kind: 'list' });
  const [user, setUser] = useState<CurrentUser | null>(null);
  const { threads, error, reload } = useThreads(true);
  const narrow = useNarrow();

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('c');
    if (isThreadId(c)) setView({ kind: 'thread', id: c });
    void getCurrentUser().then(setUser).catch(() => {});
  }, []);

  // Keep ?c= in step with what is open, so a reload or a copied link opens the same conversation.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (view.kind === 'thread') url.searchParams.set('c', view.id); else url.searchParams.delete('c');
    window.history.replaceState(window.history.state, '', url.pathname + url.search);
  }, [view]);

  const open = (id: string) => setView({ kind: 'thread', id });
  const toList = () => { setView({ kind: 'list' }); reload(); };
  const issuesHref = user && user.role !== 'student' ? '/teacher/issues' : '/issues';
  const showList = !narrow || view.kind === 'list';
  const showPane = !narrow || view.kind !== 'list';

  return (
    <main style={{ padding: '12px 16px 16px', maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, margin: '0 0 10px' }}>Messages</h1>
      <div data-testid="messages-page"
        style={{
          display: 'grid', gridTemplateColumns: narrow ? '1fr' : 'minmax(240px, 300px) 1fr', gap: 0,
          height: 'calc(100vh - 170px)', minHeight: 420, border: '1px solid var(--c-line)', borderRadius: 8, overflow: 'hidden', background: 'var(--c-bg)',
        }}>
        {showList && (
          <aside style={{ display: 'flex', flexDirection: 'column', minHeight: 0, borderRight: narrow ? 'none' : '1px solid var(--c-line)', background: 'var(--c-deep)' }}>
            <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--c-line)' }}><NewButtons onPick={setView} /></div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <ConversationList threads={threads} error={error} selected={view.kind === 'thread' ? view.id : null} onOpen={open} />
            </div>
            <a href={issuesHref} data-testid="messages-issues"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderTop: '1px solid var(--c-line)', fontSize: 13, color: 'var(--c-cyan)', textDecoration: 'none' }}>
              <Bug size={14} aria-hidden="true" /> Issues: problems people reported
            </a>
          </aside>
        )}
        {showPane && (
          <section style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }} aria-label="Conversation">
            {view.kind === 'thread'
              ? <ThreadPane key={view.id} id={view.id} onBack={narrow ? toList : undefined} onGone={toList} onChanged={reload} />
              : view.kind !== 'list'
                ? <NewThing view={view} onBack={toList} onOpen={(id) => { reload(); open(id); }} />
                : <p style={{ margin: 'auto', fontSize: 14, color: 'var(--c-dim)', textAlign: 'center', padding: 24 }}>
                    Pick a channel, group or conversation on the left, or start a new one.
                  </p>}
          </section>
        )}
      </div>
    </main>
  );
}
