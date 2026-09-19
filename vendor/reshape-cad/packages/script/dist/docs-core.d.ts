export interface DocPage {
    title: string;
    body: string;
    code?: string;
}
export interface DocSection {
    slug: string;
    title: string;
    pages: DocPage[];
}
export interface DocSearchResult {
    sectionSlug: string;
    sectionTitle: string;
    pageIndex: number;
    pageTitle: string;
    snippet: string;
    matchStart: number;
    matchLength: number;
}
export declare function searchDocs(sections: DocSection[], query: string, limit?: number): DocSearchResult[];
export declare function getSection(sections: DocSection[], slug: string): DocSection | undefined;
export declare function getAllSectionSlugs(sections: DocSection[]): string[];
//# sourceMappingURL=docs-core.d.ts.map