import Link from 'next/link';
import { sections } from '../../lib/js-docs';

// The docs hub — what the nav's single Docs tab lands on. It is a door to
// the family: each reference set gets a card, and every set's pages carry a
// switcher at the top to move between them. The links are written out in
// full rather than mapped from a registry because this is a static export —
// literal hrefs survive prerendering and greps alike.
export default function DocsIndex() {
  return (
    <main style={{ maxWidth: 1120, width: '100%', margin: '0 auto', padding: '28px 20px', color: '#f8f8f2' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 8 }}>Docs</h1>
      <p style={{ color: '#8393c4', marginBottom: 28 }}>
        The reference for everything you write in this course. Pick a set — the pages inside
        each one switch between the others at the top.
      </p>
      <div
        style={{
        border: '1px solid #bd93f9',
          borderRadius: 8,
          padding: '22px 24px',
          marginBottom: 14,
          background: 'linear-gradient(110deg, #302b42, #282a36)',
        }}
      >
        <Link
          href="/docs/js/values"
          style={{ color: '#bd93f9', fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none' }}
        >
          <span style={{ display: 'inline-block', color: '#50fa7b', fontSize: 11, fontWeight: 700, letterSpacing: '.08em', marginBottom: 6 }}>START HERE</span><br />
          JavaScript →
        </Link>
        <p style={{ color: '#8393c4', fontSize: 14, margin: '6px 0 0' }}>
          The basics — values, variables, conditionals, loops, functions, arrays, objects, JSON.
        </p>
      </div>
      <div
        style={{
          border: '1px solid #44475a',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 14,
          background: '#282a36',
        }}
      >
        <Link
          href="/docs/moshion/overview"
          style={{ color: '#bd93f9', fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none' }}
        >
          moSHion →
        </Link>
        <p style={{ color: '#8393c4', fontSize: 14, margin: '6px 0 0' }}>
          The game engine — sprites, physics, collisions, groups, the canvas.
        </p>
      </div>
      <div
        style={{
          border: '1px solid #44475a',
          borderRadius: 8,
          padding: '16px 20px',
          background: '#282a36',
        }}
      >
        <Link
          href="/docs/reshape/overview"
          style={{ color: '#bd93f9', fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none' }}
        >
          reSHape →
        </Link>
        <p style={{ color: '#8393c4', fontSize: 14, margin: '6px 0 0' }}>
          Solid modelling — reSHape Script on the B-rep kernel.
        </p>
      </div>
      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: 20, margin: '0 0 12px' }}>Jump to a topic</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
          {sections.map((section) => (
            <Link key={section.slug} href={`/docs/js/${section.slug}`} style={{ padding: '12px 14px', border: '1px solid #44475a', borderRadius: 6, color: '#8be9fd', textDecoration: 'none', background: '#282a36' }}>
              {section.title} →
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
