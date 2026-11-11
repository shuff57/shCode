'use client';

import { useEffect, useState } from 'react';
import { useFeedback } from './FeedbackProvider';
import { errorText } from '../lib/http-error';
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

// To the minute, never seconds (system pass rule 3).
function formatTs(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnouncementsPanel({ classId }: Props) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, confirm } = useFeedback();
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
          const msg = await errorText(res);
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
        const msg = await errorText(res);
        throw new Error(msg || `${res.status}`);
      }

      setContent('');
      setPinned(false);
      setRefreshKey((k) => k + 1);
      toast('Announcement posted. Students see it on their page.');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to post announcement');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Delete this announcement?',
      message: 'Students stop seeing it right away. This cannot be undone.',
      confirmLabel: 'Delete announcement',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/announcements`, {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const msg = await errorText(res);
        throw new Error(msg || `${res.status}`);
      }

      setRefreshKey((k) => k + 1);
      toast('Announcement deleted.');
    } catch {
      // The item stays in the list, and the teacher is told, instead of the click doing nothing.
      toast('Could not delete that announcement. It is still showing.', { kind: 'error' });
    }
  }

  if (loading) {
    return (
      <div style={{ color: 'var(--c-meta)', fontStyle: 'italic', padding: 16, fontFamily: 'var(--font-prose)', fontSize: 14 }}>
        Loading announcements...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: 'var(--c-red)', padding: 16, fontFamily: 'var(--font-prose)', fontSize: 14 }}>
        Failed to load: {error}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Create form: flat inside the card (one container per thing), its label above the field. */}
      <form
        onSubmit={handleCreate}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <label htmlFor="announcement-content" style={{ fontFamily: 'var(--font-prose)', fontWeight: 600, color: 'var(--c-fg)', fontSize: 14, marginBottom: -6 }}>
          New Announcement
        </label>

        <textarea
          id="announcement-content"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your announcement..."
          disabled={submitting}
          className="teacher-field"
          // The same inset field surface as the grading weights: darker than the card, a visible border.
          style={{
            width: '100%',
            background: 'color-mix(in srgb, var(--c-deep) 50%, var(--x-151515))',
            color: 'var(--c-fg)',
            border: '1px solid var(--c-comment)',
            borderRadius: 4,
            padding: '8px 12px',
            fontSize: 15,
            lineHeight: 1.5,
            fontFamily: 'var(--font-prose)',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="checkbox"
            id="announcement-pinned"
            checked={pinned}
            onChange={(e) => setPinned(e.target.checked)}
            disabled={submitting}
            style={{ accentColor: 'var(--c-purple)' }}
          />
          <label htmlFor="announcement-pinned" style={{ fontFamily: 'var(--font-prose)', fontSize: 14, color: 'var(--c-fg)', cursor: 'pointer' }}>
            Pin this announcement
          </label>
          {/* Post ends the pin row, so the composer is one line shorter and Post stays in view. */}
          {/* Disabled until there is something to post: a grey fill with readable text (not a faded green
              that still reads as pressable, and not an outline that reads as enabled). */}
          <button
            type="submit"
            disabled={submitting || content.trim() === ''}
            title={content.trim() === '' ? 'Write the announcement first' : undefined}
            style={{
              // Empty: the same disabled look as every teacher button on this tab (S.btnDisabled in
              // app/teacher/page.tsx: line fill, meta text, >= 4.5:1, no outline) (climb4 r6).
              background: content.trim() === '' ? 'var(--c-line)' : 'var(--c-green)',
              color: content.trim() === '' ? 'var(--c-meta)' : 'var(--c-bg)',
              border: 'none',
              borderRadius: 4,
              padding: '4px 20px',
              height: 36,
              boxSizing: 'border-box',
              marginLeft: 'auto',
              fontWeight: 600,
              fontSize: 14,
              cursor: submitting || content.trim() === '' ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Posting...' : 'Post'}
          </button>
        </div>
        {createError && (
          <span style={{ color: 'var(--c-red)', fontFamily: 'var(--font-prose)', fontSize: 13 }}>{createError}</span>
        )}
      </form>

      {/* Existing announcements */}
      {announcements.length === 0 ? (
        <div style={{ color: 'var(--c-meta)', fontFamily: 'var(--font-prose)', fontSize: 15, paddingTop: 12, borderTop: '1px solid var(--c-line)' }}>
          No announcements yet.
        </div>
      ) : (
        announcements.map((a) => (
          <div
            key={a.id}
            // A divider between posts, not a bordered box inside the card (rule 6).
            style={{
              borderTop: '1px solid var(--c-line)',
              paddingTop: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                {a.pinned && (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      background: 'var(--c-purple)',
                      color: 'var(--c-bg)',
                      padding: '4px 8px',
                      borderRadius: 3,
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                    }}
                  >
                    <Pin size={12} />
                    Pinned
                  </span>
                )}
                <span style={{ fontFamily: 'var(--font-prose)', fontSize: 13, color: 'var(--c-meta)' }}>
                  {a.author_email} &middot; {formatTs(a.created_at)}
                </span>
              </div>

              <button
                onClick={() => handleDelete(a.id)}
                aria-label="Delete announcement"
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--c-red)',
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
                color: 'var(--c-fg)',
                fontFamily: 'var(--font-prose)',
                fontSize: 15,
                lineHeight: 1.5,
                maxWidth: '70ch',
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
