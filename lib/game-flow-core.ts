// The Games library's change flow: versions, proposed changes and their conversations
// (codehs-review/GAME-FLOW-SPEC.md, migration 0048). A small GitHub flow for beginners:
//
//   commit          Update game asks "What did you change?" and saves a version
//   log / revert    History, and Go back to this version (a NEW version; nothing is deleted)
//   fork            Remix (lib/games-client.ts, unchanged)
//   pull request    Propose this change: a classmate sends their sandbox code back to the game's maker
//   conversation    a thread on the proposal; the maker, the proposer and any classmate who can see the
//                   game can comment (owner decision 2026-11-10: free text, long, anyone can join)
//   merge / close   Accept (lib/game-merge.ts) or No thanks
//   sync fork       Bring in the newest version
//
// The buttons use plain words; each panel names the GitHub term once (GITHUB_WORD). These are the pure
// rules, shared by the routes (functions/api/game-changes/*, functions/api/games/*) and the browser, so
// the browser says the same thing the server refuses with. Tests: scripts/test-game-flow.mjs.

import { GAME_CODE_MAX, utf8Bytes } from './games-core';

/** How many versions of one game are kept; older ones go on the next save. */
export const VERSIONS_KEPT = 20;
/** "What did you change?" on Update, and a proposal's title. */
export const MESSAGE_MAX = 80;
/** One comment in a conversation. */
export const COMMENT_MAX = 1000;
/** Open proposals one game may have waiting at once. */
export const OPEN_CHANGES_PER_GAME = 10;
/** Proposals (new ones, not updates) one student may send in a day. */
export const CHANGES_PER_DAY = 20;
/** Comments one student may post in an hour, across every conversation. */
export const COMMENTS_PER_HOUR = 40;
/** Comments one conversation may hold. */
export const COMMENTS_PER_CHANGE = 300;

export { GAME_CODE_MAX };

export type ChangeStatus = 'open' | 'accepted' | 'declined' | 'withdrawn' | 'removed' | 'closed';
export const CHANGE_STATUSES: readonly ChangeStatus[] = ['open', 'accepted', 'declined', 'withdrawn', 'removed', 'closed'];

/** What happened in a conversation besides comments. Stored as game_change_comments.kind = 'event'. */
export type ChangeEvent =
  | 'opened' | 'updated' | 'accepted' | 'declined' | 'withdrawn' | 'reopened'
  | 'locked' | 'unlocked' | 'removed' | 'closed';
export const CHANGE_EVENTS: readonly ChangeEvent[] = [
  'opened', 'updated', 'accepted', 'declined', 'withdrawn', 'reopened', 'locked', 'unlocked', 'removed', 'closed',
];

export function isChangeEvent(v: unknown): v is ChangeEvent {
  return typeof v === 'string' && (CHANGE_EVENTS as readonly string[]).includes(v);
}

/** A change id is the same shape as a game id: 32 lowercase hex characters. */
export function isChangeId(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{32}$/.test(s);
}

/** The GitHub word for each thing, shown once per panel in small text. */
export const GITHUB_WORD = {
  version: 'On GitHub, saving a version with a note is called a commit.',
  history: 'On GitHub this list is called the commit history.',
  propose: 'On GitHub this is called a pull request.',
  review: 'On GitHub, looking at the changes and trying them is called reviewing a pull request.',
  accept: 'On GitHub, accepting a change is called merging.',
  sync: 'On GitHub this is called syncing your fork.',
  remix: 'On GitHub, a copy of someone else’s project is called a fork.',
} as const;

/** The docs pages that teach this flow (lib/moshion-docs.ts, section 'sharing'). ?page= counts from 1. */
export const FLOW_DOCS = {
  versions: '/docs/moshion/sharing?page=1',
  propose: '/docs/moshion/sharing?page=3',
  sync: '/docs/moshion/sharing?page=4',
  github: '/docs/moshion/sharing?page=5',
} as const;

/** What a status reads as on a badge. */
export const STATUS_TEXT: Record<ChangeStatus, string> = {
  open: 'Open',
  accepted: 'Accepted',
  declined: 'Not taken',
  withdrawn: 'Taken back',
  removed: 'Removed by a teacher',
  closed: 'Closed',
};

/** One event line in a conversation: "Sam R. accepted this change". `who` is first name + last initial. */
export function eventText(kind: ChangeEvent, who: string, extra?: number | null): string {
  switch (kind) {
    case 'opened': return `${who} proposed this change`;
    case 'updated': return `${who} updated the proposed code`;
    case 'accepted': return extra ? `${who} accepted this change. It is version ${extra} of the game now` : `${who} accepted this change`;
    case 'declined': return `${who} said no thanks to this change`;
    case 'withdrawn': return `${who} took this change back`;
    case 'reopened': return `${who} opened this change again`;
    case 'locked': return `${who} closed the conversation. No new comments`;
    case 'unlocked': return `${who} opened the conversation again`;
    case 'removed': return `${who} removed this change`;
    case 'closed': return 'The game was deleted, so this change was closed';
  }
}

// ---- text the students type -------------------------------------------------

/**
 * "What did you change?": a version's note and a proposal's title. 1-80 characters of plain words,
 * whitespace collapsed; markup and control characters refused, like a game title.
 */
export function cleanMessage(raw: unknown, what: 'version' | 'proposal' = 'version'): { message: string } | { error: string } {
  const empty = what === 'version' ? 'Say what you changed, in a few words.' : 'Give your change a short title: what did you change?';
  if (typeof raw !== 'string') return { error: empty };
  const message = raw.replace(/\s+/g, ' ').trim();
  if (!message) return { error: empty };
  if ([...message].length > MESSAGE_MAX) return { error: `Keep it to ${MESSAGE_MAX} characters. You can say more in a comment.` };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f<>]/.test(message)) return { error: 'Use plain words: no < or > and no special characters.' };
  return { message };
}

/**
 * One comment. Up to 1000 characters and 30 lines; line breaks are kept (runs of blank lines collapse to
 * one), other control characters are refused. It is shown as plain text everywhere, never as markup, so
 * < and > are fine here (students paste code into comments).
 */
export function cleanComment(raw: unknown): { body: string } | { error: string } {
  if (typeof raw !== 'string') return { error: 'Write a comment first.' };
  const body = raw.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  if (!body) return { error: 'Write a comment first.' };
  if ([...body].length > COMMENT_MAX) return { error: `A comment is at most ${COMMENT_MAX} characters. Split it into two.` };
  if (body.split('\n').length > 30) return { error: 'A comment is at most 30 lines. Split it into two.' };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u0008\u000b-\u001f\u007f]/.test(body)) return { error: 'That comment has special characters in it. Type it again in plain words.' };
  return { body };
}

/** The proposed code: the same 64 KB cap as a game. */
export function checkProposedCode(raw: unknown): { code: string } | { error: string; tooLarge?: boolean } {
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'There is no code to propose.' };
  if (utf8Bytes(raw) > GAME_CODE_MAX) return { error: `That is more than ${GAME_CODE_MAX / 1024} KB of code, the most a game can be.`, tooLarge: true };
  return { code: raw };
}

/** Two codes are the same change when they match after line endings and trailing spaces. */
export function sameCode(a: string, b: string): boolean {
  const n = (s: string) => s.replace(/\r\n?/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '');
  return n(a) === n(b);
}

// ---- who may do what ----------------------------------------------------------

/**
 * The caller's part in one proposal. Decided by the routes from the rows; the browser gets the result
 * (`can`) so it shows exactly the buttons the server will accept.
 */
export interface ChangeRole {
  /** Made the game: Accept, No thanks, close or open the conversation. */
  maker: boolean;
  /** Sent the proposal: Update my proposal, Take it back. */
  proposer: boolean;
  /** Teaches a class the game is shared into, or an admin: remove comments, lock, remove the proposal. */
  teacher: boolean;
}

export interface ChangeCan {
  comment: boolean;
  accept: boolean;
  decline: boolean;
  withdraw: boolean;
  reopen: boolean;
  update: boolean;
  lock: boolean;
  unlock: boolean;
  remove: boolean;
}

export function changeCan(role: ChangeRole, status: ChangeStatus, locked: boolean): ChangeCan {
  const open = status === 'open';
  // A decided change keeps its conversation, as a merged or closed pull request does ("thanks!", "what
  // next?"). Only a removed one, or one whose game was deleted, has none.
  const talkable = status !== 'removed' && status !== 'closed';
  return {
    // Anyone who can see it may join while it is not locked; a teacher always may.
    comment: role.teacher || (talkable && !locked),
    accept: role.maker && open,
    decline: role.maker && open,
    withdraw: role.proposer && open,
    // The proposer may reopen what they took back, the maker what they said no to (GitHub's "Reopen").
    reopen: (status === 'withdrawn' && role.proposer) || (status === 'declined' && role.maker),
    update: role.proposer && open,
    lock: (role.maker || role.teacher) && talkable && !locked,
    unlock: (role.maker || role.teacher) && talkable && locked,
    remove: role.teacher && status !== 'removed',
  };
}

/** May this person delete this comment? Its author may; a teacher of the class may delete any. */
export function canDeleteComment(isAuthor: boolean, teacher: boolean): boolean {
  return isAuthor || teacher;
}

/** "With changes by Ana T. and Ben K." from the accepted versions' authors, maker left out, in order. */
export function contributorNames(versions: readonly { author: string; byChange: boolean }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of versions) {
    if (!v.byChange || seen.has(v.author)) continue;
    seen.add(v.author);
    out.push(v.author);
  }
  return out;
}

/** The plain sentence for a conflict, from either side. */
export function conflictText(game: string, maker: string, side: 'maker' | 'proposer' | 'sync', lines: number[]): string {
  const at = lines.length ? ` (around line ${lines[0]}${lines.length > 1 ? ` and ${lines.length - 1} more ${lines.length === 2 ? 'place' : 'places'}` : ''})` : '';
  if (side === 'maker') return `"${game}" changed in the same lines${at} since this was proposed, so it cannot be accepted as it is. Ask for it to be updated: the proposer can bring in the newest version, then update the proposal.`;
  if (side === 'proposer') return `"${game}" changed in the same lines${at} since you started, so ${maker} cannot accept this as it is. Bring in the newest version in your sandbox, fix it up, then update your proposal.`;
  return `You and ${maker} both changed the same lines${at}, so they cannot be put together by themselves. Keep your code for now, or start from the newest version: your code is saved in History first, so you can copy your change back in by hand.`;
}
