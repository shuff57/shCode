'use client';

// The /docs hub, laid out like the Library (components/ClassLibraryPanel.tsx): an "Explore"
// rail on the left picks a reference set, the main column carries the search and a grid of
// cards in the Library's shelf style. "All docs" shows the three sets; a set shows its topics,
// each card linking to that topic's first page. Topics come from each set's sections, loaded
// only when a set is opened (the moSHion reference alone is ~150 KB), the same way the search
// loads them. The choice lives in the address (?set=) so Back works, as the Library's tabs do.

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BookOpen, Box, Braces, Gamepad2, type LucideIcon } from 'lucide-react';
import { libraryClasses as styles, sectionHeading, sectionNote } from './library-ui';
import DocsHubSearch from './DocsHubSearch';
import type { DocSection } from '../lib/docs-core';

type SetId = 'js' | 'moshion' | 'reshape';
type View = 'all' | SetId;

interface HubSet {
  id: SetId;
  label: string;
  icon: LucideIcon;
  /** The set's first page: where "Start at the beginning" goes. */
  firstHref: string;
  description: string;
  load: () => Promise<DocSection[]>;
}

const SETS: HubSet[] = [
  {
    id: 'js',
    label: 'JavaScript',
    icon: Braces,
    firstHref: '/docs/js/values',
    description: 'The basics: values, variables, conditionals, loops, functions, arrays, objects, JSON.',
    load: () => import('../lib/js-docs').then((m) => m.sections),
  },
  {
    id: 'moshion',
    label: 'moSHion',
    icon: Gamepad2,
    firstHref: '/docs/moshion/overview',
    description: 'The game engine: sprites, physics, collisions, groups, the canvas.',
    load: () => import('../lib/moshion-docs').then((m) => m.sections),
  },
  {
    id: 'reshape',
    label: 'reSHape',
    icon: Box,
    firstHref: '/docs/reshape/overview',
    description: 'Solid modelling: reSHape Script on the B-rep kernel.',
    load: () => import('../lib/reshape-docs').then((m) => m.sections),
  },
];

function isView(v: unknown): v is View {
  return v === 'all' || SETS.some((s) => s.id === v);
}

function viewFromUrl(): View {
  if (typeof window === 'undefined') return 'all';
  const v = new URLSearchParams(window.location.search).get('set');
  return isView(v) ? v : 'all';
}

export default function DocsHub() {
  // 'all' on the first render so the prerendered page carries the three set links.
  const [view, setView] = useState<View>('all');
  const [sections, setSections] = useState<Partial<Record<SetId, DocSection[] | 'failed'>>>({});

  useEffect(() => {
    const restore = () => setView(viewFromUrl());
    restore();
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);

  useEffect(() => {
    if (view === 'all' || sections[view]) return;
    const set = SETS.find((s) => s.id === view)!;
    let live = true;
    set.load()
      .then((list) => { if (live) setSections((prev) => ({ ...prev, [view]: list })); })
      .catch(() => { if (live) setSections((prev) => ({ ...prev, [view]: 'failed' })); });
    return () => { live = false; };
  }, [view, sections]);

  const pick = (next: View) => {
    setView(next);
    const url = new URL(window.location.href);
    if (next === 'all') url.searchParams.delete('set');
    else url.searchParams.set('set', next);
    if (url.href !== window.location.href) window.history.pushState(window.history.state, '', url.pathname + url.search + url.hash);
  };

  const current = view === 'all' ? null : SETS.find((s) => s.id === view)!;
  const topics = current ? sections[current.id] : undefined;

  return (
    <div className={styles.workspace}>
      <nav className={styles.rail} aria-label="Reference sets">
        <span className={styles.railLabel}>Explore</span>
        <button type="button" aria-pressed={view === 'all'} onClick={() => pick('all')} className={styles.destination}>
          <BookOpen size={16} aria-hidden="true" />
          All docs
        </button>
        {SETS.map((s) => (
          <button key={s.id} type="button" aria-pressed={view === s.id} onClick={() => pick(s.id)} className={styles.destination}>
            <s.icon size={16} aria-hidden="true" />
            {s.label}
          </button>
        ))}
      </nav>

      <div className={styles.main}>
        <DocsHubSearch />

        {!current && (
          <section>
            <h2 style={sectionHeading}>Reference sets ({SETS.length})</h2>
            <p style={sectionNote}>Pick a set to see its topics. Inside, the bar at the top switches between sets.</p>
            <div className={styles.shelves}>
              {SETS.map((s) => (
                <button key={s.id} type="button" className={styles.shelf} onClick={() => pick(s.id)}>
                  <span className={styles.shelfPreview} aria-hidden="true"><s.icon size={26} /></span>
                  <span className={styles.shelfTitle}>{s.label}</span>
                  <span className={styles.shelfMeta} style={{ display: 'block' }}>{s.description}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {current && (
          <section>
            <div className={styles.breadcrumb}>
              <button type="button" onClick={() => pick('all')} className="docs-hub-crumb">All docs</button>
              <span aria-hidden="true">/</span>
              <span style={{ color: 'var(--c-fg)' }}>{current.label}</span>
            </div>
            <h2 style={sectionHeading}>
              {current.label}{Array.isArray(topics) ? ` (${topics.length})` : ''}
            </h2>
            <p style={sectionNote}>{current.description}</p>
            <div className={styles.quickViews}>
              <Link href={current.firstHref} className={styles.quickView} style={{ textDecoration: 'none' }}>
                Start at the beginning <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
            {topics === undefined && <p style={sectionNote} role="status">Loading topics…</p>}
            {topics === 'failed' && (
              <p style={sectionNote} role="status">
                The topics did not load. <Link href={current.firstHref}>Open the {current.label} docs</Link> instead.
              </p>
            )}
            {Array.isArray(topics) && (
              <div className={styles.shelves}>
                {topics.map((t) => (
                  <Link key={t.slug} href={`/docs/${current.id}/${t.slug}`} prefetch={false}
                    className={styles.shelf} style={{ textDecoration: 'none', display: 'block' }}>
                    <span className={styles.shelfTitle}>{t.title}</span>
                    <span className={styles.shelfMeta} style={{ display: 'block' }}>
                      {t.pages.length} page{t.pages.length === 1 ? '' : 's'}
                      {t.pages[0] ? ` · ${t.pages[0].title}` : ''}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
