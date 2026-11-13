// The notification bell's browser side (#112). Items come from GET /api/notifications; the words and the
// unread rule are lib/game-notices-core.ts. Kept apart from lib/game-flow-client.ts because the header
// carries the bell on every page and that module brings the sandbox and merge code with it.
//
// One fetch serves the page. It is asked again when the tab comes back into view (at most once a minute),
// when the bell is opened (if the last answer is over 15 s old) and after the person acts on a change.
// What has been read lives in this browser:
//   SEEN_KEY       when each proposed-change conversation was last opened (written by markSeen in
//                  lib/game-flow-client.ts when the conversation page loads)
//   GAMES_SEEN_KEY when each game's comments were last shown (markGameCommentsSeen, from GameComments)
//   READ_ALL_KEY   when "Mark all as read" was last pressed

import { unreadCount, type NoticeItem, type NoticeSeen } from './game-notices-core';
import { ownedLocal } from './owned-storage';

// Base keys under `w1:<owner>:` (lib/owned-storage.ts): what one account has read.
export const SEEN_KEY = 'game-changes-seen';
export const GAMES_SEEN_KEY = 'game-comments-seen';
export const READ_ALL_KEY = 'notices-read-all';
/** Fired when anything here is marked read, so the bell on the same page recounts. */
export const CHANGES_SEEN = 'shcode:game-changes-seen';
/** The same event name lib/game-flow-client.ts fires after any change to a proposal. */
export const CHANGES_CHANGED = 'shcode:game-changes-changed';

const TTL_MS = 60_000;
let items: NoticeItem[] | null = null;
let fetchedAt = 0;
let loading: Promise<void> | null = null;

export function readSeenMap(key: string): Record<string, number> {
  try {
    const v = ownedLocal.getJSON<Record<string, number>>(key);
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}
export function writeSeenMap(key: string, m: Record<string, number>): void {
  // Keep the newest 300.
  const keep = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 300);
  ownedLocal.setJSON(key, Object.fromEntries(keep)); // best effort
}
function announce() {
  try { window.dispatchEvent(new Event(CHANGES_SEEN)); } catch { /* no window */ }
}

export function noticeSeen(): NoticeSeen {
  let readAllAt: number | null = null;
  try { const v = Number(ownedLocal.getItem(READ_ALL_KEY)); readAllAt = Number.isFinite(v) && v > 0 ? v : null; } catch { /* none */ }
  return { changes: readSeenMap(SEEN_KEY), games: readSeenMap(GAMES_SEEN_KEY), readAllAt };
}

/** The items from the last answer, or null before one arrived (or when every try failed). */
export function noticeItems(): NoticeItem[] | null {
  return items;
}
export function noticeUnread(): number {
  return items ? unreadCount(items, noticeSeen(), Date.now()) : 0;
}

/** Ask the server again unless the last answer is younger than `maxAgeMs` (0 always asks). */
export function refreshNotices(maxAgeMs = TTL_MS): Promise<void> {
  if (loading) return loading;
  if (items && Date.now() - fetchedAt < maxAgeMs) return Promise.resolve();
  loading = fetch('/api/notifications', { credentials: 'same-origin' })
    .then(async (res) => {
      if (!res.ok) return;
      const body = (await res.json()) as { items?: NoticeItem[] };
      items = Array.isArray(body.items) ? body.items : [];
      fetchedAt = Date.now();
    })
    .catch(() => { /* offline: keep the last list */ })
    .finally(() => { loading = null; });
  return loading;
}

function stamp(key: string, id: string, at: number) {
  const m = readSeenMap(key);
  m[id] = Math.max(at, m[id] ?? 0);
  writeSeenMap(key, m);
}

/** A game's comments were shown: every comment on it up to now is read. */
export function markGameCommentsSeen(gameId: string, at = Date.now()): void {
  stamp(GAMES_SEEN_KEY, gameId, at);
  announce();
}

/** The bell's item was clicked: mark it read before the page changes. */
export function markNoticeRead(item: NoticeItem): void {
  if (item.kind === 'change') stamp(SEEN_KEY, item.changeId, Math.max(Date.now(), item.at));
  else stamp(GAMES_SEEN_KEY, item.gameId, Math.max(Date.now(), item.at));
  announce();
}

export function markAllNoticesRead(): void {
  ownedLocal.setItem(READ_ALL_KEY, String(Date.now()));
  announce();
}
