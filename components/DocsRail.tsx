'use client';

// The side rail on every /docs/<set>/<section> page, in the Library's look (the rail of
// components/ClassLibraryPanel.tsx): one button per topic, the open topic's pages listed under
// it. While the page's search box has a query, the rail lists the matches instead.
// Shared by the moSHion/reSHape DocsClient and the JavaScript JsDocsClient.

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { libraryClasses as styles } from './library-ui';
import type { DocSearchResult, DocSection } from '../lib/docs-core';

export function docPageHref(basePath: string, slug: string, pageIndex: number): string {
  return pageIndex === 0 ? `${basePath}/${slug}` : `${basePath}/${slug}?page=${pageIndex + 1}`;
}

interface Props {
  title: string;
  basePath: string;
  sections: DocSection[];
  currentSlug: string;
  pageIndex: number;
  searching: boolean;
  results: DocSearchResult[];
  onPickResult: () => void;
}

export default function DocsRail({ title, basePath, sections, currentSlug, pageIndex, searching, results, onPickResult }: Props) {
  const railRef = useRef<HTMLElement | null>(null);

  // Bring the open topic into view inside the rail (a long set scrolls: down on a wide
  // screen, sideways on a phone). Only the rail scrolls, never the page.
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    // The open page's own link when it is shown, else its topic's button (a phone hides the pages).
    const at = Array.from(rail.querySelectorAll<HTMLElement>('.docs-rail-pages [aria-current="page"], [aria-current]'))
      .find((el) => el.offsetParent === rail);
    if (!at) return;
    if (rail.scrollWidth > rail.clientWidth) rail.scrollLeft = at.offsetLeft - (rail.clientWidth - at.offsetWidth) / 2;
    else if (rail.scrollHeight > rail.clientHeight) rail.scrollTop = at.offsetTop - rail.clientHeight / 3;
  }, [currentSlug, pageIndex, searching]);

  return (
    <nav ref={railRef} className={`${styles.rail} docs-rail`} aria-label={searching ? 'Search results' : title}>
      {searching ? (
        <>
          <span className={styles.railLabel} role="status">
            {results.length} result{results.length === 1 ? '' : 's'}
          </span>
          {results.length === 0 && <p className="docs-rail-empty">No matches.</p>}
          {results.map((r, i) => (
            <Link key={`${r.sectionSlug}:${r.pageIndex}:${i}`} href={docPageHref(basePath, r.sectionSlug, r.pageIndex)}
              onClick={onPickResult} className={`${styles.destination} docs-rail-result`}>
              <span>{r.pageTitle}</span>
              <span className="docs-rail-result-where">{r.sectionTitle}</span>
            </Link>
          ))}
        </>
      ) : (
        <>
          <span className={styles.railLabel}>{title}</span>
          {sections.map((s) => {
            const active = s.slug === currentSlug;
            return (
              <div key={s.slug}>
                <Link href={`${basePath}/${s.slug}`} className={styles.destination}
                  aria-current={active ? (s.pages.length > 1 ? 'true' : 'page') : undefined}>
                  {s.title}
                </Link>
                {active && s.pages.length > 1 && (
                  <ul className="docs-rail-pages">
                    {s.pages.map((p, i) => (
                      <li key={i}>
                        <Link href={docPageHref(basePath, s.slug, i)} aria-current={i === pageIndex ? 'page' : undefined}>
                          {p.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <Link href="/docs" className={`${styles.destination} docs-rail-home`}>
            <ArrowLeft size={16} aria-hidden="true" />
            All docs
          </Link>
        </>
      )}
    </nav>
  );
}
