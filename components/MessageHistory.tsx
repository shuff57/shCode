'use client';

// What a teacher sees under a message a student changed or deleted (migration 0056): the ORIGINAL as it was first
// sent, and every version between it and the words now. Only the class's teachers are ever sent `history`, so
// this renders nothing for anyone else (a student sees just "(edited)" or "Message deleted", drawn by the caller).
// A native <details>, so it opens from the keyboard and reads right with a screen reader.

interface Props {
  /** Earlier versions, oldest first; the first is the original. Absent or empty = never changed. */
  history?: { body: string; at: number }[];
  /** The author deleted the message (the words in the row above are what they had). */
  deleted?: boolean;
}

function clock(ms: number): string {
  try {
    return new Date(ms).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function MessageHistory({ history, deleted }: Props) {
  if (!history?.length && !deleted) return null;
  const n = history?.length ?? 0;
  return (
    <details data-testid="message-history" style={{ marginTop: 3, fontSize: 11, color: 'var(--c-meta)' }}>
      <summary style={{ cursor: 'pointer', color: 'var(--c-orange)' }}>
        {deleted ? 'Deleted by its author' : 'Edited'}
        {n > 0 && ` · ${n === 1 ? 'show the original' : `show the original and ${n - 1} other earlier version${n === 2 ? '' : 's'}`}`}
      </summary>
      {n > 0 && (
        <ol style={{ margin: '4px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {history!.map((h, i) => (
            <li key={`${h.at}-${i}`} style={{ borderLeft: '2px solid var(--c-line)', paddingLeft: 8 }}>
              <div style={{ color: 'var(--c-dim)' }}>{i === 0 ? 'Original' : `Version ${i + 1}`} · replaced {clock(h.at)}</div>
              <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--c-fg)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{h.body}</div>
            </li>
          ))}
        </ol>
      )}
      {deleted && n === 0 && <p style={{ margin: '4px 0 0' }}>The words above are what they sent. Classmates see &ldquo;Message deleted&rdquo;.</p>}
    </details>
  );
}
