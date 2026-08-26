'use client';

import { useMemo, useState } from 'react';
import { sections, searchDocs, type DocSearchResult } from '../lib/moshion-docs';
import MoshionDocLiveSnippet from './MoshionDocLiveSnippet';

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

export default function MoshionDocsContent() {
  const [activeSlug, setActiveSlug] = useState<string>(sections[0]?.slug ?? '');
  const [query, setQuery] = useState('');
  const activeSection = sections.find((s) => s.slug === activeSlug) ?? sections[0];

  const results = useMemo(() => searchDocs(query, 30), [query]);
  const isSearching = query.trim().length > 0;

  function jumpTo(r: DocSearchResult) {
    setActiveSlug(r.sectionSlug);
    setQuery('');
    // Scroll the matched page into view after the section renders.
    requestAnimationFrame(() => {
      const el = document.getElementById(`moshiondoc-page-${r.sectionSlug}-${r.pageIndex}`);
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
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs…"
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
                  id={`moshiondoc-page-${activeSection.slug}-${pi}`}
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
                    <MoshionDocLiveSnippet
                      initialCode={page.code}
                      fileKey={`moshiondoc-${activeSection.slug}-${pi}`}
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
