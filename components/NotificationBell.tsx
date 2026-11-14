'use client';

// The notification bell in the header (#112). Its count is what classmates did that the person has not
// opened yet: a change proposed to their game, a comment or reply in a conversation they are in, a
// decision on their proposal, a comment on their game, a reply to their comment. Clicking the bell opens
// the list; clicking an item opens that conversation or game, scrolled to the comment.
// Items: GET /api/notifications. Words and the unread rule: lib/game-notices-core.ts. Store: lib/game-notices.ts.
//
// It is also the mailbox (migration 0053): a Messages tab (components/Mailbox.tsx) beside the Activity
// tab above. The count on the icon adds both. The message count is asked for every 30 s while the tab
// is visible, and when it comes back into view (lib/messages-client.ts).

import { useEffect, useRef, useState } from 'react';
import { Mail } from 'lucide-react';
import { isUnread, noticeAction, noticeHref, type NoticeItem } from '../lib/game-notices-core';
import {
  CHANGES_CHANGED, CHANGES_SEEN, GAMES_SEEN_KEY, READ_ALL_KEY, SEEN_KEY,
  markAllNoticesRead, markNoticeRead, noticeItems, noticeSeen, noticeUnread, refreshNotices,
} from '../lib/game-notices';
import { ownedLocal } from '../lib/owned-storage';
import Mailbox from './Mailbox';
import { MESSAGES_CHANGED, messageUnread, refreshMessageCount } from '../lib/messages-client';
import { COUNT_POLL_MS } from '../lib/messages-core';

type Tab = 'messages' | 'activity';

function when(ms: number): string {
  const d = Date.now() - ms;
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} min ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} h ago`;
  if (d < 7 * 86_400_000) return `${Math.floor(d / 86_400_000)} d ago`;
  return new Date(ms).toLocaleDateString();
}

export default function NotificationBell({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NoticeItem[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [mail, setMail] = useState(0);
  const [tab, setTab] = useState<Tab>('messages');
  const [, setTick] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const sync = () => { if (live) { setItems(noticeItems()); setUnread(noticeUnread()); setTick((t) => t + 1); } };
    const ask = (maxAge?: number) => { void refreshNotices(maxAge).then(sync); };
    ask();
    const onMail = () => { if (live) setMail(messageUnread()); };
    void refreshMessageCount().then(onMail);
    const poll = window.setInterval(() => { if (document.visibilityState === 'visible') void refreshMessageCount(); }, COUNT_POLL_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') { ask(); void refreshMessageCount(); } };
    const onChanged = () => ask(0);
    // Another tab opened a conversation or a game: what was read is in localStorage, so a recount is enough.
    // storedKeys, not fullKey: a sealed record lives under another name (lib/owned-storage.ts).
    const watched = [SEEN_KEY, GAMES_SEEN_KEY, READ_ALL_KEY].flatMap((k) => ownedLocal.storedKeys(k));
    const onStorage = (e: StorageEvent) => { if (e.key && watched.includes(e.key)) sync(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener(CHANGES_CHANGED, onChanged);
    window.addEventListener(CHANGES_SEEN, sync);
    window.addEventListener('storage', onStorage);
    window.addEventListener(MESSAGES_CHANGED, onMail);
    return () => {
      live = false;
      window.clearInterval(poll);
      window.removeEventListener(MESSAGES_CHANGED, onMail);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener(CHANGES_CHANGED, onChanged);
      window.removeEventListener(CHANGES_SEEN, sync);
      window.removeEventListener('storage', onStorage);
    };
  }, [enabled]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); } };
    const onDown = (e: MouseEvent) => { if (!rootRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown, true);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onDown, true); };
  }, [open]);

  if (!enabled) return null;

  const toggle = () => {
    setOpen((v) => !v);
    if (!open) {
      void refreshNotices(15_000).then(() => { setItems(noticeItems()); setUnread(noticeUnread()); });
      // Open on Activity only when it has news and Messages has none.
      setTab(unread > 0 && mail === 0 ? 'activity' : 'messages');
    }
  };
  const seen = noticeSeen();
  const now = Date.now();
  const total = unread + mail;
  const label = total ? `Messages and notifications, ${total} unread` : 'Messages and notifications';
  const tabStyle = (on: boolean) => ({
    fontSize: 13, padding: '8px 4px', background: 'transparent', border: 'none', cursor: 'pointer',
    borderBottom: on ? '2px solid var(--brand)' : '2px solid transparent', color: on ? 'var(--c-fg)' : 'var(--c-meta)', fontWeight: on ? 600 : 400,
  } as const);
  const badge = (n: number) => (n > 0 ? (
    <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, padding: '0 5px', borderRadius: 8, background: 'var(--brand)', color: 'var(--on-brand)' }}>
      {n > 9 ? '9+' : n}
    </span>
  ) : null);

  return (
    <div ref={rootRef} style={{ position: 'relative', display: 'inline-flex' }}>
      <button ref={buttonRef} type="button" onClick={toggle} aria-label={label} aria-expanded={open} aria-haspopup="true"
        title="Messages and notifications" data-testid="notification-bell"
        style={{
          position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 34, height: 34, borderRadius: 6, cursor: 'pointer', color: 'var(--header-fg)',
          background: open ? 'var(--c-deep2)' : 'transparent', border: '1px solid transparent',
        }}>
        <Mail size={18} aria-hidden="true" />
        {total > 0 && (
          <span aria-hidden="true" data-testid="notification-count"
            style={{
              position: 'absolute', top: 1, right: 0, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8,
              background: 'var(--brand)', color: 'var(--on-brand)', fontSize: 10, fontWeight: 700, lineHeight: '16px', textAlign: 'center',
            }}>
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Messages and notifications" data-testid="notification-panel"
          style={{
            position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 'min(400px, calc(100vw - 32px))',
            height: tab === 'messages' ? 'min(560px, 75vh)' : undefined,
            maxHeight: '75vh', display: 'flex', flexDirection: 'column', background: 'var(--c-bg)',
            border: '1px solid var(--c-line)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)', zIndex: 1000,
          }}>
          <div role="tablist" aria-label="Mailbox" style={{ display: 'flex', gap: 16, padding: '0 12px', borderBottom: '1px solid var(--c-line)' }}>
            <button type="button" role="tab" aria-selected={tab === 'messages'} onClick={() => setTab('messages')} data-testid="mailbox-tab-messages" style={tabStyle(tab === 'messages')}>
              Messages{badge(mail)}
            </button>
            <button type="button" role="tab" aria-selected={tab === 'activity'} onClick={() => setTab('activity')} data-testid="mailbox-tab-activity" style={tabStyle(tab === 'activity')}>
              Activity{badge(unread)}
            </button>
          </div>

          {tab === 'messages' && <Mailbox active={open} />}

          {tab === 'activity' && (<>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid var(--c-line)' }}>
            <h2 style={{ fontSize: 13, margin: 0, flex: 1, color: 'var(--c-meta)', fontWeight: 400 }}>Games library activity</h2>
            <button type="button" disabled={!unread}
              onClick={() => { markAllNoticesRead(); setUnread(0); }}
              style={{
                fontSize: 12, padding: '3px 8px', borderRadius: 4, background: 'transparent',
                border: '1px solid var(--c-line)', color: unread ? 'var(--c-cyan)' : 'var(--c-dim)', cursor: unread ? 'pointer' : 'default',
              }}>
              Mark all as read
            </button>
          </div>

          <div style={{ overflowY: 'auto' }}>
            {items === null && <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0, padding: 12 }}>Loading…</p>}
            {items !== null && items.length === 0 && (
              <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0, padding: 12, lineHeight: 1.5 }}>
                Nothing yet. When a classmate proposes a change to your game, comments on it, or replies to you, it shows up here.
              </p>
            )}
            {items !== null && items.length > 0 && (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {items.map((it) => {
                  const fresh = isUnread(it, seen, now);
                  return (
                    <li key={it.key} style={{ borderBottom: '1px solid var(--c-line)' }}>
                      <a href={noticeHref(it)} onClick={() => markNoticeRead(it)} data-testid="notification-item"
                        style={{
                          display: 'flex', gap: 8, padding: '9px 12px', textDecoration: 'none', color: 'var(--c-fg)',
                          background: fresh ? 'color-mix(in srgb, var(--brand) 9%, transparent)' : 'transparent',
                        }}>
                        <span aria-hidden="true" style={{ width: 8, height: 8, marginTop: 6, borderRadius: '50%', flexShrink: 0, background: fresh ? 'var(--brand)' : 'transparent' }} />
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ fontSize: 13, lineHeight: 1.4, display: 'block', overflowWrap: 'anywhere' }}>
                            {fresh && <span className="sr-only">New: </span>}
                            <strong>{it.who}</strong> {noticeAction(it)}
                          </span>
                          {it.snippet && (
                            <span style={{ fontSize: 12, color: 'var(--c-meta)', display: 'block', marginTop: 2, overflowWrap: 'anywhere' }}>
                              “{it.snippet}”
                            </span>
                          )}
                          <span style={{ fontSize: 11, color: 'var(--c-dim)', display: 'block', marginTop: 2 }}>{when(it.at)}</span>
                        </span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <a href="/library/?tab=games" style={{ fontSize: 12, padding: '8px 12px', color: 'var(--c-cyan)', borderTop: '1px solid var(--c-line)' }}>
            All proposed changes, in Library → Games
          </a>
          </>)}
        </div>
      )}
    </div>
  );
}
