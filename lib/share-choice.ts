// Who may do what with something a student shares (2026-11-09, migration 0045).
//
// When a student shares a game, or a picture or sound with the class, they pick
// one of four choices. It teaches the idea of open source in plain words: the
// UI never says "license", "Creative Commons" or "copyleft".
//
//   play   "Just play" / "Just use": classmates play the game (or see the
//          picture or sound inside the author's own games) but get no Remix,
//          no View code, no Copy to mine.
//   credit "Open: remix it, give me credit" (the default).
//   open   "Open: remix it, give me credit, and keep remixes open": a remix of
//          it may only be shared the same way ('open').
//   free   "Free for anyone: no credit needed".
//
// Every remix records where it came from (Provenance): the original's id, its
// title or name, its author as first name + last initial (never an email), the
// original's choice at the time, and the first item of the chain when the
// original was itself a remix.
//
// The rules here are pure and shared by the routes (functions/api/games/*,
// functions/api/library/*) and the browser, so the browser says the same thing
// the server refuses with. Tests: scripts/test-share-choice.mjs.

export type ShareChoice = 'play' | 'credit' | 'open' | 'free';
export const SHARE_CHOICES: readonly ShareChoice[] = ['play', 'credit', 'open', 'free'];
export const DEFAULT_CHOICE: ShareChoice = 'credit';

/** What is being shared: a game, or a picture or sound ("art"). */
export type ShareThing = 'game' | 'art';

export function isShareChoice(v: unknown): v is ShareChoice {
  return typeof v === 'string' && (SHARE_CHOICES as readonly string[]).includes(v);
}

/** A stored value as the choice it means. A missing or unknown value (a row older than 0045) is 'credit'. */
export function choiceOf(v: unknown): ShareChoice {
  return isShareChoice(v) ? v : DEFAULT_CHOICE;
}

/** May someone who is not the author remix it (Remix, View code, Copy to mine)? */
export function canRemix(choice: unknown): boolean {
  return choiceOf(choice) !== 'play';
}

/** The one choice a remix must be shared with, or null when any choice is fine. */
export function requiredChoice(parentChoice: unknown): ShareChoice | null {
  return parentChoice != null && choiceOf(parentChoice) === 'open' ? 'open' : null;
}

/**
 * The choice to store, given what the student asked for and (for a remix) the
 * original's choice. Nothing asked for means the required one, else 'credit'.
 */
export function decideChoice(
  requested: unknown,
  provenance: Provenance | null,
): { choice: ShareChoice } | { error: string; lockedTo?: ShareChoice } {
  const required = provenance ? requiredChoice(provenance.choice) : null;
  if (requested === undefined || requested === null) return { choice: required ?? DEFAULT_CHOICE };
  if (!isShareChoice(requested)) return { error: 'Pick who can do what with it.' };
  if (required && requested !== required) return { error: keepOpenReason(provenance!), lockedTo: required };
  return { choice: requested };
}

// ---- where a remix came from ----------------------------------------------

export interface Credit {
  id: string;
  /** A game's title, or a picture's or sound's name. */
  title: string;
  /** First name + last initial, never an email. */
  author: string;
}

export interface Provenance extends Credit {
  /** The original's choice when it was remixed. */
  choice: ShareChoice;
  /** The first item of the chain, when the original was itself a remix; else null. */
  first: Credit | null;
}

/** The provenance columns on library_games and library_items (migration 0045). */
export interface ProvenanceRow {
  remixed_from_id: string | null;
  remixed_from_title: string | null;
  remixed_from_author: string | null;
  remixed_from_choice: string | null;
  origin_id: string | null;
  origin_title: string | null;
  origin_author: string | null;
}

export const PROVENANCE_COLUMNS =
  'remixed_from_id, remixed_from_title, remixed_from_author, remixed_from_choice, origin_id, origin_title, origin_author';

/** A row's provenance, or null when it is not a remix (or the row is older than 0045). */
export function provenanceFromRow(row: Partial<ProvenanceRow> | null | undefined): Provenance | null {
  if (!row || !row.remixed_from_id || !row.remixed_from_title) return null;
  return {
    id: row.remixed_from_id,
    title: row.remixed_from_title,
    author: row.remixed_from_author || 'A classmate',
    choice: choiceOf(row.remixed_from_choice),
    first: row.origin_id && row.origin_title
      ? { id: row.origin_id, title: row.origin_title, author: row.origin_author || 'A classmate' }
      : null,
  };
}

/**
 * The provenance a remix of `parent` records. When the parent was itself a
 * remix, the chain's first credit is carried along (the parent's own first, or
 * the parent's direct original), so "from X by A" survives any number of steps.
 */
export function provenanceOf(parent: Credit & { choice: unknown; provenance: Provenance | null }): Provenance {
  const p = parent.provenance;
  return {
    id: parent.id,
    title: parent.title,
    author: parent.author,
    choice: choiceOf(parent.choice),
    first: p ? (p.first ?? { id: p.id, title: p.title, author: p.author }) : null,
  };
}

/** The columns to store for a provenance (all null for "not a remix"). */
export function provenanceToRow(p: Provenance | null): ProvenanceRow {
  return {
    remixed_from_id: p?.id ?? null,
    remixed_from_title: p?.title ?? null,
    remixed_from_author: p?.author ?? null,
    remixed_from_choice: p?.choice ?? null,
    origin_id: p?.first?.id ?? null,
    origin_title: p?.first?.title ?? null,
    origin_author: p?.first?.author ?? null,
  };
}

/** Parse a provenance from JSON (an API answer or localStorage), or null. */
export function parseProvenance(v: unknown): Provenance | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const str = (x: unknown) => (typeof x === 'string' && x ? x : null);
  const id = str(o.id), title = str(o.title);
  if (!id || !title) return null;
  const f = o.first && typeof o.first === 'object' ? o.first as Record<string, unknown> : null;
  const fid = f ? str(f.id) : null, ftitle = f ? str(f.title) : null;
  return {
    id, title, author: str(o.author) ?? 'A classmate', choice: choiceOf(o.choice),
    first: fid && ftitle ? { id: fid, title: ftitle, author: str(f!.author) ?? 'A classmate' } : null,
  };
}

// ---- words -----------------------------------------------------------------

/** "Remixed from Plane 2 by Ben D. (first made as Plane by Sam W.)" */
export function creditLine(p: Provenance): string {
  const base = `Remixed from ${p.title} by ${p.author}`;
  return p.first ? `${base} (first made as ${p.first.title} by ${p.first.author})` : base;
}

/** Why the chooser is locked to "keep remixes open". */
export function keepOpenReason(p: Credit): string {
  return `This is a remix of ${p.title} by ${p.author}, who asked that remixes stay open.`;
}

/** Why Remix or Copy to mine is refused for a "just play" / "just use" item. */
export function remixRefusal(thing: ShareThing, title: string, author: string): string {
  return thing === 'game'
    ? `${author} asked that "${title}" be just played, so it can't be remixed.`
    : `${author} asked that "${title}" be just used in their games, so it can't be copied.`;
}

/** The teaching line above the chooser. */
export const OPEN_SOURCE_LINE: Record<ShareThing, string> = {
  game: 'Sharing your code so others can learn from it and build on it is called open source.',
  art: 'Sharing your work so others can learn from it and build on it is called open source.',
};

/** Under "Just play": the code still reaches the player's computer. */
export const JUST_PLAY_NOTE = 'Your code still goes to their computer so the game can run, so this is a request, not a lock.';

export const CHOICE_TEXT: Record<ShareThing, Record<ShareChoice, { label: string; line: string; short: string }>> = {
  game: {
    play: { label: 'Just play', short: 'Just play', line: 'Classmates can play your game, but not see the code or remix it.' },
    credit: { label: 'Open: remix it, give me credit', short: 'Open, credit me', line: 'Classmates can see the code and remix it. Their copy says it came from you.' },
    open: { label: 'Open: remix it, give me credit, and keep remixes open', short: 'Open, keep remixes open', line: 'Like the one above, and anything made from it must be shared this same way.' },
    free: { label: 'Free for anyone: no credit needed', short: 'Free for anyone', line: 'Anyone can see, remix and share it, and they don\'t have to say it came from you.' },
  },
  art: {
    play: { label: 'Just use', short: 'Just use', line: 'Classmates see it in your games, but can\'t copy it or remix it.' },
    credit: { label: 'Open: remix it, give me credit', short: 'Open, credit me', line: 'Classmates can copy it and change it. Their copy says it came from you.' },
    open: { label: 'Open: remix it, give me credit, and keep remixes open', short: 'Open, keep remixes open', line: 'Like the one above, and anything made from it must be shared this same way.' },
    free: { label: 'Free for anyone: no credit needed', short: 'Free for anyone', line: 'Anyone can copy it and change it, and they don\'t have to say it came from you.' },
  },
};

// ---- the student's last choice (a per-browser convenience) -----------------

export const LAST_CHOICE_KEY = 'shCode:share-choice';

/** A short, stable, non-reversible tag for an account, so the key never holds an email. */
export function accountTag(email: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < email.length; i++) {
    h ^= email.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

interface KV { getItem(key: string): string | null; setItem(key: string, value: string): void }

/** The browser's localStorage, or null (a server, a test, or a blocked store). Never throws. */
function browserStore(): KV | null {
  try {
    const g = globalThis as { localStorage?: KV };
    return g.localStorage ?? null;
  } catch {
    return null;
  }
}

/** The last choice this account made for `thing` in this browser, or the default. */
export function readLastChoice(thing: ShareThing, email: string | null, store?: KV | null): ShareChoice {
  try {
    const s = store ?? browserStore();
    if (!s) return DEFAULT_CHOICE;
    const all = JSON.parse(s.getItem(LAST_CHOICE_KEY) || '{}');
    return choiceOf(all?.[accountTag(email ?? '')]?.[thing]);
  } catch {
    return DEFAULT_CHOICE;
  }
}

export function writeLastChoice(thing: ShareThing, email: string | null, choice: ShareChoice, store?: KV | null): void {
  try {
    const s = store ?? browserStore();
    if (!s) return;
    let all: Record<string, Record<string, string>> = {};
    try { const v = JSON.parse(s.getItem(LAST_CHOICE_KEY) || '{}'); if (v && typeof v === 'object') all = v; } catch { /* junk */ }
    const tag = accountTag(email ?? '');
    all[tag] = { ...(all[tag] ?? {}), [thing]: choice };
    s.setItem(LAST_CHOICE_KEY, JSON.stringify(all));
  } catch { /* private mode */ }
}
