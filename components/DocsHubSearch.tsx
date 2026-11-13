'use client';

// The search box at the top of /docs: finds a topic or an API across the JavaScript, moSHion and
// reSHape references with each set's own searchDocs() (lib/docs-hub-search.ts), and links to the
// page that already explains it. The three reference sets are loaded only once the box is used,
// so the hub itself stays light.

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { searchAllDocs, type HubDocSet, type HubSearchResult } from '../lib/docs-hub-search';

async function loadSets(): Promise<HubDocSet[]> {
  const [js, moshion, reshape] = await Promise.all([
    import('../lib/js-docs'),
    import('../lib/moshion-docs'),
    import('../lib/reshape-docs'),
  ]);
  return [
    { id: 'js', label: 'JavaScript', basePath: '/docs/js', sections: js.sections },
    { id: 'moshion', label: 'moSHion', basePath: '/docs/moshion', sections: moshion.sections },
    { id: 'reshape', label: 'reSHape', basePath: '/docs/reshape', sections: reshape.sections },
  ];
}

function Snippet({ r }: { r: HubSearchResult }) {
  if (!r.matchLength) return <>{r.snippet}</>;
  return (
    <>
      {r.snippet.slice(0, r.matchStart)}
      <mark className="docs-search-mark">{r.snippet.slice(r.matchStart, r.matchStart + r.matchLength)}</mark>
      {r.snippet.slice(r.matchStart + r.matchLength)}
    </>
  );
}

export default function DocsHubSearch() {
  const id = useId();
  const [query, setQuery] = useState('');
  const [sets, setSets] = useState<HubDocSet[] | null>(null);
  const loading = useRef(false);
  const listRef = useRef<HTMLOListElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const load = () => {
    if (sets || loading.current) return;
    loading.current = true;
    loadSets().then(setSets).catch(() => { loading.current = false; });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (query.trim()) load(); }, [query]);

  const results = useMemo(() => (sets ? searchAllDocs(sets, query, 20) : []), [sets, query]);
  const searching = query.trim().length > 0;

  const links = () => Array.from(listRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
  const onInputKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { const first = links()[0]; if (first) { e.preventDefault(); first.focus(); } }
    if (e.key === 'Escape' && query) { e.preventDefault(); setQuery(''); }
  };
  const onListKey = (e: KeyboardEvent<HTMLOListElement>) => {
    const all = links();
    const at = all.indexOf(document.activeElement as HTMLAnchorElement);
    if (at < 0) return;
    if (e.key === 'ArrowDown' && at < all.length - 1) { e.preventDefault(); all[at + 1].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); (at === 0 ? inputRef.current : all[at - 1])?.focus(); }
    if (e.key === 'Escape') { e.preventDefault(); setQuery(''); inputRef.current?.focus(); }
  };

  // "/" anywhere on the page (outside a text field) jumps to the search box, as the hint in the box says.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const status = !searching
    ? 'Type a word like array, sprite or extrude.'
    : !sets
      ? 'Searching…'
      : results.length === 0
        ? `No matches for “${query.trim()}”. Try a shorter or different word.`
        : `${results.length}${results.length === 20 ? '+' : ''} result${results.length === 1 ? '' : 's'}`;

  return (
    <div className="docs-hub-search" role="search">
      <label htmlFor={`${id}-q`} className="docs-hub-search-label">Search all docs</label>
      <div className="docs-hub-search-field">
      <Search size={16} className="docs-hub-search-icon" aria-hidden="true" />
      <input
        ref={inputRef}
        id={`${id}-q`}
        type="search"
        value={query}
        autoComplete="off"
        spellCheck={false}
        placeholder="Search JavaScript, moSHion and reSHape…"
        aria-describedby={`${id}-status`}
        aria-controls={`${id}-results`}
        onFocus={load}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onInputKey}
        aria-keyshortcuts="/"
      />
      {!query && <kbd className="docs-hub-search-key" aria-hidden="true" title="Press / to search">/</kbd>}
      </div>
      <p id={`${id}-status`} className="docs-hub-search-status" role="status" aria-live="polite">{status}</p>
      {searching && results.length > 0 && (
        <ol id={`${id}-results`} ref={listRef} className="docs-hub-search-results" onKeyDown={onListKey}>
          {results.map((r, i) => (
            <li key={`${r.setId}:${r.sectionSlug}:${r.pageIndex}:${i}`}>
              <Link href={r.href} prefetch={false}>
                <span className="docs-hub-search-result-head">
                  <span className="docs-hub-search-result-title">{r.pageTitle}</span>
                  <span className="docs-hub-search-result-where">{r.setLabel} · {r.sectionTitle}</span>
                </span>
                <span className="docs-hub-search-result-snippet"><Snippet r={r} /></span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
