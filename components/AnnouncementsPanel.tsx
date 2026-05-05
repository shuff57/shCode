'use client';

import { useEffect, useState } from 'react';
import { Pin, Trash2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Announcement {
  id: string;
  content: string;
  author_email: string;
  created_at: number;
  pinned: boolean;
}

interface Props {
  classId: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTs(ts: number): string {
  return new Date(ts).toLocaleString();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnouncementsPanel({ classId }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Create form state
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/classes/${encodeURIComponent(classId)}/announcements`, {
      credentials: 'same-origin',
    })
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text().catch(() => 'Unknown error');
          throw new Error(msg || `${res.status}`);
        }
        return res.json();
      })
      .then((json: { announcements: Announcement[] }) => {
        if (mounted) setAnnouncements(json.announcements);
      })
      .catch((err: Error) => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [classId, refreshKey]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      setCreateError('Announcement content cannot be empty.');
      return;
    }

    setSubmitting(true);
    setCreateError(null);

    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/announcements`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: trimmed, pinned }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => 'Unknown error');
        throw new Error(msg || `${res.status}`);
      }

      setContent('');
      setPinned(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/announcements`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => 'Unknown error');
        throw new Error(msg || `${res.status}`);
      }

      setRefreshKey((k) => k + 1);
    } catch {
      // Silently fail — the item just stays in the list
    }
  }

  if (loading) {
    return (
      <div style={{ color: '#6272a4', fontStyle: 'italic', padding: 16, fontSize: '0.88rem' }}>
        Loading announcements...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: '#ff5555', padding: 16, fontSize: '0.88rem' }}>
        Failed to load: {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Create form */}
      <form
        onSubmit={handleCreate}
        style={{
          background: '#1e1f29',
          border: '1px solid #44475a',
          borderRadius: 6,
          padding: 14,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 600, color: '#f8f8f2', fontSize: '0.9rem' }}>
          New Announcement
        </div>

        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your announcement..."
          disabled={submitting}
          style={{
            width: '100%',
            background: '#282a36',
            color: '#f8f8f2',
            border: '1px solid #44475a',
            borderRadius: 4,
            padding: '10px 12px',
            fontSize: '0.85rem',
            fontFamily: 'inherit',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="announcement-pinned"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            disabled={submitting}
            style={{ accentColor: '#bd93f9' }}
          />
          <label htmlFor="announcement-pinned" style={{ fontSize: '0.84rem', color: '#f8f8f2', cursor: 'pointer' }}>
            Pin this announcement
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: '#50fa7b',
              color: '#282a36',
              border: 'none',
              borderRadius: 4,
              padding: '8px 20px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>

          {createError && (
            <span style={{ color: '#ff5555', fontSize: '0.84rem' }}>{createError}</span>
          )}
        </div>
      </form>

      {/* Existing announcements */}
      {announcements.length === 0 ? (
        <div style={{ color: '#6272a4', fontSize: '0.88rem', padding: 8 }}>
          No announcements yet.
        </div>
      ) : (
        announcements.map((a) => (
          <div
            key={a.id}
            style={{
              background: '#1e1f29',
              border: '1px solid #44475a',
              borderRadius: 6,
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {a.pinned && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      background: '#bd93f9',
                      color: '#282a36',
                      padding: '1px 8px',
                      borderRadius: 3,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    <Pin size={12} />
                    Pinned
                  </span>
                )}
                <span style={{ fontSize: '0.78rem', color: '#6272a4' }}>
                  {a.author_email} &middot; {formatTs(a.created_at)}
                </span>
              </div>

              <button
                onClick={() => handleDelete(a.id)}
                aria-label="Delete announcement"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ff5555',
                  cursor: 'pointer',
                  padding: 2,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>

            <div
              style={{
                color: '#f8f8f2',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
              }}
            >
              {a.content}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
