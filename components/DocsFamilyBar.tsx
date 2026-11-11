import Link from 'next/link';
import { DOCS_FAMILY } from '../lib/docs-family';

// The family switcher at the top of every /docs/<set> page. One Docs tab in
// the nav leads here; this bar moves between the reference sets, with the
// current set highlighted and the others one click away.
export default function DocsFamilyBar({ currentId }: { currentId: string }) {
  return (
    <div
      className="docs-family-bar"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 16px',
        background: 'var(--c-deep2)',
        borderBottom: '1px solid var(--c-line)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Link
        href="/docs"
        className="docs-family-home"
        style={{
          color: 'var(--c-comment)',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          marginRight: 8,
        }}
      >
        Docs
      </Link>
      {DOCS_FAMILY.map((m) => {
        const active = m.id === currentId;
        return (
          <Link
            key={m.id}
            href={`/docs/${m.id}/${m.rootSection}`}
            aria-current={active ? 'page' : undefined}
            className="docs-family-tab"
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              background: active ? 'var(--c-purple)' : 'transparent',
              color: active ? 'var(--c-deep2)' : 'var(--c-purple)',
              border: '1px solid var(--c-purple)',
            }}
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
