import Link from 'next/link';
import type { ReactNode } from 'react';
import { libraryClasses as styles } from './library-ui';

// The frame of every /docs page: the Library page's width and heading (app/library/page.tsx,
// components/ClassLibraryPanel.tsx), so the docs and the Library read as one family. The
// rail and tabs inside are the docs clients' own (components/DocsRail.tsx, DocsFamilyBar).
export default function DocsFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', width: '100%' }}>
      <div className={`${styles.library} docs-library`} style={{ padding: '4px 2px', color: 'var(--c-fg)' }}>
        <Link href="/docs" className="docs-library-title">Docs</Link>
        <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 24px', lineHeight: 1.5 }}>
          The reference for everything you write in this course.
        </p>
        {children}
      </div>
    </div>
  );
}
