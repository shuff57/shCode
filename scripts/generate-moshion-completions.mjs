#!/usr/bin/env node
// Builds the moSHion part of the editor's autocomplete (#80) from the engine's
// own type file, public/moshion/docs/moshion.d.ts, so a suggestion can never
// name something the engine does not have, and a new engine feature appears
// in the editor as soon as the vendored d.ts carries it.
//
// Output: lib/moshion-completions.generated.ts
//   globals: every `declare function|const|class` (name, kind, signature, doc)
//   members: per class/interface, its properties and methods (inherited ones included)
//   typeOf:  which interface a global object is (world -> World, kb -> Kb, ...)
//
// Run: node scripts/generate-moshion-completions.mjs          (write)
//      node scripts/generate-moshion-completions.mjs --check  (exit 1 if stale; in npm test)

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'public/moshion/docs/moshion.d.ts');
const OUT = join(root, 'lib/moshion-completions.generated.ts');

const text = readFileSync(SRC, 'utf8');
const sf = ts.createSourceFile('moshion.d.ts', text, ts.ScriptTarget.Latest, true);
const printer = ts.createPrinter({ removeComments: true });

function docOf(node) {
  const jsDoc = (node.jsDoc ?? []).map((d) => (typeof d.comment === 'string' ? d.comment : '')).join(' ').trim();
  const one = jsDoc.replace(/\s+/g, ' ');
  // First sentence, kept short: it is a tooltip, not the docs page.
  const m = /^(.{1,160}?[.!?])(\s|$)/.exec(one);
  return m ? m[1] : one.slice(0, 160);
}
const sig = (node) => printer.printNode(ts.EmitHint.Unspecified, node, sf).replace(/\s+/g, ' ').replace(/;$/, '').trim();

const globals = [];
const members = {};
const parents = {};
const typeOf = {};

function addMember(owner, entry) {
  members[owner] ??= [];
  const existing = members[owner].find((m) => m.label === entry.label);
  if (existing) return; // first overload wins
  members[owner].push(entry);
}

for (const st of sf.statements) {
  if (ts.isFunctionDeclaration(st) && st.name) {
    const name = st.name.text;
    if (globals.some((g) => g.label === name)) continue;
    globals.push({ label: name, type: 'function', detail: sig(st).replace(/^declare function /, '').slice(name.length), info: docOf(st) });
  } else if (ts.isVariableStatement(st)) {
    for (const d of st.declarationList.declarations) {
      const name = d.name.getText(sf);
      const t = d.type ? d.type.getText(sf) : '';
      globals.push({ label: name, type: 'constant', detail: t, info: docOf(st) });
      if (d.type && ts.isTypeReferenceNode(d.type)) typeOf[name] = d.type.typeName.getText(sf);
    }
  } else if ((ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st)) && st.name) {
    const owner = st.name.text;
    if (ts.isClassDeclaration(st)) globals.push({ label: owner, type: 'class', detail: 'class', info: docOf(st) });
    for (const h of st.heritageClauses ?? []) {
      for (const t of h.types) {
        const base = t.expression.getText(sf);
        if (!base.startsWith('Array')) (parents[owner] ??= []).push(base);
      }
    }
    for (const m of st.members) {
      if (!m.name || ts.isConstructorDeclaration?.(m)) continue;
      const name = m.name.getText(sf);
      if (!/^[A-Za-z_$][\w$]*$/.test(name) || name.startsWith('_')) continue;
      const isMethod = ts.isMethodDeclaration(m) || ts.isMethodSignature(m);
      // The label already shows the name: the detail is only what follows it.
      const detail = isMethod
        ? sig(m).replace(/^(static |readonly )*/, '').slice(name.length).replace(/^\?/, '')
        : (m.type ? m.type.getText(sf).replace(/\s+/g, ' ') : 'any');
      addMember(owner, { label: name, type: isMethod ? 'method' : 'property', detail, info: docOf(m) });
    }
  }
}

// Inherit: Tiles and Walls are Groups, Camera is a Vec2, and so on.
function resolved(owner, seen = new Set()) {
  if (seen.has(owner)) return [];
  seen.add(owner);
  const own = members[owner] ?? [];
  const inherited = (parents[owner] ?? []).flatMap((p) => resolved(p, seen));
  const names = new Set(own.map((m) => m.label));
  return [...own, ...inherited.filter((m) => !names.has(m.label))];
}
const flat = {};
for (const owner of Object.keys({ ...members, ...parents })) flat[owner] = resolved(owner);

// shCode's own helpers loaded after the engine (public/moshion/extras.js).
globals.push(
  { label: 'rgba', type: 'function', detail: '(r, g, b, a)', info: 'A colour with alpha: red, green, blue 0-255 and alpha 0-1.' },
  { label: 'randomColor', type: 'function', detail: '(a?)', info: 'A random colour, optionally with alpha.' },
  { label: 'online', type: 'variable', detail: 'Online', info: 'Play with a classmate on another computer: host(), join(code), send(move), onMove(fn).' },
  // multiplayer() and what it adds (extras.js; codehs-review/MULTIPLAYER-SPEC.md).
  { label: 'multiplayer', type: 'function', detail: "(mode, players?, { realtime? })", info: "Call once in setup(): 'none', 'local' (one keyboard), 'coop' or 'versus' (online, with a lobby), for 2-4 players. { realtime: true }: a real-time room." },
  { label: 'game', type: 'variable', detail: 'Game', info: 'After multiplayer(): game.mode, game.players, game.ready, game.seat, game.turn.' },
  { label: 'myTurn', type: 'function', detail: '()', info: "After multiplayer(): true when this computer may move ('local': always; 'versus': your seat's turn and the room is full)." },
  { label: 'nextTurn', type: 'function', detail: '()', info: "After multiplayer(): pass the turn to the next player. Online, call it inside online.onMove so every computer moves on together." },
  { label: 'players', type: 'variable', detail: 'number', info: 'After multiplayer(): how many players, 2 to 4.' },
  { label: 'turn', type: 'variable', detail: 'number', info: "After multiplayer(): whose turn it is, 0 to players - 1." },
  { label: 'seat', type: 'variable', detail: 'number', info: "After multiplayer('versus' | 'coop'): your seat, 0 for the host, then 1, 2, 3." },
);
// game's members (extras.js), so `game.` completes.
flat.Game = [
  { label: 'mode', type: 'property', detail: 'string', info: "'none', 'local', 'coop' or 'versus'." },
  { label: 'players', type: 'property', detail: 'number', info: 'How many players.' },
  { label: 'ready', type: 'property', detail: 'boolean', info: "True once play can start: always for 'local', when the room is full online." },
  { label: 'turn', type: 'property', detail: 'number', info: 'Whose turn it is, 0 to players - 1.' },
  { label: 'seat', type: 'property', detail: 'number', info: 'Your seat online (0 is the host); null otherwise.' },
  { label: 'code', type: 'property', detail: 'string', info: "The online room's code: 4 letters, shown in the lobby as 4 pictures." },
  { label: 'status', type: 'property', detail: 'string', info: "Online: 'off', 'waiting', 'ready', 'closed' or 'error'." },
  { label: 'realtime', type: 'property', detail: 'boolean', info: "True when multiplayer() was called with { realtime: true }." },
];
// online's members (extras.js), so `online.` completes like `world.`.
flat.Online = [
  { label: 'host', type: 'method', detail: '(players?)', info: 'Start a room for 2 (or up to 4) players. online.code becomes its 4-letter room code.' },
  { label: 'join', type: 'method', detail: '(code)', info: "Join a classmate's room with their 4-letter room code." },
  { label: 'send', type: 'method', detail: '(move)', info: 'Send a move: numbers, true/false and short words.' },
  { label: 'onMove', type: 'method', detail: '(fn)', info: 'fn(move, seat) runs for every move, yours too, in the same order on every computer.' },
  { label: 'leave', type: 'method', detail: '()', info: 'Leave the room. The host leaving closes it.' },
  { label: 'status', type: 'property', detail: 'string', info: "'off', 'connecting', 'waiting', 'ready', 'closed' or 'error'." },
  { label: 'code', type: 'property', detail: 'string', info: "The room's 4-letter code (4 pictures in the lobby)." },
  { label: 'codeIcons', type: 'property', detail: 'string[]', info: "The room code as 4 picture names (Library textures), e.g. ['star', 'bat', 'fish', 'key']." },
  { label: 'seat', type: 'property', detail: 'number', info: 'Your seat: 0 is the host, then 1, 2, 3.' },
  { label: 'seats', type: 'property', detail: 'number', info: 'How many players the room is for.' },
  { label: 'players', type: 'property', detail: '{seat, name, left}[]', info: 'Who is in the room.' },
  { label: 'error', type: 'property', detail: 'string', info: 'The last problem, in words.' },
  // Real-time rooms (multiplayer(mode, n, { realtime: true }); codehs-review/REALTIME-SPEC.md).
  { label: 'share', type: 'method', detail: '(sprite)', info: 'Real time: show this sprite on every other computer, smoothly. Only this computer moves it. Up to 8.' },
  { label: 'unshare', type: 'method', detail: '(sprite?)', info: 'Stop sharing this sprite (or every sprite you share).' },
  { label: 'peers', type: 'property', detail: '{ [seat]: Sprite }', info: 'Real time: online.peers[seat] is the sprite that player shares, moved here automatically.' },
  { label: 'sharedBy', type: 'method', detail: '(seat)', info: 'Real time: every sprite that seat shares, in the order shared.' },
  { label: 'isHost', type: 'property', detail: 'boolean', info: 'True on the host computer (seat 0). In a host-decides game the host moves the real sprites and shares them.' },
  { label: 'live', type: 'property', detail: 'boolean', info: 'True while in a real-time room.' },
];
globals.sort((a, b) => a.label.localeCompare(b.label));

typeOf.online = 'Online';
typeOf.game = 'Game';

const body = `// GENERATED by scripts/generate-moshion-completions.mjs from public/moshion/docs/moshion.d.ts.
// Do not edit by hand; re-run the script after a moSHion resync.

export interface MoshionCompletion { label: string; type: string; detail: string; info: string }

export const MOSHION_GLOBALS: MoshionCompletion[] = ${JSON.stringify(globals, null, 1)};

export const MOSHION_MEMBERS: Record<string, MoshionCompletion[]> = ${JSON.stringify(flat, null, 1)};

/** Which interface a global object is: \`world.\` completes World's members. */
export const MOSHION_TYPE_OF: Record<string, string> = ${JSON.stringify(typeOf, null, 1)};
`;

if (process.argv.includes('--check')) {
  const cur = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
  if (cur !== body) {
    console.error('[moshion-completions] lib/moshion-completions.generated.ts is stale: run node scripts/generate-moshion-completions.mjs');
    process.exit(1);
  }
  console.log(`[moshion-completions] up to date: ${globals.length} globals, ${Object.keys(flat).length} types`);
} else {
  writeFileSync(OUT, body);
  console.log(`[moshion-completions] wrote ${globals.length} globals, ${Object.keys(flat).length} types, Sprite has ${flat.Sprite?.length ?? 0} members`);
}
