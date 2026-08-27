'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { searchDocs, type DocSearchResult, type DocSection } from '../../../../lib/docs-core';
import DocLiveSnippet from '../../../../components/DocLiveSnippet';

interface Props {
  section: DocSection;
  allSections: DocSection[];
  basePath: string;
  docsTitle: string;
  searchPlaceholder: string;
}

function pageHref(basePath: string, slug: string, pageIndex: number) {
  return pageIndex === 0
    ? `${basePath}/${slug}`
    : `${basePath}/${slug}?page=${pageIndex + 1}`;
}

function HighlightedSnippet({ result }: { result: DocSearchResult }) {
  if (!result.matchLength) return <>{result.snippet}</>;
  const before = result.snippet.slice(0, result.matchStart);
  const hit = result.snippet.slice(result.matchStart, result.matchStart + result.matchLength);
  const after = result.snippet.slice(result.matchStart + result.matchLength);
  return (
    <>
      {before}
      <mark className="docs-search-mark">{hit}</mark>
      {after}
    </>
  );
}

// The /docs/js client. The moSHion/reSHape docs share DocsClient +
// DocsSandbox (engine previews); JS examples are plain console code, so this
// page reuses the docs layout CSS but renders each example with
// DocLiveSnippet — the same Worker + kill-timer console runner the drawer
// and the console lessons use.
export default function JsDocsClient({
  section,
  allSections,
  basePath,
  docsTitle,
  searchPlaceholder,
}: Props) {
  const params = useSearchParams();
  const pageParam = Number(params.get('page') || '1');
  const pageIndex = Math.min(Math.max(pageParam, 1), section.pages.length) - 1;
  const page = section.pages[pageIndex];

  const hasPrev = pageIndex > 0;
  const hasNext = pageIndex < section.pages.length - 1;

  const sectionIdx = allSections.findIndex((s) => s.slug === section.slug);
  const prevSection = sectionIdx > 0 ? allSections[sectionIdx - 1] : null;
  const nextSection =
    sectionIdx < allSections.length - 1 ? allSections[sectionIdx + 1] : null;

  const [query, setQuery] = useState('');
  const results = useMemo(() => searchDocs(allSections, query, 30), [allSections, query]);
  const isSearching = query.trim().length > 0;

  function gotoResult(r: DocSearchResult) {
    setQuery('');
    const el = document.getElementById(`jsdoc-page-${r.sectionSlug}-${r.pageIndex}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="docs-layout">
      <aside className="docs-sidebar">
        <div className="docs-sidebar-search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search docs…"
            aria-label="Search documentation"
          />
        </div>
        <div className="docs-sidebar-scroll">
          {isSearching ? (
            <div className="docs-sidebar-results">
              <div className="docs-sidebar-title">
                {results.length} result{results.length === 1 ? '' : 's'}
              </div>
              {results.length === 0 ? (
                <div className="docs-sidebar-empty">No matches.</div>
              ) : (
                <ul className="docs-sidebar-result-list">
                  {results.map((r, i) => (
                    <li key={`${r.sectionSlug}:${r.pageIndex}:${i}`}>
                      <Link
                        href={pageHref(basePath, r.sectionSlug, r.pageIndex)}
                        onClick={() => setQuery('')}
                      >
                        <span className="docs-sidebar-result-title">{r.pageTitle}</span>
                        <span className="docs-sidebar-result-section">{r.sectionTitle}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="docs-sidebar-title">{docsTitle}</div>
              <nav>
                {allSections.map((s) => {
                  const active = s.slug === section.slug;
                  return (
                    <div
                      key={s.slug}
                      className={`docs-sidebar-section${active ? ' active' : ''}`}
                    >
                      <Link
                        href={`${basePath}/${s.slug}`}
                        className="docs-sidebar-section-title"
                      >
                        {s.title}
                      </Link>
                      {active && s.pages.length > 1 && (
                        <ul className="docs-sidebar-pages">
                          {s.pages.map((p, i) => (
                            <li key={i}>
                              <Link
                                href={`${basePath}/${s.slug}?page=${i + 1}`}
                                className={i === pageIndex ? 'current' : ''}
                              >
                                {p.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </nav>
              <div className="docs-sidebar-footer">
                <Link href="/">← Back to lessons</Link>
              </div>
            </>
          )}
        </div>
      </aside>

      <main className="docs-main">
        <div className="docs-main-search">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label="Search documentation"
          />
        </div>

        <header className="docs-breadcrumb">
          {section.title}
          {section.pages.length > 1 && (
            <span className="docs-page-pill">
              Page {pageIndex + 1} of {section.pages.length}
            </span>
          )}
        </header>
        <h1 className="docs-title">{page.title}</h1>
        <div className="docs-body">
          {page.body.split(/\n\n+/).map((para, i) => (
            <p key={i}>
              {para.split('\n').map((line, j, arr) => (
                <span key={j}>
                  {line}
                  {j < arr.length - 1 && <br />}
                </span>
              ))}
            </p>
          ))}
        </div>
        {page.code && (
          <DocLiveSnippet
            initialCode={page.code}
            fileKey={`jsdocpage-${section.slug}-${pageIndex}`}
          />
        )}

        <footer className="docs-pagination">
          {hasPrev ? (
            <Link
              className="btn-secondary btn-sm"
              href={`${basePath}/${section.slug}?page=${pageIndex}`}
            >
              ← {section.pages[pageIndex - 1].title}
            </Link>
          ) : prevSection ? (
            <Link
              className="btn-secondary btn-sm"
              href={`${basePath}/${prevSection.slug}?page=${prevSection.pages.length}`}
            >
              ← {prevSection.title}
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              className="btn-secondary btn-sm"
              href={`${basePath}/${section.slug}?page=${pageIndex + 2}`}
            >
              {section.pages[pageIndex + 1].title} →
            </Link>
          ) : nextSection ? (
            <Link
              className="btn-secondary btn-sm"
              href={`${basePath}/${nextSection.slug}`}
            >
              {nextSection.title} →
            </Link>
          ) : (
            <span />
          )}
        </footer>
      </main>
    </div>
  );
}
