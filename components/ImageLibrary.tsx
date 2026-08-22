'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  UploadError,
  UploadItem,
  UploadQuota,
  deleteUpload,
  formatBytes,
  listUploads,
  uploadImage,
} from '../lib/uploads';

// Inline styles using the Dracula palette, matching AuthButton / teacher page.
const C = {
  bg: '#282a36',
  panel: '#21222c',
  line: '#44475a',
  text: '#f8f8f2',
  dim: '#6272a4',
  accent: '#bd93f9',
  green: '#50fa7b',
  red: '#ff5555',
};

interface Props {
  onClose: () => void;
  /** Given the public URL of a chosen image, e.g. to paste into the editor. */
  onPick?: (url: string) => void;
}

export default function ImageLibrary({ onClose, onPick }: Props) {
  const [items, setItems] = useState<UploadItem[]>([]);
  const [quota, setQuota] = useState<UploadQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listUploads();
      setItems(data.uploads);
      setQuota(data.quota);
      setError(null);
    } catch (e) {
      setError(e instanceof UploadError ? e.message : 'Could not load your images.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Escape closes, like the other modals in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const send = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (!list.length) return;
      setBusy(true);
      setError(null);
      // Sequential, not Promise.all: the quota is checked per request, so
      // firing five at once can let all five pass a check that only four
      // should. Slower and correct beats faster and over-quota.
      for (const f of list) {
        try {
          await uploadImage(f);
        } catch (e) {
          setError(e instanceof UploadError ? e.message : `Could not upload ${f.name}.`);
          break;
        }
      }
      await refresh();
      setBusy(false);
    },
    [refresh],
  );

  async function remove(item: UploadItem) {
    if (!window.confirm(`Delete "${item.filename}"? Any sketch using it will show a broken image.`)) return;
    setBusy(true);
    try {
      await deleteUpload(item.id);
      await refresh();
    } catch (e) {
      setError(e instanceof UploadError ? e.message : 'Could not delete that image.');
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1400);
    } catch {
      setError('Could not copy — select the path and copy it by hand.');
    }
  }

  const pct = quota ? Math.min(100, Math.round((quota.bytes / quota.maxBytes) * 100)) : 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer?.files?.length) send(e.dataTransfer.files);
        }}
        style={{
          width: 'min(720px, 92vw)', maxHeight: '82vh', overflow: 'auto',
          background: C.bg, color: C.text, borderRadius: 10,
          border: `2px solid ${dragging ? C.green : C.line}`,
          padding: 20, fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>My images</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: C.dim, fontSize: 20, cursor: 'pointer' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <p style={{ color: C.dim, fontSize: 13, margin: '8px 0 14px' }}>
          Drop images here, or use the button. Click a path to copy it, then use it in a
          sketch: <code style={{ color: C.accent }}>sprite.image = &apos;/uploads/….png&apos;</code>
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            style={{
              background: C.accent, color: '#21222c', border: 'none', borderRadius: 6,
              padding: '8px 14px', fontWeight: 600, cursor: busy ? 'wait' : 'pointer',
            }}
          >
            {busy ? 'Working…' : 'Add images'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) send(e.target.files);
              e.target.value = '';
            }}
          />
          {quota && (
            <div style={{ flex: 1, fontSize: 12, color: C.dim }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{quota.files} / {quota.maxFiles} images</span>
                <span>{formatBytes(quota.bytes)} of {formatBytes(quota.maxBytes)}</span>
              </div>
              <div style={{ height: 4, background: C.line, borderRadius: 2, marginTop: 4 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: pct > 90 ? C.red : C.green, borderRadius: 2 }} />
              </div>
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: '#3a1f26', border: `1px solid ${C.red}`, color: '#ffb8b8',
                        borderRadius: 6, padding: '8px 12px', fontSize: 13, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {loading ? (
          <p style={{ color: C.dim }}>Loading…</p>
        ) : items.length === 0 ? (
          <p style={{ color: C.dim }}>No images yet.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {items.map((it) => (
              <div key={it.id} style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 8, padding: 8 }}>
                <div
                  style={{
                    height: 90, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: '#1a1b23', borderRadius: 4, overflow: 'hidden', marginBottom: 6,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={it.url} alt={it.filename} style={{ maxWidth: '100%', maxHeight: '100%' }} />
                </div>
                <div style={{ fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                     title={it.filename}>
                  {it.filename}
                </div>
                <div style={{ fontSize: 11, color: C.dim, marginBottom: 6 }}>{formatBytes(it.bytes)}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => (onPick ? onPick(it.url) : copy(it.url))}
                    style={{
                      flex: 1, background: 'none', border: `1px solid ${C.line}`, color: C.text,
                      borderRadius: 4, padding: '4px 6px', fontSize: 11, cursor: 'pointer',
                    }}
                  >
                    {copied === it.url ? 'Copied' : onPick ? 'Use' : 'Copy path'}
                  </button>
                  <button
                    onClick={() => remove(it)}
                    disabled={busy}
                    style={{
                      background: 'none', border: `1px solid ${C.line}`, color: C.red,
                      borderRadius: 4, padding: '4px 8px', fontSize: 11, cursor: 'pointer',
                    }}
                    aria-label={`Delete ${it.filename}`}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p style={{ color: C.dim, fontSize: 11, marginTop: 16, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
          Anyone who has the link to an image can view it, so don&apos;t upload anything private.
          PNG, JPEG, GIF and WebP only.
        </p>
      </div>
    </div>
  );
}
