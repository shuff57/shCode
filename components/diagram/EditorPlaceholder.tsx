'use client';

// Stand-in shown while the lazily-loaded React Flow chunk arrives. Same frame
// and roughly the same height as the real canvas so the page doesn't jump.

export default function EditorPlaceholder({ height = 480 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        border: '1px solid #44475a',
        borderRadius: 10,
        background: '#21222c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#6272a4',
        fontSize: 13,
      }}
    >
      Loading diagram editor…
    </div>
  );
}
