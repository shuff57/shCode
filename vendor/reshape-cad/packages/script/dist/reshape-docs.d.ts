import { type DocPage, type DocSection, type DocSearchResult } from './docs-core.js';
export type { DocPage, DocSection, DocSearchResult };
export declare const sections: DocSection[];
export declare function searchDocs(query: string): DocSearchResult[];
export declare function getSection(slug: string): DocSection | undefined;
export declare function getAllSectionSlugs(): string[];
//# sourceMappingURL=reshape-docs.d.ts.map