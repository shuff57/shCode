// Code together's copy of @codemirror/collab 6.1.1 (MIT License, Copyright (C)
// 2018-2021 by Marijn Haverbeke and others), changed in ONE place: which of two
// inserts at the same spot goes first when receiveUpdates rebases this editor's
// unconfirmed typing over the room's.
//
// WHY A COPY. Upstream always puts the room's text first at a tie. That split
// words when two people typed at one spot at the same moment (found in a browser
// walk): Sam typed "le" (confirmed) and kept going ("t samX", not confirmed
// yet); Ana's "let anaY = 2;", rebased on her side over his "le", sat right
// after it -- exactly where Sam's caret was. On Sam's side the tie was then his
// unconfirmed "t samX" against her insert at that same spot, upstream put hers
// first, and the line read "le" + "let anaY = 2;" + "t samX". The ordering is a
// single `before` flag on ChangeSet.map inside receiveUpdates, so it cannot be
// changed from outside; hence this file.
//
// THE RULE. At a tie, this editor's insert goes first when the character just
// before the spot was typed by this editor: it is carrying on its own run, so
// the other text goes after the whole run instead of into it. Otherwise the
// room's text goes first, as upstream. The character's author comes from the
// caller (`ownChar`, from the room's accepted updates, each stamped with its
// seat) and from this editor's own updates in the same rebase.
//
// WHY THIS CANNOT BREAK CONVERGENCE. The room never transforms anything: it
// applies a push at its own version as sent, and every editor applies the
// room's updates in the room's order. A rebase only decides what THIS editor
// pushes next, and each decision maps the pair with matching flags
// (`mine.map(theirs, mineFirst)` beside `theirs.map(mine, !mineFirst)`), which
// is what keeps this editor's text equal to the room's text plus its own
// unconfirmed typing. So the room's text, and with it every editor's, ends the
// same whatever is decided at a tie (scripts/test-live-doc.mjs checks both:
// identical texts, and every run in one piece).
//
// One option is added beside it, `caretAfter`, so the caller can say how this
// editor's caret moves when the room's text lands right on it (see
// lib/live-doc.ts, which uses the same rule for both). Everything else is
// upstream's code as it was.

import {
  ChangeSet, Facet, StateEffect, StateField, Transaction, Annotation, combineConfig,
  type ChangeDesc, type EditorState, type Extension,
} from '@codemirror/state';

/** An update is a set of changes and effects. */
export interface Update {
  changes: ChangeSet;
  effects?: readonly StateEffect<unknown>[];
  clientID: string;
}

class LocalUpdate implements Update {
  origin: Transaction;
  changes: ChangeSet;
  effects: readonly StateEffect<unknown>[];
  clientID: string;
  constructor(origin: Transaction, changes: ChangeSet, effects: readonly StateEffect<unknown>[], clientID: string) {
    this.origin = origin;
    this.changes = changes;
    this.effects = effects;
    this.clientID = clientID;
  }
}

class CollabState {
  /** The version up to which changes have been confirmed. */
  version: number;
  /** The local updates that have not been sent to the room successfully yet. */
  unconfirmed: readonly LocalUpdate[];
  constructor(version: number, unconfirmed: readonly LocalUpdate[]) {
    this.version = version;
    this.unconfirmed = unconfirmed;
  }
}

interface CollabConfig {
  startVersion?: number;
  clientID?: string;
  sharedEffects?: (tr: Transaction) => readonly StateEffect<unknown>[];
}

interface FullConfig {
  startVersion: number;
  clientID: string;
  sharedEffects: (tr: Transaction) => readonly StateEffect<unknown>[];
}

const collabConfig = Facet.define<CollabConfig & { generatedID?: string }, FullConfig>({
  combine(configs) {
    const combined = combineConfig<FullConfig & { generatedID?: string }>(
      configs as (Partial<FullConfig> & { generatedID?: string })[],
      { startVersion: 0, clientID: null as unknown as string, sharedEffects: () => [] },
      { generatedID: (a: string | undefined) => a },
    );
    if (combined.clientID == null) combined.clientID = (configs.length && configs[0].generatedID) || '';
    return combined;
  },
});

const collabReceive = Annotation.define<CollabState>();

const collabField = StateField.define<CollabState>({
  create(state) {
    return new CollabState(state.facet(collabConfig).startVersion, []);
  },
  update(collab, tr) {
    const isSync = tr.annotation(collabReceive);
    if (isSync) return isSync;
    const { sharedEffects, clientID } = tr.startState.facet(collabConfig);
    const effects = sharedEffects(tr);
    if (effects.length || !tr.changes.empty) {
      return new CollabState(collab.version, collab.unconfirmed.concat(new LocalUpdate(tr, tr.changes, effects, clientID)));
    }
    return collab;
  },
});

/** Create an instance of the collaborative editing plugin. */
export function collab(config: CollabConfig = {}): Extension {
  return [collabField, collabConfig.of({ generatedID: Math.floor(Math.random() * 1e9).toString(36), ...config })];
}

/**
 * Where the character at `pos` in the text AFTER `desc` was before it: its
 * position in the text before, or -1 when `desc` inserted it.
 */
export function unmapChar(desc: ChangeDesc, pos: number): number {
  let out = -2;
  let shift = 0;
  desc.iterChangedRanges((fromA, toA, fromB, toB) => {
    if (out !== -2) return;
    if (pos < fromB) { out = pos - shift; return; }
    if (pos < toB) { out = -1; return; }
    shift = toB - toA;
  });
  return out === -2 ? pos - shift : out;
}

/** Positions where both change sets insert at the same spot (the ties ChangeSet.map orders by its `before` flag). */
function tiePoints(a: ChangeDesc, b: ChangeDesc): number[] {
  const keys = new Set<string>();
  a.iterChangedRanges((fromA, toA, fromB, toB) => { if (toB > fromB) keys.add(`${fromA}:${toA - fromA}`); });
  if (!keys.size) return [];
  const out: number[] = [];
  b.iterChangedRanges((fromA, toA, fromB, toB) => { if (toB > fromB && keys.has(`${fromA}:${toA - fromA}`)) out.push(fromA); });
  return out;
}

export interface ReceiveOptions {
  /**
   * Was the character at `pos` in the synced text (the room's text at
   * getSyncedVersion, before these updates) typed by this editor? Without it,
   * every tie goes the room's way, as upstream.
   */
  ownChar?: (pos: number) => boolean;
  /**
   * Map this editor's caret so that an insert landing exactly on it goes in
   * front of it (assoc 1) instead of after it (CodeMirror's default). The
   * caller decides when: lib/live-doc.ts, when the person inserting typed the
   * character just before the caret.
   */
  caretAfter?: boolean;
}

/**
 * Create a transaction that represents a set of new updates received from the
 * authority. Applying this transaction moves the state forward to adjust to
 * the authority's view of the document.
 */
export function receiveUpdates(state: EditorState, updates: readonly Update[], opts: ReceiveOptions = {}): Transaction {
  let { version, unconfirmed } = state.field(collabField);
  const { clientID } = state.facet(collabConfig);
  version += updates.length;
  let effects: readonly StateEffect<unknown>[] = [];
  let changes: ChangeSet | null = null;
  let own = 0;
  for (const update of updates) {
    const ours = own < unconfirmed.length ? unconfirmed[own] : null;
    if (ours && ours.clientID == update.clientID) {
      if (changes) changes = changes.map(ours.changes, true);
      effects = StateEffect.mapEffects(effects, update.changes);
      own++;
    } else {
      effects = StateEffect.mapEffects(effects, update.changes);
      if (update.effects) effects = effects.concat(update.effects);
      changes = changes ? changes.compose(update.changes) : update.changes;
    }
  }
  // This editor's updates the room just confirmed: the text the rest of the
  // unconfirmed updates start from is the synced text plus these.
  const confirmed = unconfirmed.slice(0, own);
  if (own) unconfirmed = unconfirmed.slice(own);
  if (unconfirmed.length) {
    if (changes) {
      const rest = unconfirmed;
      const ownChar = opts.ownChar;
      // Is the character at `pos` this editor's, in the text rest[i] applies to
      // (the synced text, then the confirmed updates, then rest[0..i-1] as typed)?
      const mine = (pos: number, i: number): boolean => {
        let p = pos;
        for (let k = i - 1; k >= 0; k--) { p = unmapChar(rest[k].changes, p); if (p < 0) return true; }
        for (let k = confirmed.length - 1; k >= 0; k--) { p = unmapChar(confirmed[k].changes, p); if (p < 0) return true; }
        return ownChar ? ownChar(p) : false;
      };
      unconfirmed = rest.map((update, i) => {
        const theirs = changes!;
        const mineFirst = !!ownChar && tiePoints(theirs, update.changes).some((at) => at > 0 && mine(at - 1, i));
        const updateChanges = update.changes.map(theirs, mineFirst);
        changes = theirs.map(update.changes, !mineFirst);
        return new LocalUpdate(update.origin, updateChanges, StateEffect.mapEffects(update.effects, changes), clientID);
      });
    }
    if (effects.length) {
      const composed = unconfirmed.reduce((ch, u) => ch.compose(u.changes), ChangeSet.empty(unconfirmed[0].changes.length));
      effects = StateEffect.mapEffects(effects, composed);
    }
  }
  if (!changes) return state.update({ annotations: [collabReceive.of(new CollabState(version, unconfirmed))] });
  return state.update({
    changes,
    ...(opts.caretAfter ? { selection: state.selection.map(changes, 1) } : {}),
    effects,
    annotations: [
      Transaction.addToHistory.of(false),
      Transaction.remote.of(true),
      collabReceive.of(new CollabState(version, unconfirmed)),
    ],
    filter: false,
  });
}

/**
 * The locally made updates that still have to be sent to the authority. Each
 * has an `origin`, the transaction that created it (the updates may have been
 * mapped since; the transaction is the original).
 */
export function sendableUpdates(state: EditorState): readonly (Update & { origin: Transaction })[] {
  return state.field(collabField).unconfirmed;
}

/** The version up to which the collab plugin has synced with the central authority. */
export function getSyncedVersion(state: EditorState): number {
  return state.field(collabField).version;
}

/** This editor's collaborative editing client ID. */
export function getClientID(state: EditorState): string {
  return state.facet(collabConfig).clientID;
}
