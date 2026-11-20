// The in-app moSHion docs (/docs/moshion): the engine's own docs, written once in
// the moshion repo (docs/content/) and copied in by `npm run sync:moshion` as
// lib/moshion-docs-shared.generated.ts, plus shCode's own pages and notes from
// lib/moshion-docs-shcode.ts.
//
// To change a page about the engine, edit it in the moshion repo and sync. To
// change a page about shCode (the Library, accounts, rooms, sharing), edit
// lib/moshion-docs-shcode.ts. Nothing here is written by hand except the join.
//
// A page is addressed by its section slug and its id: /docs/moshion/sprite?page=removing.
// scripts/test-moshion-docs.mjs checks every link in the course resolves.

import {
  searchDocs as coreSearchDocs,
  getSection as coreGetSection,
  getAllSectionSlugs as coreGetAllSectionSlugs,
  type DocPage,
  type DocSection,
  type DocSearchResult,
} from './docs-core';
import { sharedSections } from './moshion-docs-shared.generated';
import { overrides, extraPages, extraSections, type DocOverride } from './moshion-docs-shcode';

export type { DocSection, DocSearchResult };

/** The moshion repo's examples load files from `assets/` beside its runner;
 *  in shCode the same files are served from /moshion/assets/. */
export function localizePaths(text: string): string {
  return text.replace(/(['"`(])assets\//g, '$1/moshion/assets/');
}

/** Apply one override to a shared page. Throws when the paragraph it swaps is gone. */
export function applyOverride(page: DocPage, o: DocOverride): DocPage {
  let body = page.body;
  if (o.body !== undefined) body = o.body;
  if (o.swap) {
    const paras = body.split(/\n\n+/);
    const i = paras.findIndex((p) => p.startsWith(o.swap!.from));
    if (i < 0) throw new Error(`moshion docs: ${o.section}/${o.page} no longer has a paragraph starting "${o.swap.from}"`);
    paras[i] = o.swap.to;
    body = paras.join('\n\n');
  }
  if (o.append) body = `${body.trimEnd()}\n\n${o.append}`;
  return { ...page, body };
}

export function assemble(shared: DocSection[]): DocSection[] {
  const out: DocSection[] = shared.map((s) => ({
    ...s,
    pages: s.pages.map((p) => ({
      ...p,
      body: localizePaths(p.body),
      ...(p.code ? { code: localizePaths(p.code) } : {}),
    })),
  }));
  const find = (slug: string) => {
    const s = out.find((x) => x.slug === slug);
    if (!s) throw new Error(`moshion docs: no shared section "${slug}"`);
    return s;
  };
  for (const o of overrides) {
    const s = find(o.section);
    const i = s.pages.findIndex((p) => p.id === o.page);
    if (i < 0) throw new Error(`moshion docs: override for missing page ${o.section}/${o.page}`);
    s.pages[i] = applyOverride(s.pages[i], o);
  }
  for (const x of extraPages) {
    const s = find(x.section);
    const i = s.pages.findIndex((p) => p.id === x.after);
    if (i < 0) throw new Error(`moshion docs: no page ${x.section}/${x.after} to put ${x.page.id} after`);
    s.pages.splice(i + 1, 0, x.page);
  }
  for (const x of extraSections) {
    const i = out.findIndex((s) => s.slug === x.after);
    if (i < 0) throw new Error(`moshion docs: no section "${x.after}" to put ${x.section.slug} after`);
    out.splice(i + 1, 0, x.section);
  }
  return out;
}

export const sections: DocSection[] = assemble(sharedSections);

export function getSection(slug: string): DocSection | undefined {
  return coreGetSection(sections, slug);
}

export function getAllSectionSlugs(): string[] {
  return coreGetAllSectionSlugs(sections);
}

export function searchDocs(query: string, limit = 30): DocSearchResult[] {
  return coreSearchDocs(sections, query, limit);
}

export interface RelevantDoc {
  sectionTitle: string;
  pageTitle: string;
  body: string;
  code?: string;
}

export function findRelevantDocs(keywords: string[], maxPages = 6): RelevantDoc[] {
  const tokens = Array.from(
    new Set(
      keywords
        .map((k) => (k || '').toLowerCase().trim())
        .filter((k) => k.length >= 2),
    ),
  );
  if (tokens.length === 0) return [];

  const scored: { score: number; page: RelevantDoc }[] = [];
  for (const section of sections) {
    section.pages.forEach((page) => {
      const title = page.title.toLowerCase();
      const body = page.body.toLowerCase();
      const code = (page.code || '').toLowerCase();
      let score = 0;
      for (const t of tokens) {
        if (title.includes(t)) score += 5;
        if (code.includes(t)) score += 3;
        if (body.includes(t)) score += 1;
      }
      if (score > 0) {
        scored.push({
          score,
          page: {
            sectionTitle: section.title,
            pageTitle: page.title,
            body: page.body,
            code: page.code,
          },
        });
      }
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxPages).map((s) => s.page);
}
