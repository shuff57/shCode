import Link from 'next/link';

// The docs hub — what the nav's single Docs tab lands on. It is a door to
// the family: each reference set gets a card, and every set's pages carry a
// switcher at the top to move between them. The links are written out in
// full rather than mapped from a registry because this is a static export —
// literal hrefs survive prerendering and greps alike.
export default function DocsIndex() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 20px', color: '#f8f8f2' }}>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 8 }}>Docs</h1>
      <p style={{ color: '#888', marginBottom: 28 }}>
        The reference for everything you write in this course. Pick a set — the pages inside
        each one switch between the others at the top.
      </p>
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
          href="/docs/js/values"
          style={{ color: '#bd93f9', fontWeight: 600, fontSize: '1.05rem', textDecoration: 'none' }}
        >
          JavaScript →
        </Link>
        <p style={{ color: '#888', fontSize: 14, margin: '6px 0 0' }}>
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
        <p style={{ color: '#888', fontSize: 14, margin: '6px 0 0' }}>
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
        <p style={{ color: '#888', fontSize: 14, margin: '6px 0 0' }}>
          Solid modelling — the plain-words layer over JSCAD.
        </p>
      </div>
    </main>
  );
}
