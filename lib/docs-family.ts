// The /docs family — one Docs tab in the nav, three reference sets inside.
// Each set is a docs route (`/docs/<id>/<section>`), and the family switcher
// at the top of every docs page moves between them.

export interface DocsFamilyMember {
  id: string;
  label: string;
  /** First section slug — the page a bare /docs/<id> redirects to. */
  rootSection: string;
}

export const DOCS_FAMILY: DocsFamilyMember[] = [
  { id: 'js', label: 'JavaScript', rootSection: 'values' },
  { id: 'moshion', label: 'moSHion', rootSection: 'overview' },
  { id: 'reshape', label: 'reSHape', rootSection: 'overview' },
];
