'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import DocsRail from '../../../../components/DocsRail';
import { libraryClasses as libraryStyles } from '../../../../components/library-ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  pageLink,
  resolvePageIndex,
  searchDocs,
  type DocSearchResult,
  type DocSection,
} from '../../../../lib/docs-core';
import DocsSandbox from './DocsSandbox';

interface Props {
  /** The set switcher (DocsFamilyBar), drawn as the Library's tabs at the top of the main column. */
  tabs?: ReactNode;
  section: DocSection;
  allSections: DocSection[];
  basePath: string;
  docsTitle: string;
  searchPlaceholder: string;
  /** Which runner the live sandbox on each page loads. reSHape Script source
   *  runs through /reshape/script-runner.html onto the B-rep kernel;
   *  moSHion source needs /moshion/runner.html. Neither runtime can execute
   *  the other's examples, so this is required, not a convenience — a wrong
   *  value throws on every Run. */
  preview: 'moshion' | 'reshape';
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

export default function DocsClient({
  section,
  tabs,
  allSections,
  basePath,
  docsTitle,
  searchPlaceholder,
  preview,
}: Props) {
  const params = useSearchParams();
  const router = useRouter();
  const pageIndex = resolvePageIndex(section, params.get('page'));
  const page = section.pages[pageIndex];

  const hasPrev = pageIndex > 0;
  const hasNext = pageIndex < section.pages.length - 1;

  const sectionIdx = allSections.findIndex((s) => s.slug === section.slug);
  const prevSection = sectionIdx > 0 ? allSections[sectionIdx - 1] : null;
  const nextSection =
    sectionIdx < allSections.length - 1 ? allSections[sectionIdx + 1] : null;

  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const mainInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchDocs(allSections, query, 30), [allSections, query]);
  const isSearching = query.trim().length > 0;

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const inField =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        mainInputRef.current?.focus();
        mainInputRef.current?.select();
        return;
      }
      if (e.key === '/' && !inField) {
        e.preventDefault();
        mainInputRef.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, []);

  function hrefFor(r: DocSearchResult) {
    const s = allSections.find((x) => x.slug === r.sectionSlug);
    return s ? pageLink(basePath, s, r.pageIndex) : `${basePath}/${r.sectionSlug}`;
  }

  function gotoResult(r: DocSearchResult) {
    setDropdownOpen(false);
    setQuery('');
    router.push(hrefFor(r));
  }

  function handleMainKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      setQuery('');
      setDropdownOpen(false);
      mainInputRef.current?.blur();
      return;
    }
    if (!isSearching || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
      setDropdownOpen(true);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      gotoResult(results[activeIdx]);
    }
  }

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
        <div className="docs-main-search" ref={dropdownRef}>
          <div className="docs-main-search-row">
            <input
              ref={mainInputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => isSearching && setDropdownOpen(true)}
              onKeyDown={handleMainKey}
              placeholder={searchPlaceholder}
              aria-label="Search documentation"
            />
            <kbd className="docs-main-search-kbd">⌘K</kbd>
          </div>
          {isSearching && dropdownOpen && (
            <div className="docs-main-search-dropdown" role="listbox">
              {results.length === 0 ? (
                <div className="docs-main-search-empty">No matches for “{query}”.</div>
              ) : (
                results.map((r, i) => (
                  <button
                    type="button"
                    key={`${r.sectionSlug}:${r.pageIndex}:${i}`}
                    className={`docs-main-search-result${i === activeIdx ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIdx(i)}
                    onClick={() => gotoResult(r)}
                    role="option"
                    aria-selected={i === activeIdx}
                  >
                    <div className="docs-main-search-result-head">
                      <span className="docs-main-search-result-title">{r.pageTitle}</span>
                      <span className="docs-main-search-result-section">{r.sectionTitle}</span>
                    </div>
                    <div className="docs-main-search-result-snippet">
                      <HighlightedSnippet result={r} />
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
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
          <DocsSandbox
            key={`${section.slug}-${pageIndex}`}
            initialCode={page.code}
            preview={preview}
          />
        )}

        <footer className="docs-pagination">
          {hasPrev ? (
            <Link
              className="btn-secondary btn-sm"
              href={pageLink(basePath, section, pageIndex - 1)}
            >
              Previous: {section.pages[pageIndex - 1].title}
            </Link>
          ) : prevSection ? (
            <Link
              className="btn-secondary btn-sm"
              href={pageLink(basePath, prevSection, prevSection.pages.length - 1)}
            >
              Previous: {prevSection.title}
            </Link>
          ) : (
            <span />
          )}
          {hasNext ? (
            <Link
              className="btn-secondary btn-sm"
              href={pageLink(basePath, section, pageIndex + 1)}
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
