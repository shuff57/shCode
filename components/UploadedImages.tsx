'use client';

// "Uploaded images (N)" on the Library's Pictures tab: the images the student
// added through the editor's Images panel (components/ImageLibrary.tsx, the
// /api/uploads routes), each with its size, Copy link and Delete. Same client
// calls as that panel (lib/uploads.ts). Only for a signed-in account: uploads
// live on the server, never in the browser.

import { useCallback, useEffect, useRef, useState } from 'react';
import { UploadError, deleteUpload, formatBytes, listUploads, type UploadItem } from '../lib/uploads';
import { useFeedback } from './FeedbackProvider';
import { sectionHeading, sectionNote } from './library-ui';

const tile: React.CSSProperties = {
  padding: 8, borderRadius: 6, border: '1px solid var(--c-line)', background: 'var(--c-deep2)',
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 170,
};
const small: React.CSSProperties = {
  background: 'none', border: '1px solid var(--c-line)', borderRadius: 4, padding: '2px 8px', fontSize: 11, cursor: 'pointer',
};

export default function UploadedImages({ onMessage }: { onMessage?: (text: string, bad: boolean) => void }) {
  const { confirm } = useFeedback();
  const [items, setItems] = useState<UploadItem[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  // The page's onMessage is a new function each render; a ref keeps the list from refetching on every one.
  const say = useRef(onMessage);
  useEffect(() => { say.current = onMessage; });

  const refresh = useCallback(async () => {
    try {
      setItems((await listUploads()).uploads);
    } catch (e) {
      // Signed out (401) or uploads not set up: the section stays away.
      if (!(e instanceof UploadError) || e.status === 401 || e.status === 403) setItems(null);
      else say.current?.(e.message, true);
    }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  async function copy(it: UploadItem) {
    try {
      await navigator.clipboard.writeText(it.url);
      setCopied(it.id);
      setTimeout(() => setCopied((c) => (c === it.id ? null : c)), 1400);
    } catch {
      say.current?.('Could not copy. Select the link and copy it by hand.', true);
    }
  }

  async function remove(it: UploadItem) {
    if (!(await confirm({
      title: 'Delete this image?',
      message: 'Anything that uses its link will show a broken picture.',
      confirmLabel: 'Delete',
      danger: true,
    }))) return;
    setBusy(it.id);
    try {
      await deleteUpload(it.id);
      say.current?.(`Deleted ${it.filename}.`, false);
      await refresh();
    } catch (e) {
      say.current?.(e instanceof UploadError ? e.message : 'Could not delete that image.', true);
    } finally {
      setBusy(null);
    }
  }

  if (items === null) return null;
  return (
    <section aria-labelledby="uploads-h" style={{ marginTop: 18 }}>
      <h3 id="uploads-h" style={sectionHeading}>Uploaded images ({items.length})</h3>
      <p style={sectionNote}>
        Images you added with the editor&rsquo;s Images button. Use one in a sketch by its link, like{' '}
        <code style={{ color: 'var(--c-purple)' }}>sprite.image = &apos;/uploads/….png&apos;</code>. Anyone with the link can see it.
      </p>
      {items.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: 0 }}>No uploaded images.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map((it) => (
            <div key={it.id} style={tile}>
              <div style={{ width: 150, height: 80, display: 'grid', placeItems: 'center', background: 'var(--x-202020)', borderRadius: 4, overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={it.url} alt={it.filename} style={{ maxWidth: '100%', maxHeight: '100%' }} />
              </div>
              <span title={it.filename} style={{ fontSize: 11, maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.filename}</span>
              <span style={{ fontSize: 11, color: 'var(--c-dim)' }}>{formatBytes(it.bytes)}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" onClick={() => void copy(it)} aria-label={`Copy the link to ${it.filename}`}
                  style={{ ...small, color: 'var(--c-cyan)' }}>
                  {copied === it.id ? 'Copied' : 'Copy link'}
                </button>
                <button type="button" onClick={() => void remove(it)} disabled={busy === it.id} aria-label={`Delete ${it.filename}`}
                  style={{ ...small, color: 'var(--c-red)', cursor: busy === it.id ? 'wait' : 'pointer' }}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
