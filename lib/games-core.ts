// The Games library's pure rules, shared by the routes (functions/api/games/*)
// and the publish button (components/PublishGameButton.tsx), so the browser
// says the same thing the server will refuse with.

/** The most a published game's code may be, in UTF-8 bytes. */
export const GAME_CODE_MAX = 64 * 1024;
/** A title is 1 to 60 characters of plain text. */
export const GAME_TITLE_MAX = 60;
/** How many live games one account may have published. */
export const GAME_MAX_PER_OWNER = 30;

export type GameMode = 'none' | 'local' | 'coop' | 'versus';
export const GAME_MODES: GameMode[] = ['none', 'local', 'coop', 'versus'];

/** A game id is the same shape as an upload id: 32 lowercase hex characters. */
export function isGameId(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-f]{32}$/.test(s);
}

/**
 * The title as stored, or an error sentence. Whitespace runs collapse to one
 * space; control characters and angle brackets are refused (it is shown as
 * plain text everywhere, but a title is a name, not markup).
 */
export function cleanTitle(raw: unknown): { title: string } | { error: string } {
  if (typeof raw !== 'string') return { error: 'Give your game a title.' };
  const title = raw.replace(/\s+/g, ' ').trim();
  if (!title) return { error: 'Give your game a title.' };
  if ([...title].length > GAME_TITLE_MAX) return { error: `A title is at most ${GAME_TITLE_MAX} characters.` };
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f<>]/.test(title)) return { error: 'A title is plain words: no < or > and no special characters.' };
  return { title };
}

/** UTF-8 length of a string, without TextEncoder allocations for ASCII. */
export function utf8Bytes(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) n += 1;
    else if (c < 0x800) n += 2;
    else if (c >= 0xd800 && c <= 0xdbff) { n += 4; i++; }
    else n += 3;
  }
  return n;
}

/** The code as stored, or an error sentence. */
export function checkCode(raw: unknown): { code: string } | { error: string; tooLarge?: boolean } {
  if (typeof raw !== 'string' || !raw.trim()) return { error: 'There is no code to publish yet.' };
  const bytes = utf8Bytes(raw);
  if (bytes > GAME_CODE_MAX) {
    return { error: `This game is ${Math.ceil(bytes / 1024)} KB of code; the most a game can be is ${GAME_CODE_MAX / 1024} KB.`, tooLarge: true };
  }
  return { code: raw };
}

/**
 * What the game declares through multiplayer('mode', n), read by a simple
 * regex with comments removed first (so a commented-out call does not count).
 * Informational only: the card's badge. The sketch itself decides at run time.
 */
export function declaredMode(code: string): { mode: GameMode; players: number } {
  const bare = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
  // A third argument ({ realtime: true }) is allowed: without it a real-time game read as 1 player.
  const m = /\bmultiplayer\s*\(\s*(['"`])\s*(none|local|coop|versus)\s*\1\s*(?:,\s*(\d+)\s*)?(?:,[^)]*)?\)/i.exec(bare);
  if (!m) return { mode: 'none', players: 1 };
  const mode = m[2].toLowerCase() as GameMode;
  if (mode === 'none') return { mode, players: 1 };
  const n = m[3] === undefined ? 2 : Number(m[3]);
  return { mode, players: n >= 2 && n <= 4 ? n : 2 };
}

/** The badge text for a card: "Versus, 2 players", "Co-op, 3 players", "1 player". */
export function modeLabel(mode: GameMode, players: number): string {
  if (mode === 'none') return '1 player';
  const name = mode === 'versus' ? 'Versus' : mode === 'coop' ? 'Co-op' : 'Same keyboard';
  return `${name}, ${players} players`;
}

// ---- the student's own pictures and sounds a game uses -------------------
//
// A published game stores only its code. The pictures (textures) and sounds a
// sketch loads by name -- `sprite.texture = 'hero'`, `loadSound('jump')` --
// come from the player's own library, so a classmate sees the game's art only
// when the publisher shares those items with the class. These rules decide
// which items a game uses: the publish panel warns with them and
// GET /api/games/[id]/assets serves them on /play. A name counts when it is a
// whole string literal in the code (`'hero'`, or the explicit store key
// `'texture:hero'` / `'sound:jump'`); comments do not count.

/**
 * Every string literal in `code`, as written between its quotes, with comments
 * skipped. A template literal gives its plain text pieces (the parts outside
 * `${...}`; the code inside is read as code, strings and all). A ' or " string
 * ends at a line break, so a stray quote (one inside a regex literal, say)
 * cannot swallow the rest of the file. An escape keeps the character after the
 * backslash, which is all a name made of letters, digits and _ ever needs.
 */
export function stringLiterals(code: string): string[] {
  const out: string[] = [];
  // Brace depth of each open `${`, innermost last: a } at that depth ends the
  // expression and returns to the template's text.
  const tpl: number[] = [];
  let depth = 0;
  let i = 0;
  const n = code.length;

  const readTemplateText = () => {
    // From just after ` or }, up to the closing ` or the next ${.
    let s = '';
    while (i < n) {
      const c = code[i];
      if (c === '\\') { s += code[i + 1] ?? ''; i += 2; continue; }
      if (c === '`') { i++; out.push(s); return; }
      if (c === '$' && code[i + 1] === '{') { i += 2; out.push(s); tpl.push(depth); depth++; return; }
      s += c; i++;
    }
    out.push(s);
  };

  while (i < n) {
    const c = code[i];
    const d = code[i + 1];
    if (c === '/' && d === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && d === '*') { const e = code.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === "'" || c === '"') {
      i++;
      let s = '';
      while (i < n && code[i] !== c && code[i] !== '\n') {
        if (code[i] === '\\') { s += code[i + 1] ?? ''; i += 2; continue; }
        s += code[i]; i++;
      }
      if (code[i] === c) out.push(s);
      i++;
      continue;
    }
    if (c === '`') { i++; readTemplateText(); continue; }
    if (c === '{') { depth++; i++; continue; }
    if (c === '}') {
      depth--;
      i++;
      if (tpl.length && depth === tpl[tpl.length - 1]) { tpl.pop(); readTemplateText(); }
      continue;
    }
    i++;
  }
  return out;
}

export type AssetKind = 'texture' | 'sound';

/** Does a code with these string literals use the saved item `kind`:`name`? */
export function usesItem(literals: ReadonlySet<string>, kind: AssetKind, name: string): boolean {
  return literals.has(name) || literals.has(`${kind}:${name}`);
}

/**
 * The items `code` uses, in the order given. `builtinTextures` (the moSHion
 * texture catalog's names) are left out of the textures: a classmate without
 * the share still sees the built-in picture of that name, so the game is not
 * missing anything.
 */
export function usedItems<T extends { kind: AssetKind; name: string }>(
  code: string,
  items: readonly T[],
  builtinTextures: ReadonlySet<string> = new Set(),
): T[] {
  const lits = new Set(stringLiterals(code));
  return items.filter((it) => usesItem(lits, it.kind, it.name) && !(it.kind === 'texture' && builtinTextures.has(it.name)));
}
