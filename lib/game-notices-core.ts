// The notification bell (#112): what classmates did that concerns you, in the Games library.
//
//   change   the newest thing someone else did in a proposed-change conversation you are in (your game,
//            your proposal, or one you commented in): proposed it, commented, accepted, said no thanks...
//   comment  a classmate's comment on your game, or a reply to a comment thread you wrote in
//
// GET /api/notifications (functions/api/notifications.ts) sends the items; the words and the "unread" rule
// are here, pure, so the bell and scripts/test-game-notices.mjs agree. Your own actions are never items.

import { eventText, isChangeEvent } from './game-flow-core';

export type NoticeItem =
  | {
      kind: 'change';
      key: string;          // 'change:<change id>'
      changeId: string;
      targetId: string;     // the conversation entry to scroll to
      gameId: string;
      game: string;
      title: string;        // the proposal's title
      who: string;          // first name + last initial
      event: string;        // 'comment' or a ChangeEvent id
      extra: number | null;
      snippet: string;      // a comment's first words, '' for an event
      waiting: boolean;     // an open proposal to your own game
      at: number;
    }
  | {
      kind: 'comment';
      key: string;          // 'comment:<comment id>'
      commentId: string;
      gameId: string;
      game: string;
      who: string;
      reply: boolean;       // a reply rather than a top comment
      toMe: boolean;        // a reply to a comment you wrote
      myGame: boolean;
      snippet: string;
      at: number;
    };

/** How long something never opened on this computer still counts as unread (a new computer, a cleared browser). */
export const NOTICE_FRESH_MS = 7 * 24 * 3600_000;
/** The most items the bell lists. */
export const NOTICE_LIMIT = 30;
/** A snippet's length in characters. */
export const SNIPPET_MAX = 100;

export function snippetOf(body: string): string {
  const one = body.replace(/\s+/g, ' ').trim();
  return one.length > SNIPPET_MAX ? one.slice(0, SNIPPET_MAX - 1).trimEnd() + '…' : one;
}

/** Where the browser keeps what it has seen: conversations by change id, a game's comments by game id. */
export interface NoticeSeen {
  changes: Readonly<Record<string, number>>;
  games: Readonly<Record<string, number>>;
  /** "Mark all as read", or null when never pressed. */
  readAllAt: number | null;
}

/**
 * Unread when it happened after you last opened that conversation or that game's comments (or pressed
 * Mark all as read). Never opened on this computer: unread if it is a proposal still waiting on you, or
 * if it is from the last week, so an old history does not light up a new computer.
 */
export function isUnread(item: NoticeItem, seen: NoticeSeen, now: number): boolean {
  const last = item.kind === 'change' ? seen.changes[item.changeId] : seen.games[item.gameId];
  const floor = Math.max(last ?? -Infinity, seen.readAllAt ?? -Infinity);
  if (floor === -Infinity) return (item.kind === 'change' && item.waiting) || item.at > now - NOTICE_FRESH_MS;
  return item.at > floor;
}

export function unreadCount(items: readonly NoticeItem[], seen: NoticeSeen, now: number): number {
  return items.filter((i) => isUnread(i, seen, now)).length;
}

/** The sentence after the name, e.g. "proposed a change to Dodge". The bell shows the name in bold first. */
export function noticeAction(item: NoticeItem): string {
  if (item.kind === 'comment') {
    if (!item.reply) return `commented on your game ${item.game}`;
    if (item.toMe) return `replied to your comment on ${item.game}`;
    return item.myGame ? `replied to a comment on your game ${item.game}` : `replied in a conversation on ${item.game}`;
  }
  const on = `“${item.title}” (${item.game})`;
  if (item.event === 'comment') return `commented on ${on}`;
  if (item.event === 'opened') return `proposed a change to ${item.game}: “${item.title}”`;
  if (isChangeEvent(item.event)) {
    // eventText says "this change"; the bell names it.
    const full = eventText(item.event, item.who, item.extra);
    const rest = full.startsWith(item.who) ? full.slice(item.who.length).trim() : full;
    return `${rest.replace(/this change/, `the change ${on}`).replace(/the conversation/, `the conversation on ${on}`)}`;
  }
  return `did something on ${on}`;
}

/** The page an item opens, scrolled to the entry. */
export function noticeHref(item: NoticeItem): string {
  if (item.kind === 'change') return `/changes/?id=${encodeURIComponent(item.changeId)}#c-${encodeURIComponent(item.targetId)}`;
  return `/play/?game=${encodeURIComponent(item.gameId)}#comment-${encodeURIComponent(item.commentId)}`;
}
