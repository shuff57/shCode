// The built-in games in Library -> Games, in one list that the generator
// (scripts/generate-builtin-games.mjs, which writes public/builtin-games.json
// with each game's code), the Library and /play pages, and the publish route
// (functions/api/games/index.ts) all read.
//
// Two kinds:
//   - A lesson game (`lesson` + `fence`): the finished Trail, Checkers and
//     Quest, copied from the lesson's play-only demo. PLAY ONLY, because they
//     are the games students build in those chains. Their room key is the
//     lesson demo's ('demo-<fence>'), so Library and lesson players meet.
//   - A course game (`file`): a game written for students to remix, kept in
//     games/<name>.js. It has an author and a sharing choice
//     (lib/share-choice.ts), and /play offers Remix and View code. A remix's
//     credit ("Remixed from Paddle Rally by Steven Huff") is taken from THIS
//     list on the server, never from the browser, exactly as a classmate's
//     game's credit is taken from its row. Proposed changes are for
//     classmates' games only: a built-in has no versions to send one to.
//     Its room key is 'builtin-<id>'.
//
// Ids are never renamed: a remix stores 'builtin-<id>' as where it came from.

import type { ShareChoice } from './share-choice';

export interface BuiltinGameDef {
  id: string;
  title: string;
  blurb: string;
  /** A lesson game: the lesson folder and its ```js live demo fence id. */
  lesson?: string;
  fence?: string;
  /** A course game: its source file, relative to the repo root. */
  file?: string;
  /** A course game's author, shown in full (it is the course's own work, not a student's). */
  author?: string;
  /** A course game's sharing choice; it must allow remixing. */
  choice?: ShareChoice;
  /** Says how many play and how, when "Versus, 4 players" (read from multiplayer()) would mislead. */
  modeText?: string;
}

export const BUILTIN_GAMES: BuiltinGameDef[] = [
  { id: 'trail', title: 'Trail', lesson: '6-22-trail-0-reading-play-the-finished-game', fence: 'trail-finished-game',
    blurb: 'Race along a path: roll the die, jump ahead, slide back, wait a turn. First to the flag wins.' },
  { id: 'checkers', title: 'Checkers', lesson: '6-27-checkers-0-reading-play-the-finished-game', fence: 'checkers-finished-game',
    blurb: "Jump your opponent's pieces, chain your jumps, crown your kings." },
  { id: 'quest', title: 'Quest', lesson: '7-16-quest-0-reading-play-the-finished-game', fence: 'quest-finished-game',
    blurb: 'A turn-based battle: attack, guard or drink a potion. Fight a run of monsters or duel a classmate.' },
  { id: 'paddle-rally', title: 'Paddle Rally', file: 'games/paddle-rally.js', author: 'Steven Huff', choice: 'credit',
    modeText: '2 to 4 players, one keyboard or online',
    blurb: 'Left and right, then bottom, then top. Miss the ball and lose a life; the last player in wins.' },
];

const REF_PREFIX = 'builtin-';

/** What a remix of built-in game `id` stores as where it came from. */
export function builtinRef(id: string): string {
  return REF_PREFIX + id;
}

/** Is `s` a built-in game reference ('builtin-<id>') rather than a published game's id? */
export function isBuiltinRef(s: unknown): s is string {
  return typeof s === 'string' && s.startsWith(REF_PREFIX) && /^[a-z0-9-]{1,40}$/.test(s.slice(REF_PREFIX.length));
}

/** The remixable built-in game a reference names, or null (unknown, or a play-only lesson game). */
export function remixableBuiltin(ref: unknown): (BuiltinGameDef & { author: string; choice: ShareChoice }) | null {
  if (!isBuiltinRef(ref)) return null;
  const g = BUILTIN_GAMES.find((x) => builtinRef(x.id) === ref);
  if (!g || !g.file || !g.author || !g.choice) return null;
  return g as BuiltinGameDef & { author: string; choice: ShareChoice };
}

/** The room key a built-in game plays under (at most 48 characters of [a-z0-9-]). */
export function builtinRoomKey(g: Pick<BuiltinGameDef, 'id' | 'fence'>): string {
  return g.fence ? 'demo-' + g.fence : 'builtin-' + g.id;
}
