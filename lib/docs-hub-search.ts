// The /docs hub's one search box: the same searchDocs() each reference set's own page uses
// (lib/docs-core.ts), run over every set and merged, each result carrying the link to the
// existing page that holds it. No new index; pure, so scripts/test-docs-hub-search.mjs can pin it.

import { searchDocs, type DocSearchResult, type DocSection } from './docs-core';

export interface HubDocSet {
  id: string;
  label: string;
  /** Where the set's pages live, e.g. "/docs/js". */
  basePath: string;
  sections: DocSection[];
}

export interface HubSearchResult extends DocSearchResult {
  setId: string;
  setLabel: string;
  href: string;
}

/** The same URL shape the set's own sidebar links use (page 1 has no query). */
export function docPageHref(basePath: string, slug: string, pageIndex: number): string {
  return pageIndex === 0 ? `${basePath}/${slug}` : `${basePath}/${slug}?page=${pageIndex + 1}`;
}

/** Results whose page title holds the first word come first, then those in a topic named for it
 *  ("array" -> the Arrays pages); otherwise the sets keep their order (JavaScript, moSHion,
 *  reSHape) and each set its book order. */
export function searchAllDocs(sets: HubDocSet[], query: string, limit = 20): HubSearchResult[] {
  const primary = query.trim().toLowerCase().split(/\s+/)[0] ?? '';
  if (!primary) return [];
  const all: { r: HubSearchResult; rank: number; order: number }[] = [];
  let order = 0;
  for (const set of sets) {
    for (const r of searchDocs(set.sections, query, 200)) {
      all.push({
        r: { ...r, setId: set.id, setLabel: set.label, href: docPageHref(set.basePath, r.sectionSlug, r.pageIndex) },
        rank: r.pageTitle.toLowerCase().includes(primary) ? 0 : r.sectionTitle.toLowerCase().includes(primary) ? 1 : 2,
        order: order++,
      });
    }
  }
  all.sort((a, b) => a.rank - b.rank || a.order - b.order);
  return all.slice(0, limit).map((x) => x.r);
}
