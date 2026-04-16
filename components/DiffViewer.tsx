'use client';

interface DiffViewerProps {
  original: string;
  modified: string;
  language?: string;
}

export default function DiffViewer({ original, modified }: DiffViewerProps) {
  return (
    <div className="diff-viewer" style={{ display: 'flex', gap: 0, height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, overflow: 'auto', borderRight: '1px solid var(--border)' }}>
        <div style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#888', background: 'var(--muted)' }}>Before</div>
        <pre style={{ margin: 0, padding: 8, fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: '#d4d4d4' }}>{original}</pre>
      </div>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#888', background: 'var(--muted)' }}>After</div>
        <pre style={{ margin: 0, padding: 8, fontSize: '0.85rem', whiteSpace: 'pre-wrap', color: '#d4d4d4' }}>{modified}</pre>
      </div>
    </div>
  );
}
