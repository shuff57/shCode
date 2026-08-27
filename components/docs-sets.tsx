'use client';

import type { DocSearchResult, DocSection } from '../lib/docs-core';
import DocLiveSnippet from './DocLiveSnippet';
import MoshionDocLiveSnippet from './MoshionDocLiveSnippet';
import ReshapeDocLiveSnippet from './ReshapeDocLiveSnippet';
import { sections as jsSections, searchDocs as searchJsDocs } from '../lib/js-docs';
import { sections as moshionSections, searchDocs as searchMoshionDocs } from '../lib/moshion-docs';
import { sections as reshapeSections, searchDocs as searchReshapeDocs } from '../lib/reshape-docs';

export type SnippetComponent = (props: {
  initialCode: string;
  fileKey: string;
}) => React.ReactElement | null;

export interface DocsSet {
  id: string;
  label: string;
  /** Full-page docs route, when one exists. The drawer-only JS set has none. */
  docsHref: string | null;
  sections: DocSection[];
  searchDocs: (query: string, limit?: number) => DocSearchResult[];
  /** The live snippet runner for this set's code. Plain JS runs in the
   *  console Worker; moSHion and reSHape each need their own engine runner. */
  snippet: SnippetComponent;
}

// Every docs set the Docs drawer can show. The drawer mounts all three and
// lets the student switch — a console lesson defaults to JavaScript, but the
// moSHion and reSHape references are one click away, and vice versa.
export const DOCS_SETS: DocsSet[] = [
  {
    id: 'js',
    label: 'JavaScript',
    docsHref: null,
    sections: jsSections,
    searchDocs: searchJsDocs,
    snippet: DocLiveSnippet,
  },
  {
    id: 'moshion',
    label: 'moSHion',
    docsHref: '/docs/moshion',
    sections: moshionSections,
    searchDocs: searchMoshionDocs,
    snippet: MoshionDocLiveSnippet,
  },
  {
    id: 'reshape',
    label: 'reSHape',
    docsHref: '/docs/reshape',
    sections: reshapeSections,
    searchDocs: searchReshapeDocs,
    snippet: ReshapeDocLiveSnippet,
  },
];

export function getDocsSet(id: string): DocsSet {
  return DOCS_SETS.find((s) => s.id === id) ?? DOCS_SETS[0];
}
