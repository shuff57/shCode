// A game's family tree: who remixed (forked) what, when, and from which
// version, and which remixes sent a change back that was accepted. The route
// (GET /api/games/[id]/family) collects the rows; this file decides what a
// reader may see of them and where each box goes, so both are testable without
// a database or a browser.
//
// Privacy rule. A game the reader may not open (another class, hidden, deleted)
// is never named by its own row. It appears only when a game the reader CAN see
// hangs below it, as a plain box; its title and maker are shown only when a
// visible remix of it already credits them ("from X by A" is on that remix's
// own play page), so the tree never tells a reader more than the games they can
// open already do. Invisible leaves are dropped and only counted.

import type { DiagramDoc, FlowShape } from './diagram-types';

export interface FamilyRow {
  /** A library game id, or a built-in ref (`builtin-<id>`). */
  id: string;
  title: string;
  author: string;
  createdAt: number | null;
  /** The game this one was remixed from (a game id or built-in ref), or null for the original. */
  parent: string | null;
  /** Which version of the parent it started from, when known (migration 0052). */
  fromVersion: number | null;
  /** The credit this row carries for its parent, used to name an invisible parent. */
  parentTitle: string | null;
  parentAuthor: string | null;
  visible: boolean;
  mine: boolean;
  deleted: boolean;
  builtin: boolean;
}

export interface FamilyMergeRow {
  /** The remix the change came from, and the game that accepted it. */
  from: string;
  to: string;
  version: number | null;
  at: number | null;
  by: string;
}

export interface FamilyNode {
  key: string;
  parent: string | null;
  /** Null when the reader may not see what the game is called. */
  title: string | null;
  author: string | null;
  createdAt: number | null;
  fromVersion: number | null;
  /** Only for a game the reader can open: the /play link uses it. */
  gameId: string | null;
  mine: boolean;
  current: boolean;
  /** Why a box has no link: 'hidden' (another class or hidden) or 'deleted'. */
  closed: 'hidden' | 'deleted' | null;
  builtin: boolean;
}

export interface FamilyMerge {
  from: string;
  to: string;
  version: number | null;
  at: number | null;
  by: string;
}

export interface FamilyView {
  nodes: FamilyNode[];
  merges: FamilyMerge[];
  /** Remixes in this family the reader cannot see and nothing visible hangs from. */
  unseen: number;
}

/**
 * Turn the family's rows into what this reader may see. `rows` must hold the
 * root; `current` is the game the reader is on.
 */
export function assembleFamily(rows: FamilyRow[], merges: FamilyMergeRow[], current: string): FamilyView {
  const byId = new Map(rows.map((r) => [r.id, r]));
  // A parent named by a child but missing from the rows (a game since removed
  // for good): a closed box from the child's credit, so the line still joins.
  for (const r of [...byId.values()]) {
    if (r.parent && !byId.has(r.parent)) {
      byId.set(r.parent, {
        id: r.parent, title: r.parentTitle ?? '', author: r.parentAuthor ?? '', createdAt: null, parent: null,
        fromVersion: null, parentTitle: null, parentAuthor: null, visible: false, mine: false, deleted: true,
        builtin: r.parent.startsWith('builtin-'),
      });
    }
  }
  const children = new Map<string, FamilyRow[]>();
  for (const r of byId.values()) {
    if (!r.parent) continue;
    const list = children.get(r.parent) ?? [];
    list.push(r);
    children.set(r.parent, list);
  }
  const seeable = (r: FamilyRow) => (r.visible || r.builtin) && !r.deleted;
  // Keep a row when it is seeable or something seeable hangs below it.
  const keep = new Map<string, boolean>();
  const visit = (id: string, guard: Set<string>): boolean => {
    if (keep.has(id)) return keep.get(id)!;
    if (guard.has(id)) return false; // a loop in bad data: stop, never spin
    guard.add(id);
    const r = byId.get(id)!;
    let k = seeable(r) || id === current;
    for (const c of children.get(id) ?? []) if (visit(c.id, guard)) k = true;
    keep.set(id, k);
    return k;
  };
  for (const id of byId.keys()) visit(id, new Set());

  // An invisible box may be named only from a visible child's credit.
  const creditFor = new Map<string, { title: string | null; author: string | null }>();
  for (const r of byId.values()) {
    if (r.parent && seeable(r) && r.parentTitle && !creditFor.has(r.parent)) {
      creditFor.set(r.parent, { title: r.parentTitle, author: r.parentAuthor });
    }
  }

  const keys = new Map<string, string>();
  let n = 0;
  const keyOf = (id: string) => {
    if (!keys.has(id)) {
      const r = byId.get(id)!;
      keys.set(id, seeable(r) ? id : `x${++n}`);
    }
    return keys.get(id)!;
  };

  const nodes: FamilyNode[] = [];
  let unseen = 0;
  for (const r of byId.values()) {
    if (!keep.get(r.id)) { unseen++; continue; }
    const open = seeable(r);
    const credit = creditFor.get(r.id);
    nodes.push({
      key: keyOf(r.id),
      parent: r.parent && keep.get(r.parent) ? keyOf(r.parent) : null,
      title: open ? r.title : credit?.title ?? null,
      author: open ? r.author : credit?.author ?? null,
      createdAt: open ? r.createdAt : null,
      fromVersion: open ? r.fromVersion : null,
      gameId: open && !r.builtin ? r.id : null,
      mine: open && r.mine,
      current: r.id === current,
      closed: open ? null : r.deleted && r.mine ? 'deleted' : 'hidden',
      builtin: r.builtin,
    });
  }
  nodes.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  const out: FamilyMerge[] = [];
  for (const m of merges) {
    const a = byId.get(m.from);
    const b = byId.get(m.to);
    if (!a || !b || !seeable(a) || !seeable(b) || !keep.get(a.id) || !keep.get(b.id)) continue;
    out.push({ from: keyOf(a.id), to: keyOf(b.id), version: m.version, at: m.at, by: m.by });
  }
  return { nodes, merges: out, unseen };
}

export interface Placed {
  key: string;
  /** Column (0-based, may be fractional for a parent centred over its children) and row (depth). */
  col: number;
  row: number;
}

/**
 * A tidy top-down layout: the original on top, each remix one row below what
 * it was remixed from, older remixes to the left, every parent centred over its
 * children. Returns positions in grid units and the grid's size.
 */
export function layoutFamily(nodes: Pick<FamilyNode, 'key' | 'parent' | 'createdAt'>[]): { placed: Placed[]; cols: number; rows: number } {
  const kids = new Map<string | null, typeof nodes>();
  for (const nd of nodes) {
    const p = nd.parent && nodes.some((o) => o.key === nd.parent) ? nd.parent : null;
    const list = kids.get(p) ?? [];
    list.push(nd);
    kids.set(p, list);
  }
  for (const list of kids.values()) list.sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
  const placed: Placed[] = [];
  let next = 0;
  let depth = 0;
  const seen = new Set<string>();
  const place = (nd: (typeof nodes)[number], row: number): number => {
    seen.add(nd.key);
    depth = Math.max(depth, row);
    const cs = (kids.get(nd.key) ?? []).filter((c) => !seen.has(c.key));
    let col: number;
    if (!cs.length) col = next++;
    else {
      const xs = cs.map((c) => place(c, row + 1));
      col = (xs[0] + xs[xs.length - 1]) / 2;
    }
    placed.push({ key: nd.key, col, row });
    return col;
  };
  for (const top of kids.get(null) ?? []) place(top, 0);
  return { placed, cols: Math.max(1, next), rows: depth + 1 };
}

// ---- As a course flowchart ----------------------------------------------------
//
// The family tree is drawn with the same flowchart canvas the course teaches
// with (components/diagram/DiagramEditor, read-only), so the tree is made of the
// shapes students already know: the original is the Start oval, every remix a
// Task box, a game the reader cannot open a small connector circle. An arrow
// down is a remix ("from v3"); an accepted change is an arrow back UP,
// which the canvas routes around the left like a loop's return arrow.


/** Grid spacing in canvas pixels: wide enough for the 176px Task box, tall enough for a label between rows. */
const COL_W = 250;
const ROW_H = 150;

function shortDay(ms: number | null): string {
  if (!ms) return '';
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** The words inside one shape: title, maker, and when (or "you are here"). */
export function familyNodeLabel(n: FamilyNode): string {
  if (!n.gameId && !n.builtin) return n.title ? `${n.title}${n.author ? `\nby ${n.author}` : ''}` : '?';
  const who = n.author ? `by ${n.author}${n.mine ? ' (you)' : ''}` : n.builtin ? 'course game' : '';
  const third = n.current ? '▶ you are here' : n.parent ? shortDay(n.createdAt) : 'the original';
  return [n.title ?? '', who, third].filter(Boolean).join('\n');
}

/**
 * The family as a DiagramDoc, plus which shape opens which game. Node ids are
 * the view's keys (a game id only for a game the reader may open).
 */
export function familyToDiagram(view: FamilyView): { doc: DiagramDoc; links: Record<string, string> } {
  const { placed } = layoutFamily(view.nodes);
  const at = new Map(placed.map((p) => [p.key, p]));
  const links: Record<string, string> = {};
  const nodes = view.nodes.flatMap((n) => {
    const p = at.get(n.key);
    if (!p) return [];
    const open = !!n.gameId || n.builtin;
    // A hidden box with no name is a bare circle; one named by a credit keeps a box so its words fit.
    const shape: FlowShape = !n.parent ? 'terminal' : open ? 'process' : n.title ? 'process' : 'connector';
    if (n.gameId && !n.current) links[n.key] = n.gameId;
    // Shapes are placed by their top-left corner; centre each in its column so an
    // oval, a box and a circle in one column line up (widths from FlowShapeNodes' SIZE).
    const w = shape === 'terminal' ? 150 : shape === 'connector' ? 62 : 176;
    return [{ id: n.key, shape, label: familyNodeLabel(n), x: Math.round(p.col * COL_W + (176 - w) / 2), y: p.row * ROW_H }];
  });
  const known = new Set(nodes.map((n) => n.id));
  const edges: DiagramDoc['edges'] = [];
  for (const n of view.nodes) {
    if (!n.parent || !known.has(n.key) || !known.has(n.parent)) continue;
    edges.push({ id: `r-${n.key}`, from: n.parent, to: n.key, label: n.fromVersion != null ? `from v${n.fromVersion}` : undefined });
  }
  view.merges.forEach((m, i) => {
    if (!known.has(m.from) || !known.has(m.to)) return;
    edges.push({ id: `m-${i}`, from: m.from, to: m.to, label: `${m.by}'s change${m.version ? ` · v${m.version}` : ''}` });
  });
  return { doc: { version: 1, nodes, edges }, links };
}
