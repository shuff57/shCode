'use client';

// Content type and collection are separate navigation levels. Only the selected
// collection mounts; /library links preserve both selections and support Back.

import { Gamepad2, ImageIcon, Music2, Type, LibraryBig, Users, Globe2, PackageOpen, Star, GitPullRequest } from 'lucide-react';
import { libraryClasses as styles } from './library-ui';
import { useEffect, useId, useState } from 'react';
import { LibraryCategoriesProvider } from './LibraryCategories';
import ClassLibrary from './ClassLibrary';
import MyLibrary from './MyLibrary';
import BuiltInLibrary from './BuiltInLibrary';
import GamesLibrary from './GamesLibrary';
import type { LibraryCollection } from './library-ui';
import { BuiltinFonts, MyFonts } from './FontLibrary';

type Tab = 'games' | 'pictures' | 'sounds' | 'fonts';
const TABS: { id: Tab; label: string; icon: typeof Gamepad2 }[] = [
  { id: 'games', label: 'Games', icon: Gamepad2 },
  { id: 'pictures', label: 'Pictures', icon: ImageIcon },
  { id: 'sounds', label: 'Sounds', icon: Music2 },
  { id: 'fonts', label: 'Fonts', icon: Type },
];
const COLLECTIONS: { id: LibraryCollection; label: string; icon: typeof LibraryBig; description: string }[] = [
  { id: 'mine', label: 'Mine', icon: LibraryBig, description: 'Your creations, organized your way.' }, { id: 'class', label: 'My class', icon: Users, description: 'Discover what your classmates are making.' },
  { id: 'public', label: 'Everyone', icon: Globe2, description: 'Explore creations shared beyond your class.' }, { id: 'builtin', label: 'Built in', icon: PackageOpen, description: 'Ready to use in your next idea.' },
  { id: 'starred', label: 'Starred', icon: Star, description: 'Games you want to come back to.' }, { id: 'changes', label: 'Proposed changes', icon: GitPullRequest, description: 'Keep your collaborations moving.' },
];
const STORE_KEY = 'shCode:library-tab';

function isTab(v: unknown): v is Tab {
  return v === 'games' || v === 'pictures' || v === 'sounds' || v === 'fonts';
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

function firstCollection(): LibraryCollection {
  const value = onLibraryPage() ? new URLSearchParams(window.location.search).get('collection') : null;
  return COLLECTIONS.find((c) => c.id === value)?.id ?? 'mine';
}

export default function ClassLibraryPanel() {
  return <LibraryCategoriesProvider><LibraryPanel /></LibraryCategoriesProvider>;
}

function LibraryPanel() {
  const [collection, setCollection] = useState<LibraryCollection>('mine');
  const [tab, setTab] = useState<Tab | null>(null);
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const uid = useId();
  const tabId = (t: Tab) => `${uid}-tab-${t}`;
  const panelId = (t: Tab) => `${uid}-panel-${t}`;
  const say = (text: string, bad: boolean) => setMessage({ text, bad });

  useEffect(() => {
    const restore = () => {
      const next = firstTab();
      setTab(next);
      const source = firstCollection();
      setCollection(next === 'games' || (source !== 'starred' && source !== 'changes') ? source : 'mine');
      setMessage(null);
    };
    restore();
    // Give the starting view an address too, so Back does not fall back to a
    // newer remembered tab when the original link had no query parameters.
    if (onLibraryPage()) {
      const url = new URL(window.location.href);
      if (!url.searchParams.has('tab')) url.searchParams.set('tab', firstTab());
      if (!url.searchParams.has('collection')) url.searchParams.set('collection', firstCollection());
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  const pick = (t: Tab, source = collection) => {
    if (t !== 'games' && (source === 'starred' || source === 'changes')) source = 'mine';
    setCollection(source);
    setTab(t);
    setMessage(null);
    try { window.localStorage.setItem(STORE_KEY, t); } catch { /* not remembered, still works */ }
    if (onLibraryPage()) {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', t);
      url.searchParams.set('collection', source);
      if (url.href !== window.location.href) window.history.pushState(window.history.state, '', url.pathname + url.search + url.hash);
    }
  };

  return (
    <div className={styles.library} style={{ padding: '4px 2px', color: 'var(--c-fg)' }}>
      <h2 style={{ fontSize: 24, letterSpacing: '-0.03em', margin: '0 0 5px' }}>Library</h2>
      <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 24px', lineHeight: 1.5 }}>
        A home for what you make and what inspires you.
      </p>

      <div className={styles.workspace}>
        {tab && <nav className={styles.rail} aria-label="Library collections">
          <span className={styles.railLabel}>Explore</span>
          {COLLECTIONS.filter((c) => tab === 'games' || (c.id !== 'starred' && c.id !== 'changes')).map((c) => (
            <button key={c.id} type="button" aria-pressed={collection === c.id} onClick={() => pick(tab, c.id)}
              className={styles.destination}>
              <c.icon size={16} aria-hidden="true" />
              {c.label}
            </button>
          ))}
        </nav>}

        <div className={styles.main}>
          <div
            className={styles.typeTabs}
            role="tablist"
            aria-label="Library sections"
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
                  className={styles.typeTab}
                >
                  <t.icon size={15} aria-hidden="true" />{t.label}
                </button>
              );
            })}
          </div>

          {message && (
            <div role="status" style={{ fontSize: 12, margin: '0 0 8px', color: message.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
              {message.text}
            </div>
          )}

          {tab && <p style={{ fontSize: 12, color: 'var(--c-dim)', margin: '0 0 10px' }}>
            {COLLECTIONS.find((c) => c.id === collection)?.description}
          </p>}
          {tab && (
            <div key={`${tab}-${collection}`} role="tabpanel" id={panelId(tab)} aria-labelledby={tabId(tab)}>
              {tab === 'games' && <GamesLibrary key={collection} collection={collection} />}
              {tab === 'fonts' && (
                <>
                  {collection === 'mine' && <MyFonts onMessage={say} />}
                  {collection === 'class' && <ClassLibrary
                    key="class-font"
                    kind="font"
                    title="Shared with my class"
                    onMessage={say}
                    section={{
                      signedOut: <>Sign in to see what your class has shared.</>,
                      empty: (
                        <>Nothing shared yet. Press <strong style={{ color: 'var(--c-fg)' }}>Share with class</strong> on
                          a font in Mine and it shows up here for everyone in your class.</>
                      ),
                    }}
                  />}
                  {collection === 'public' && <ClassLibrary
                    key="public-font"
                    kind="font"
                    source="public"
                    title="Everyone"
                    onMessage={say}
                    section={{
                      signedOut: <>Everyone is for people in a class. Join a class to see what students shared.</>,
                      empty: (
                        <>Nothing is shared with everyone yet. Choose <strong style={{ color: 'var(--c-fg)' }}>Everyone</strong> when
                          you share a font of yours.</>
                      ),
                    }}
                  />}
                  {collection === 'builtin' && <BuiltinFonts />}
                </>
              )}
              {(tab === 'pictures' || tab === 'sounds') && (() => {
                const kind = tab === 'pictures' ? 'texture' : 'sound';
                const what = tab === 'pictures' ? 'picture' : 'sound';
                return (
                  <>
                    {collection === 'mine' && <MyLibrary key={kind} kind={kind} onMessage={say} />}
                    {collection === 'class' && <ClassLibrary
                      key={'class-' + kind}
                      kind={kind}
                      title="Shared with my class"
                      onMessage={say}
                      section={{
                        signedOut: <>Sign in to see what your class has shared.</>,
                        empty: (
                          <>Nothing shared yet. Press <strong style={{ color: 'var(--c-fg)' }}>Share with class</strong> on
                            a {what} in Mine and it shows up here for everyone in your class.</>
                        ),
                      }}
                    />}
                    {collection === 'public' && <ClassLibrary
                      key={'public-' + kind}
                      kind={kind}
                      source="public"
                      title="Everyone"
                      onMessage={say}
                      section={{
                        signedOut: <>Everyone is for people in a class. Join a class to see what students shared.</>,
                        empty: (
                          <>Nothing is shared with everyone yet. Choose <strong style={{ color: 'var(--c-fg)' }}>Everyone</strong> when
                            you share a {what} of yours.</>
                        ),
                      }}
                    />}
                    {collection === 'builtin' && <BuiltInLibrary key={'builtin-' + kind} kind={kind} onMessage={say} />}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
