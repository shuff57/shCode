import Link from 'next/link';
import { sections } from '../../lib/js-docs';
import DocsHubSearch from '../../components/DocsHubSearch';

// The docs hub — what the nav's single Docs tab lands on. It is a door to
// the family: each reference set gets a card, and every set's pages carry a
// switcher at the top to move between them. The links are written out in
// full rather than mapped from a registry because this is a static export —
// literal hrefs survive prerendering and greps alike.
export default function DocsIndex() {
  return (
    <main className="docs-hub page-frame" style={{ maxWidth: 1120, width: '100%', margin: '0 auto', padding: '28px 20px', color: 'var(--c-fg)' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Docs</h1>
      <DocsHubSearch />
      <h2 className="docs-hub-sets-label">Reference sets</h2>
      {/* Three equal cards (climb4 r9 S11): the whole card is the link (globals.css r7 S13a), and each
          says so with a visible "Open" at its right edge. JavaScript carries a small "Start here" tag. */}
      <div className="docs-set-card">
        <Link href="/docs/js/values" className="docs-set-link">
          <span className="docs-set-name">JavaScript</span>
        </Link>
        <span className="docs-set-start">Start here</span>
        <span className="docs-set-open" aria-hidden="true">Open <span>→</span></span>
        <p>The basics: values, variables, conditionals, loops, functions, arrays, objects, JSON.</p>
      </div>
      <div className="docs-set-card">
        <Link href="/docs/moshion/overview" className="docs-set-link">
          <span className="docs-set-name">moSHion</span>
        </Link>
        <span />
        <span className="docs-set-open" aria-hidden="true">Open <span>→</span></span>
        <p>The game engine: sprites, physics, collisions, groups, the canvas.</p>
      </div>
      <div className="docs-set-card">
        <Link href="/docs/reshape/overview" className="docs-set-link">
          <span className="docs-set-name">reSHape</span>
        </Link>
        <span />
        <span className="docs-set-open" aria-hidden="true">Open <span>→</span></span>
        <p>Solid modelling: reSHape Script on the B-rep kernel.</p>
      </div>
      <section className="docs-hub-topics" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Jump to a JavaScript topic</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8 }}>
          {sections.map((section) => (
            <Link key={section.slug} href={`/docs/js/${section.slug}`} className="docs-topic-tile" style={{ padding: '12px 16px', border: '1px solid var(--c-line)', borderRadius: 6, color: 'var(--c-cyan)', textDecoration: 'none', background: 'var(--c-bg)' }}>
              <span>{section.title}</span><span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
