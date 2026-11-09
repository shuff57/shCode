import Link from 'next/link';
import { sections } from '../../lib/js-docs';

// The docs hub — what the nav's single Docs tab lands on. It is a door to
// the family: each reference set gets a card, and every set's pages carry a
// switcher at the top to move between them. The links are written out in
// full rather than mapped from a registry because this is a static export —
// literal hrefs survive prerendering and greps alike.
export default function DocsIndex() {
  return (
    <main className="docs-hub page-frame" style={{ maxWidth: 1120, width: '100%', margin: '0 auto', padding: '28px 20px', color: 'var(--c-fg)' }}>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Docs</h1>
      <p style={{ color: 'var(--c-meta)', marginBottom: 24 }}>
        The reference for everything you write in this course. Pick a set — the pages inside
        each one switch between the others at the top.
      </p>
      <div
        style={{
        border: '1px solid var(--c-purple)',
          borderRadius: 8,
          padding: 20,
          marginBottom: 16,
          background: 'linear-gradient(110deg, var(--x-302b42), var(--c-bg))',
        }}
      >
        <Link
          href="/docs/js/values"
          style={{ color: 'var(--c-purple)', fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none' }}
        >
          <span style={{ display: 'inline-block', color: 'var(--c-green)', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', marginBottom: 6 }}>START HERE</span><br />
          JavaScript →
        </Link>
        <p style={{ color: 'var(--c-meta)', fontSize: 14, margin: '6px 0 0' }}>
          The basics — values, variables, conditionals, loops, functions, arrays, objects, JSON.
        </p>
      </div>
      <div
        style={{
          border: '1px solid var(--c-line)',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 16,
          background: 'var(--c-bg)',
        }}
      >
        <Link
          href="/docs/moshion/overview"
          style={{ color: 'var(--c-purple)', fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none' }}
        >
          moSHion →
        </Link>
        <p style={{ color: 'var(--c-meta)', fontSize: 14, margin: '6px 0 0' }}>
          The game engine — sprites, physics, collisions, groups, the canvas.
        </p>
      </div>
      <div
        style={{
          border: '1px solid var(--c-line)',
          borderRadius: 8,
          padding: '16px 20px',
          background: 'var(--c-bg)',
        }}
      >
        <Link
          href="/docs/reshape/overview"
          style={{ color: 'var(--c-purple)', fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none' }}
        >
          reSHape →
        </Link>
        <p style={{ color: 'var(--c-meta)', fontSize: 14, margin: '6px 0 0' }}>
          Solid modelling — reSHape Script on the B-rep kernel.
        </p>
      </div>
      <section className="docs-hub-topics" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 18, margin: '0 0 12px' }}>Jump to a topic</h2>
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
