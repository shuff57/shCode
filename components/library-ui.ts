// Shared look for the Library page's tab sections (ClassLibraryPanel and the
// section components it mounts), so every "Mine (12)" heading matches.

import type { CSSProperties } from 'react';

export const sectionHeading: CSSProperties = { fontSize: 14, margin: '0 0 4px', color: 'var(--c-fg)' };
export const sectionStyle: CSSProperties = { marginTop: 18 };
export const sectionNote: CSSProperties = { fontSize: 13, color: 'var(--c-dim)', margin: '0 0 10px', lineHeight: 1.5 };

export type LibraryCollection = 'mine' | 'class' | 'public' | 'builtin' | 'starred' | 'changes';

// Stable class names; the server layout owns stylesheet loading and cleanup.
export const libraryClasses = {
  library: 'shcode-library-library',
  workspace: 'shcode-library-workspace',
  rail: 'shcode-library-rail',
  destination: 'shcode-library-destination',
  railLabel: 'shcode-library-railLabel',
  typeTabs: 'shcode-library-typeTabs',
  typeTab: 'shcode-library-typeTab',
  main: 'shcode-library-main',
  shelves: 'shcode-library-shelves',
  shelf: 'shcode-library-shelf',
  shelfPreview: 'shcode-library-shelfPreview',
  shelfTitle: 'shcode-library-shelfTitle',
  shelfMeta: 'shcode-library-shelfMeta',
  quickViews: 'shcode-library-quickViews',
  quickView: 'shcode-library-quickView',
  breadcrumb: 'shcode-library-breadcrumb',
  backButton: 'shcode-library-backButton',
  manage: 'shcode-library-manage',
  shelfContainer: 'shcode-library-shelfContainer',
  folderActions: 'shcode-library-folderActions',
  folderEdit: 'shcode-library-folderEdit',
  folderAppearance: 'shcode-library-folderAppearance',
  iconChoices: 'shcode-library-iconChoices',
  colorChoices: 'shcode-library-colorChoices',
  moveTargets: 'shcode-library-moveTargets',
  dropTarget: 'shcode-library-dropTarget',
  sortableCard: 'shcode-library-sortableCard',
  dragPreview: 'shcode-library-dragPreview',
  folderDrop: 'shcode-library-folderDrop',
} as const;
