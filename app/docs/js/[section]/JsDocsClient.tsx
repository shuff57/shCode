'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import DocsRail from '../../../../components/DocsRail';
import { libraryClasses as libraryStyles } from '../../../../components/library-ui';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { searchDocs, type DocSection } from '../../../../lib/docs-core';
import DocLiveSnippet from '../../../../components/DocLiveSnippet';
import { splitDocCode } from '../../../../lib/doc-inline-code';

interface Props {
  /** The set switcher (DocsFamilyBar), drawn as the Library's tabs at the top of the main column. */
  tabs?: ReactNode;
  section: DocSection;
  allSections: DocSection[];
  basePath: string;
  docsTitle: string;
  searchPlaceholder: string;
}

// The /docs/js client. The moSHion/reSHape docs share DocsClient +
// DocsSandbox (engine previews); JS examples are plain console code, so this
// page reuses the docs layout CSS but renders each example with
// DocLiveSnippet — the same Worker + kill-timer console runner the drawer
// and the console lessons use.
export default function JsDocsClient({
  section,
  tabs,
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

  return (
    <div className={`docs-layout ${libraryStyles.workspace}`}>
      <DocsRail
        title={docsTitle}
        basePath={basePath}
        sections={allSections}
        currentSlug={section.slug}
        pageIndex={pageIndex}
        searching={isSearching}
        results={results}
        onPickResult={() => setQuery('')}
      />

      <main className={`docs-main ${libraryStyles.main}`}>
        {tabs}
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
        <div className="docs-body" style={{ maxWidth: '70ch' }}>
          {page.body.split(/\n\n+/).map((para, i) => (
            <p key={i}>
              {para.split('\n').map((line, j, arr) => (
                <span key={j}>
                  {splitDocCode(line, page.code ?? '').map((span, k) =>
                    span.code ? <code key={k}>{span.text}</code> : span.text,
                  )}
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
              Previous: {section.pages[pageIndex - 1].title}
            </Link>
          ) : prevSection ? (
            <Link
              className="btn-secondary btn-sm"
              href={`${basePath}/${prevSection.slug}?page=${prevSection.pages.length}`}
            >
              Previous: {prevSection.title}
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              className="btn-secondary btn-sm"
              href={`${basePath}/${section.slug}?page=${pageIndex + 2}`}
            >
              Next: {section.pages[pageIndex + 1].title}
            </Link>
          ) : nextSection ? (
            <Link
              className="btn-secondary btn-sm"
              href={`${basePath}/${nextSection.slug}`}
            >
              Next: {nextSection.title}
            </Link>
          ) : (
            <span />
          )}
        </footer>
      </main>
    </div>
  );
}
