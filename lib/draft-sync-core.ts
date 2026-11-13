// The rules for written answers and flowchart drafts that upload by themselves (per-account
// storage, stage 3). Pure: no storage, no fetch, no clock. The browser half is lib/draft-sync.ts.
//
// A written answer, or a flowchart as JSON text, is one whole document. It is never merged. When
// this computer and the account both changed it, both are kept and the student chooses.
//
// Quiz picks before Check are deliberately NOT here: they stay on the computer until Check, as
// before stage 3.

// ---- text drafts (written answers, flowcharts) -------------------------------------------

/** The account's other version, waiting for the student's choice. */
export interface OtherText {
  text: string;
  updatedAt: number;
}

/** What this computer knows about the account's draft row for one lesson. */
export interface TextSync {
  /** `updatedAt` of the account's row this computer last saw; null = no row. */
  base: number | null;
  /** That row's text; null = no row. */
  text: string | null;
  /** Set while there are two versions. Nothing uploads until the student chooses. */
  other?: OtherText;
}

export const NO_TEXT_SYNC: TextSync = { base: null, text: null };

export interface TextArrivalInput {
  /** This browser's stored text for the page's owner; null or '' = nothing here. */
  local: string | null;
  /** Text that counts as nothing (a flowchart's untouched starter). */
  blank?: string;
  sync: TextSync | null;
  /** The account's row; null = none. */
  server: { text: string; updatedAt: number } | null;
}

export interface TextArrival {
  /** What the page opens with. 'conflict' opens this computer's text and asks. */
  use: 'local' | 'server' | 'conflict';
  /**
   * Opening the account's text over text this computer cannot place (no record of ever agreeing
   * with the account: work from before stage 3). The caller keeps this computer's text first
   * and, if it cannot, treats this as two versions instead.
   */
  keepLocal?: boolean;
  /** This computer has text the account does not: queue an upload. */
  upload: boolean;
  sync: TextSync;
}

/**
 * What a written answer or a flowchart opens with, signed in.
 *
 *  * Nothing here, or the same text: the account's.
 *  * Not changed here since this computer last agreed with the account: the account's.
 *  * Changed here, and the account's row is the one this computer last saw: this computer's
 *    (it uploads).
 *  * Changed on both: two versions. This computer's stays open and the student chooses.
 *  * This computer cannot tell (it has text but no record of ever agreeing with the account,
 *    which is every draft from before stage 3): the account's opens, as it did then, and this
 *    computer's is kept beside it (`keepLocal`).
 */
export function textArrival(input: TextArrivalInput): TextArrival {
  const sync = input.sync ?? NO_TEXT_SYNC;
  const local = input.local === null || input.local === input.blank ? '' : input.local;
  const server = input.server;
  if (!server) {
    // No row in the account (never saved, or purged with a class): whatever is here is all there is.
    return { use: 'local', upload: local !== '', sync: { base: null, text: null } };
  }
  const agreed: TextSync = { base: server.updatedAt, text: server.text };
  if (local === '' || local === server.text) return { use: 'server', upload: false, sync: agreed };
  const known = input.sync !== null;
  if (known && local === sync.text && !sync.other) return { use: 'server', upload: false, sync: agreed };
  if (known && sync.base === server.updatedAt && !sync.other) {
    return { use: 'local', upload: true, sync: { base: sync.base, text: sync.text } };
  }
  if (!known) return { use: 'server', keepLocal: true, upload: false, sync: agreed };
  return conflictWith(sync, server);
}

/** Two versions: this computer's stays open, the account's waits for the student's choice. */
export function conflictWith(sync: TextSync, server: { text: string; updatedAt: number }): TextArrival {
  return {
    use: 'conflict',
    upload: false,
    sync: { base: sync.base, text: sync.text, other: { text: server.text, updatedAt: server.updatedAt } },
  };
}
