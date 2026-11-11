'use client';

// Shared look for the Games library's change flow (lib/game-flow-core.ts): the status pill, the small
// "On GitHub this is called..." line, and the buttons. Inline styles on the theme's CSS variables, like
// the rest of the Library.

import type { CSSProperties, ReactNode } from 'react';
import { STATUS_TEXT, type ChangeStatus } from '../lib/game-flow-core';

export const flowBtn: CSSProperties = {
  fontSize: 13, padding: '6px 12px', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap',
  background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)', textDecoration: 'none',
  display: 'inline-flex', alignItems: 'center', gap: 5,
};
export const flowPrimary: CSSProperties = {
  ...flowBtn, background: 'var(--c-green)', color: 'var(--c-deep)', border: '1px solid var(--c-green)', fontWeight: 600,
};
export const flowDanger: CSSProperties = { ...flowBtn, color: 'var(--c-red)' };
export const flowLink: CSSProperties = { color: 'var(--c-cyan)', fontSize: 13 };
export const flowCard: CSSProperties = {
  border: '1px solid var(--c-line)', borderRadius: 6, background: 'var(--c-deep2)', padding: '10px 12px',
};
export const flowInput: CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '6px 8px', borderRadius: 4, fontSize: 13,
  background: 'var(--c-deep)', color: 'var(--c-fg)', border: '1px solid var(--c-line)', fontFamily: 'inherit',
};

const PILL: Record<ChangeStatus, string> = {
  open: 'var(--c-green)',
  accepted: 'var(--c-purple)',
  declined: 'var(--c-dim)',
  withdrawn: 'var(--c-dim)',
  removed: 'var(--c-red)',
  closed: 'var(--c-dim)',
};

export function StatusPill({ status, locked }: { status: ChangeStatus; locked?: boolean }) {
  const c = PILL[status];
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <span style={{
        fontSize: 12, fontWeight: 600, padding: '1px 8px', borderRadius: 999, whiteSpace: 'nowrap',
        color: c, border: `1px solid color-mix(in srgb, ${c} 60%, transparent)`, background: `color-mix(in srgb, ${c} 12%, transparent)`,
      }}>
        {STATUS_TEXT[status]}
      </span>
      {locked && <span style={{ fontSize: 12, color: 'var(--c-dim)', whiteSpace: 'nowrap' }}>conversation closed</span>}
    </span>
  );
}

/** The one small line per panel that names the GitHub word. */
export function GitHubWord({ children }: { children: ReactNode }) {
  return <p style={{ fontSize: 12, color: 'var(--c-dim)', margin: '4px 0 0', fontStyle: 'italic' }}>{children}</p>;
}

export function NewBadge() {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-deep)', background: 'var(--c-orange)', borderRadius: 999, padding: '0 6px' }}>
      new
    </span>
  );
}

/** "+3 −1" in green and red. */
export function SizeBadge({ size }: { size: { added: number; removed: number } }) {
  return (
    <span style={{ fontSize: 12, fontFamily: 'var(--font-mono, monospace)', whiteSpace: 'nowrap' }}>
      <span style={{ color: 'var(--c-green)' }}>+{size.added}</span>{' '}
      <span style={{ color: 'var(--c-red)' }}>−{size.removed}</span>
    </span>
  );
}

/** A diff box's height: as tall as the longer side's code (about 20 px a line plus its header), at most `max`. */
export function diffHeight(a: string, b: string, max = 520): number {
  const lines = Math.max(a.split('\n').length, b.split('\n').length);
  return Math.max(120, Math.min(max, 44 + lines * 20));
}
