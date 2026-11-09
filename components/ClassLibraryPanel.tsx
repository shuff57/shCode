'use client';

// The Library page (/library) and the Library tab in the sandbox and lessons:
// three tabs, Games | Pictures | Sounds. Pictures and Sounds each have Mine
// (with Share with class and Edit), Shared with my class (Copy to mine, Remix)
// and Built in (Copy code, Remix); Games has My games, Class games and Built in
// (GamesLibrary: Play, Remix, Share, Delete).
//
// Only the open tab mounts, so opening the page does not fetch every list.
// The tab is remembered in localStorage (shCode:library-tab) and, on /library
// itself, in the address as ?tab=games|pictures|sounds so a link can open one.
// Picked on mount from the address, then "came here from /play" (Games), then
// the remembered tab, then Pictures.

import { useEffect, useId, useState } from 'react';
import ClassLibrary from './ClassLibrary';
import MyLibrary from './MyLibrary';
import BuiltInLibrary from './BuiltInLibrary';
import GamesLibrary from './GamesLibrary';

type Tab = 'games' | 'pictures' | 'sounds';
const TABS: { id: Tab; label: string }[] = [
  { id: 'games', label: 'Games' },
  { id: 'pictures', label: 'Pictures' },
  { id: 'sounds', label: 'Sounds' },
];
const STORE_KEY = 'shCode:library-tab';

function isTab(v: unknown): v is Tab {
  return v === 'games' || v === 'pictures' || v === 'sounds';
}

function onLibraryPage(): boolean {
  return typeof window !== 'undefined' && window.location.pathname.startsWith('/library');
}

function firstTab(): Tab {
  if (onLibraryPage()) {
    const q = new URLSearchParams(window.location.search).get('tab');
    if (isTab(q)) return q;
    try {
      const ref = document.referrer ? new URL(document.referrer) : null;
      if (ref && ref.origin === window.location.origin && ref.pathname.startsWith('/play')) return 'games';
    } catch { /* a bad referrer is no referrer */ }
  }
  try {
    const saved = window.localStorage.getItem(STORE_KEY);
    if (isTab(saved)) return saved;
  } catch { /* storage blocked: fall through */ }
  return 'pictures';
}

export default function ClassLibraryPanel() {
  const [tab, setTab] = useState<Tab | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const uid = useId();
  const tabId = (t: Tab) => `${uid}-tab-${t}`;
  const panelId = (t: Tab) => `${uid}-panel-${t}`;
  const say = (text: string, bad: boolean) => setMessage({ text, bad });

  useEffect(() => { setTab(firstTab()); }, []);

  const pick = (t: Tab) => {
    setTab(t);
    setMessage(null);
    try { window.localStorage.setItem(STORE_KEY, t); } catch { /* not remembered, still works */ }
    if (onLibraryPage()) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', t);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  };

  return (
    <div style={{ padding: '4px 2px', color: 'var(--c-fg)' }}>
      <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Library</h2>
      <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 8px', lineHeight: 1.5 }}>
        Your games, pictures and sounds, the ones your class shared, and the ones built in.
      </p>

      <div
        role="tablist"
        aria-label="Library sections"
        style={{ display: 'flex', gap: 8, flexWrap: 'nowrap', overflowX: 'auto', padding: '4px 0 8px', marginBottom: 8, borderBottom: '1px solid var(--c-line)' }}
      >
        {TABS.map((t, i) => {
          const on = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={tabId(t.id)}
              aria-selected={on}
              aria-controls={panelId(t.id)}
              tabIndex={on || (tab === null && i === 0) ? 0 : -1}
              onClick={() => pick(t.id)}
              onKeyDown={(e) => {
                // Arrow keys move between tabs (the tablist pattern); Home and End jump to the ends.
                const to = e.key === 'ArrowRight' ? (i + 1) % TABS.length
                  : e.key === 'ArrowLeft' ? (i + TABS.length - 1) % TABS.length
                  : e.key === 'Home' ? 0 : e.key === 'End' ? TABS.length - 1 : -1;
                if (to < 0) return;
                e.preventDefault();
                pick(TABS[to].id);
                document.getElementById(tabId(TABS[to].id))?.focus();
              }}
              style={{
                background: on ? 'var(--c-purple)' : 'transparent',
                color: on ? 'var(--c-bg)' : 'var(--c-meta)',
                fontWeight: on ? 700 : 500,
                border: `1px solid ${on ? 'var(--c-purple)' : 'var(--c-line)'}`,
                borderRadius: 6, flexShrink: 0, whiteSpace: 'nowrap', fontSize: 14, padding: '4px 16px',
                cursor: 'pointer', minHeight: 32,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {message && (
        <div role="status" style={{ fontSize: 12, margin: '0 0 8px', color: message.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
          {message.text}
        </div>
      )}

      {tab && (
        <div role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
          {tab === 'games' && <GamesLibrary />}
          {(tab === 'pictures' || tab === 'sounds') && (() => {
            const kind = tab === 'pictures' ? 'texture' : 'sound';
            const what = tab === 'pictures' ? 'picture' : 'sound';
            return (
              <>
                <MyLibrary key={kind} kind={kind} onMessage={say} />
                <ClassLibrary
                  key={'class-' + kind}
                  kind={kind}
                  title="Shared with my class"
                  onMessage={say}
                  section={{
                    signedOut: <>Sign in to see what your class has shared.</>,
                    empty: (
                      <>Nothing shared yet. Press <strong style={{ color: 'var(--c-fg)' }}>Share with class</strong> on
                        a {what} of yours above and it shows up here for everyone in your class.</>
                    ),
                  }}
                />
                <BuiltInLibrary key={'builtin-' + kind} kind={kind} onMessage={say} />
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
