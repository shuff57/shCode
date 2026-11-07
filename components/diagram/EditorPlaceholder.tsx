'use client';

// Stand-in shown while the lazily-loaded React Flow chunk arrives. Same frame
// and roughly the same height as the real canvas so the page doesn't jump.

export default function EditorPlaceholder({ height = 480 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        border: '1px solid var(--c-line)',
        borderRadius: 10,
        background: 'var(--c-deep2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--c-comment)',
        fontSize: 13,
      }}
    >
      Loading diagram editor…
    </div>
  );
}
