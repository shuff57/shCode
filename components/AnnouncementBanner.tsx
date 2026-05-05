'use client';

import { useEffect, useState } from 'react';
import { Pin, X } from 'lucide-react';
import { getCurrentUser } from '../lib/auth';
import type { CurrentUser } from '../lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Enrollment {
  class_id: string;
  class_name: string;
  role: string;
}

interface Announcement {
  id: string;
  content: string;
  author_email: string;
  created_at: number;
  pinned: boolean;
  class_id: string;
  class_name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DISMISSED_KEY = 'shcode-dismissed-announcements';

function getDismissed(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((v): v is string => typeof v === 'string');
    return [];
  } catch {
    return [];
  }
}

function addDismissed(id: string): void {
  const current = getDismissed();
  if (!current.includes(id)) {
    current.push(id);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(current));
  }
}

function formatTs(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnouncementBanner() {
  const [banners, setBanners] = useState<Announcement[]>([]);
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissed);

  // Fetch user on mount
  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => setUser(null));
  }, []);

  // Fetch enrollments, then announcements from each class
  useEffect(() => {
    if (user === undefined || user === null) return;

    let mounted = true;

    async function load() {
      try {
        // Fetch active enrollments
        const enrollRes = await fetch('/api/my-enrollments', {
          credentials: 'same-origin',
        });
        if (!enrollRes.ok) return;
        const enrollData = (await enrollRes.json()) as { enrollments: Enrollment[] };
        const enrollments = enrollData.enrollments ?? [];

        // Fetch announcements from each class in parallel
        const results = await Promise.allSettled(
          enrollments.map(async (enr) => {
            const res = await fetch(
              `/api/classes/${encodeURIComponent(enr.class_id)}/announcements`,
              { credentials: 'same-origin' },
            );
            if (!res.ok) return [];
            const listData = (await res.json()) as { announcements: Announcement[] };
            const list = listData.announcements ?? [];
            // Stamp class info for display
            return list.map((a) => ({
              ...a,
              class_id: enr.class_id,
              class_name: enr.class_name,
            }));
          }),
        );

        const allAnnouncements: Announcement[] = [];
        for (const result of results) {
          if (result.status === 'fulfilled') {
            allAnnouncements.push(...result.value);
          }
        }

        if (mounted) {
          // Only show pinned, non-dismissed announcements
          const visible = allAnnouncements.filter(
            (a) => a.pinned && !dismissedIds.includes(a.id),
          );
          setBanners(visible);
        }
      } catch {
        // Silently fail — banner just won't show
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [user, dismissedIds]);

  function handleDismiss(id: string) {
    addDismissed(id);
    setDismissedIds((prev) => [...prev, id]);
    setBanners((prev) => prev.filter((a) => a.id !== id));
  }

  // Nothing to show
  if (banners.length === 0) return null;

  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      {banners.map((a) => (
        <div
          key={a.id}
          role="status"
          aria-live="polite"
          style={{
            background: '#282a36',
            borderBottom: '2px solid #bd93f9',
            color: '#f8f8f2',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            fontSize: '0.85rem',
            lineHeight: 1.45,
          }}
        >
          <Pin
            size={16}
            style={{ color: '#bd93f9', flexShrink: 0, marginTop: 1 }}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {a.content}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6272a4', marginTop: 4 }}>
              {a.class_name} &middot; {a.author_email} &middot; {formatTs(a.created_at)}
            </div>
          </div>

          <button
            onClick={() => handleDismiss(a.id)}
            aria-label="Dismiss announcement"
            style={{
              background: 'none',
              border: 'none',
              color: '#6272a4',
              cursor: 'pointer',
              padding: 2,
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
