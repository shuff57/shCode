'use client';

// Side-by-side diff with Dracula-tinted add/remove backgrounds and a
// tiny JS-aware syntax highlighter (regex-based — fine for student code).
// The two sides are aligned line-by-line: when one side has no matching
// line, a placeholder keeps the columns in sync so adds/removes line up
// across the gutter.

import { diffLines, type Change } from 'diff';
import { Fragment, useMemo, type ReactNode } from 'react';

interface DiffViewerProps {
  original: string;
  modified: string;
  language?: string; // reserved for future multi-language support
}

// ---- Colors (Dracula) ----
const C = {
  bg: '#282a36',
  fg: '#f8f8f2',
  muted: '#6272a4',
  border: '#44475a',
  addBg: 'rgba(80,250,123,0.18)',
  addBar: '#50fa7b',
  delBg: 'rgba(255,85,85,0.18)',
  delBar: '#ff5555',
  gutter: '#21222c',
  keyword: '#ff79c6',
  string: '#f1fa8c',
  number: '#bd93f9',
  comment: '#6272a4',
  func: '#50fa7b',
  type: '#8be9fd',
  punct: '#f8f8f2',
};

// Tiny JS tokenizer. Order matters in the alternation: comments and
// string literals first so their inner chars don't get re-tokenized.
const TOKEN_RE =
  /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)|(\b\d[\d_.eE+-]*\b)|(\b(?:var|let|const|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|new|this|super|import|export|from|as|async|await|yield|try|catch|finally|throw|typeof|instanceof|in|of|null|undefined|true|false|void|delete|debugger)\b)|(\b[A-Z][\w$]*\b)|(\b[a-z_$][\w$]*)(?=\s*\()|([{}()[\];,.+\-*/%=<>!&|?:~^])/g;

// Returns an array of React nodes — text and styled spans — so the caller
// can render with plain JSX instead of dangerouslySetInnerHTML. React
// escapes string children automatically, so no manual HTML-escape is
// needed here.
function highlightJs(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  let lastIdx = 0;
  let key = 0;
  for (const m of src.matchAll(TOKEN_RE)) {
    const idx = m.index ?? 0;
    if (idx > lastIdx) out.push(src.slice(lastIdx, idx));
    const [, comment, string, num, kw, type, fn, punct] = m;
    let color: string | null = null;
    let italic = false;
    if (comment) { color = C.comment; italic = true; }
    else if (string) color = C.string;
    else if (num) color = C.number;
    else if (kw) color = C.keyword;
    else if (type) color = C.type;
    else if (fn) color = C.func;
    else if (punct) color = C.punct;
    if (color) {
      out.push(
        <span key={key++} style={italic ? { color, fontStyle: 'italic' } : { color }}>
          {m[0]}
        </span>,
      );
    } else {
      out.push(m[0]);
    }
    lastIdx = idx + m[0].length;
  }
  if (lastIdx < src.length) out.push(src.slice(lastIdx));
  return out;
}

// ---- Diff row model ----
type Row = { kind: 'del' | 'add' | 'context' | 'pad'; content: string };

function rowsFromChanges(changes: Change[]): { left: Row[]; right: Row[] } {
  const left: Row[] = [];
  const right: Row[] = [];
  for (let i = 0; i < changes.length; i++) {
    const cur = changes[i];
    if (!cur.added && !cur.removed) {
      const lines = cur.value.split('\n');
      if (lines[lines.length - 1] === '') lines.pop();
      for (const line of lines) {
        left.push({ kind: 'context', content: line });
        right.push({ kind: 'context', content: line });
      }
      continue;
    }
    if (cur.removed) {
      const delLines = cur.value.split('\n');
      if (delLines[delLines.length - 1] === '') delLines.pop();
      const nxt = changes[i + 1];
      if (nxt && nxt.added) {
        const addLines = nxt.value.split('\n');
        if (addLines[addLines.length - 1] === '') addLines.pop();
        const len = Math.max(delLines.length, addLines.length);
        for (let j = 0; j < len; j++) {
          left.push(
            j < delLines.length ? { kind: 'del', content: delLines[j] } : { kind: 'pad', content: '' },
          );
          right.push(
            j < addLines.length ? { kind: 'add', content: addLines[j] } : { kind: 'pad', content: '' },
          );
        }
        i++;
        continue;
      }
      for (const line of delLines) {
        left.push({ kind: 'del', content: line });
        right.push({ kind: 'pad', content: '' });
      }
      continue;
    }
    if (cur.added) {
      const addLines = cur.value.split('\n');
      if (addLines[addLines.length - 1] === '') addLines.pop();
      for (const line of addLines) {
        left.push({ kind: 'pad', content: '' });
        right.push({ kind: 'add', content: line });
      }
    }
  }
  return { left, right };
}

function rowStyle(kind: Row['kind']): React.CSSProperties {
  switch (kind) {
    case 'add': return { background: C.addBg, borderLeft: `3px solid ${C.addBar}` };
    case 'del': return { background: C.delBg, borderLeft: `3px solid ${C.delBar}` };
    case 'pad': return { background: '#1e1f29' };
    default: return { borderLeft: '3px solid transparent' };
  }
}

function rowPrefix(kind: Row['kind']): string {
  switch (kind) {
    case 'add': return '+';
    case 'del': return '−';
    case 'pad': return ' ';
    default: return ' ';
  }
}

function lineNumbers(rows: Row[]): (number | null)[] {
  const out: (number | null)[] = [];
  let n = 0;
  for (const r of rows) {
    if (r.kind === 'pad') out.push(null);
    else { n++; out.push(n); }
  }
  return out;
}

export default function DiffViewer({ original, modified }: DiffViewerProps) {
  const { left, right } = useMemo(() => {
    const changes = diffLines(original, modified);
    return rowsFromChanges(changes);
  }, [original, modified]);

  const leftNums = useMemo(() => lineNumbers(left), [left]);
  const rightNums = useMemo(() => lineNumbers(right), [right]);

  return (
    <div
      className="diff-viewer"
      style={{
        display: 'flex',
        gap: 0,
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        background: C.bg,
        color: C.fg,
        fontFamily: "'Fira Code', 'Consolas', 'Courier New', monospace",
        fontSize: 13,
        lineHeight: 1.5,
      }}
    >
      <Pane label="Before" rows={left} nums={leftNums} />
      <div style={{ width: 1, background: C.border, flexShrink: 0 }} />
      <Pane label="After" rows={right} nums={rightNums} />
    </div>
  );
}

function Pane({ label, rows, nums }: { label: string; rows: Row[]; nums: (number | null)[] }) {
  return (
    <div style={{ flex: 1, minWidth: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '6px 10px',
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: C.muted,
          background: C.gutter,
          borderBottom: `1px solid ${C.border}`,
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        {label}
      </div>
      <div>
        {rows.map((row, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              whiteSpace: 'pre',
              ...rowStyle(row.kind),
            }}
          >
            <span
              style={{
                width: 40,
                flexShrink: 0,
                textAlign: 'right',
                padding: '0 8px',
                color: C.muted,
                background: C.gutter,
                userSelect: 'none',
                borderRight: `1px solid ${C.border}`,
              }}
            >
              {nums[i] ?? ''}
            </span>
            <span
              style={{
                width: 16,
                flexShrink: 0,
                textAlign: 'center',
                color: row.kind === 'add' ? C.addBar : row.kind === 'del' ? C.delBar : C.muted,
                userSelect: 'none',
              }}
            >
              {rowPrefix(row.kind)}
            </span>
            <span style={{ flex: 1, padding: '0 8px' }}>
              {row.content === '' ? ' ' : <Fragment>{highlightJs(row.content)}</Fragment>}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
