import DocsHub from '../../components/DocsHub';
import { libraryClasses as styles } from '../../components/library-ui';

export const metadata = { title: 'Docs — shCode' };

// The docs hub, what the nav's Docs link lands on. It wears the Library page's look (same
// width, heading, Explore rail and card grid; app/library/page.tsx) so the two "find things"
// pages read as one family. The rail and cards are components/DocsHub.tsx; every set's pages
// carry a switcher at the top (DocsFamilyBar) to move between the others.
export default function DocsIndex() {
  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', width: '100%' }}>
      <main className={`${styles.library} docs-hub-page`} style={{ padding: '4px 2px', color: 'var(--c-fg)' }}>
        <h1 style={{ fontSize: 24, letterSpacing: '-0.03em', margin: '0 0 5px' }}>Docs</h1>
        <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 24px', lineHeight: 1.5 }}>
          The reference for everything you write in this course.
        </p>
        <DocsHub />
      </main>
    </div>
  );
}
