'use client';

import { useMemo, useState } from 'react';
import type { DocSearchResult } from '../lib/docs-core';
import { DOCS_SETS, getDocsSet, type DocsSet } from './docs-sets';

function Highlighted({ result }: { result: DocSearchResult }) {
  if (!result.matchLength) return <>{result.snippet}</>;
  const before = result.snippet.slice(0, result.matchStart);
  const hit = result.snippet.slice(result.matchStart, result.matchStart + result.matchLength);
  const after = result.snippet.slice(result.matchStart + result.matchLength);
  return (
    <>
      {before}
      <mark style={{ background: 'rgba(255, 184, 108, 0.35)', color: 'inherit', padding: '0 2px', borderRadius: 2 }}>
        {hit}
      </mark>
      {after}
    </>
  );
}

// The Docs drawer tab. Every docs set (JavaScript, moSHion, reSHape) is
// mounted; a selector at the top switches between them, and each set keeps
// its own section + page position so switching does not lose your place.
// The default set is the one the caller is teaching — a console lesson opens
// on JavaScript, a moSHion lesson on moSHion — but all three are one click
// away, because a student reading about `for` loops in the moSHion docs may
// want the plain-JS page on the same construct.
export default function DocsDrawer({
  defaultSetId,
  storageKey,
}: {
  defaultSetId: string;
  storageKey: string;
}) {
  const [setId, setSetId] = useState<string>(defaultSetId);
  const set: DocsSet = getDocsSet(setId);
  const { sections, searchDocs, snippet: Snippet } = set;

  const [activeSlug, setActiveSlug] = useState<string>(sections[0]?.slug ?? '');
  const [query, setQuery] = useState('');
  const activeSection = sections.find((s) => s.slug === activeSlug) ?? sections[0];

  const results = useMemo(() => searchDocs(query, 30), [query, searchDocs]);
  const isSearching = query.trim().length > 0;

  // Remember the last set per surface (sandbox vs lessons) so a student who
  // switched to reSHape once does not get bounced back to JavaScript on every
  // lesson. The section position is kept per set in state, not storage.
  const setStorage = `${storageKey}:set`;
  const [mounted, setMounted] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useMemo(() => {
    if (typeof window === 'undefined' || initialized) return;
    const saved = window.localStorage.getItem(setStorage);
    if (saved && DOCS_SETS.some((s) => s.id === saved)) setSetId(saved);
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useMemo(() => {
    if (!mounted) return;
    try { window.localStorage.setItem(setStorage, setId); } catch { /* private mode */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setId]);

  useMemo(() => {
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchSet(nextId: string) {
    if (nextId === setId) return;
    setSetId(nextId);
    setQuery('');
    setActiveSlug(getDocsSet(nextId).sections[0]?.slug ?? '');
  }

  function jumpTo(r: DocSearchResult) {
    setActiveSlug(r.sectionSlug);
    setQuery('');
    // Scroll the matched page into view after the section renders.
    requestAnimationFrame(() => {
      const el = document.getElementById(`docsdrawer-page-${r.sectionSlug}-${r.pageIndex}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  return (
    <>
      <div
        style={{
          position: 'sticky',
          top: -14,
          margin: '-14px -16px 12px',
          padding: '10px 16px',
          background: '#21222c',
          borderBottom: '1px solid #44475a',
          zIndex: 2,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {DOCS_SETS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => switchSet(s.id)}
              aria-pressed={s.id === setId}
              style={{
                flex: 1,
                background: s.id === setId ? '#bd93f9' : 'transparent',
                color: s.id === setId ? '#21222c' : '#bd93f9',
                border: '1px solid #bd93f9',
                borderRadius: 4,
                padding: '4px 6px',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${set.label} docs…`}
          aria-label="Search documentation"
          style={{
            width: '100%',
            background: '#282a36',
            color: '#f8f8f2',
            border: '1px solid #44475a',
            borderRadius: 4,
            padding: '6px 10px',
            fontSize: '0.85rem',
            outline: 'none',
          }}
        />
      </div>

      {isSearching ? (
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.55, marginBottom: 8 }}>
            {results.length} result{results.length === 1 ? '' : 's'}
          </div>
          {results.length === 0 ? (
            <div style={{ opacity: 0.6, fontSize: '0.85rem' }}>No matches for “{query}”.</div>
          ) : (
            results.map((r, i) => (
              <button
                type="button"
                key={`${r.sectionSlug}:${r.pageIndex}:${i}`}
                onClick={() => jumpTo(r)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  border: '1px solid #44475a',
                  borderRadius: 4,
                  padding: '8px 10px',
                  marginBottom: 6,
                  color: '#f8f8f2',
                  cursor: 'pointer',
                  font: 'inherit',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: '#bd93f9', fontWeight: 600, fontSize: '0.85rem' }}>{r.pageTitle}</span>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.55 }}>
                    {r.sectionTitle}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.85, lineHeight: 1.4 }}>
                  <Highlighted result={r} />
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12, flexShrink: 0 }}>
            <select
              aria-label="Select documentation section"
              value={activeSlug}
              onChange={(e) => setActiveSlug(e.target.value)}
              style={{
                width: '100%',
                background: '#282a36',
                color: '#f8f8f2',
                border: '1px solid #44475a',
                borderRadius: 4,
                padding: '5px 8px',
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              {sections.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
          {activeSection && (
            <>
              <h2 style={{ margin: '0 0 12px', fontSize: '1rem', color: '#f8f8f2', fontWeight: 600 }}>
                {activeSection.title}
              </h2>
              {activeSection.pages.map((page, pi) => (
                <div
                  key={pi}
                  id={`docsdrawer-page-${activeSection.slug}-${pi}`}
                  style={{ marginBottom: 24, scrollMarginTop: 70 }}
                >
                  <h3 style={{ margin: '0 0 6px', fontSize: '0.9rem', color: '#bd93f9', fontWeight: 600 }}>
                    {page.title}
                  </h3>
                  {page.body.split('\n\n').map((para, i) => (
                    <p key={i} style={{ margin: '0 0 8px' }}>
                      {para}
                    </p>
                  ))}
                  {page.code && (
                    <Snippet
                      initialCode={page.code}
                      fileKey={`${set.id}-doc-${activeSection.slug}-${pi}`}
                    />
                  )}
                </div>
              ))}
            </>
          )}
        </>
      )}
    </>
  );
}
