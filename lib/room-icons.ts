// Picture join codes for online game rooms (decided by the course owner,
// 2026-11-07: "like Minecraft's join codes"). A room code is 4 symbols from a
// fixed alphabet of 16 built-in Library textures; each picture is one letter
// of the safe alphabet, so the code is also 4 typeable letters (e.g. "BHKE" =
// star, bat, fish, key). 16^4 = 65,536 codes is plenty: rooms are for
// classmates only and last 3 hours.
//
// The ONE copy of the list. The server (functions/_shared/rooms.ts) makes and
// checks codes with it and the page (lib/moshion-online.ts, MoshionLobby.tsx)
// draws them with it, so the two can never disagree. The sketch side
// (public/moshion/extras.js `online.codeIcons`) is handed the names by the page.
// The order is the code: never reorder or replace an entry while rooms are open.

/** Picture i is ROOM_CODE_LETTERS[i]. Each is /moshion/textures/<name>.png. */
export const ROOM_ICONS = [
  'coin', 'star', 'heart', 'gem', 'key', 'slime', 'bee', 'bat',
  'ghost', 'fish', 'frog', 'mushroom', 'cactus', 'crate', 'bomb', 'apple',
] as const;
export type RoomIcon = (typeof ROOM_ICONS)[number];

/** 16 letters of the class-code safe alphabet (no I, L, O), one per picture. */
export const ROOM_CODE_LETTERS = 'ABCDEFGHJKMNPQRS';
export const ROOM_CODE_LENGTH = 4;

/** A new picture code (4 letters). Uniqueness among open rooms is the server's job. */
export function randomRoomCode(): string {
  const buf = new Uint8Array(ROOM_CODE_LENGTH);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => ROOM_CODE_LETTERS[n % ROOM_CODE_LETTERS.length]).join('');
}

/** The picture for one letter, or null if the letter is not a picture letter. */
export function iconForLetter(letter: string): RoomIcon | null {
  const i = ROOM_CODE_LETTERS.indexOf(String(letter).toUpperCase());
  return i < 0 || letter.length !== 1 ? null : ROOM_ICONS[i];
}

/** The 4 picture names of a picture code; null for anything else (an old 6-letter code). */
export function codeIcons(code: string | null | undefined): RoomIcon[] | null {
  const c = String(code ?? '').toUpperCase();
  if (c.length !== ROOM_CODE_LENGTH) return null;
  const out: RoomIcon[] = [];
  for (const ch of c) {
    const icon = iconForLetter(ch);
    if (!icon) return null;
    out.push(icon);
  }
  return out;
}

/** Where the page loads a picture from (the built-in Library texture). */
export function roomIconSrc(icon: string): string {
  return `/moshion/textures/${icon}.png`;
}
