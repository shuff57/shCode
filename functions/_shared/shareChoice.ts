// Server half of lib/share-choice.ts (migration 0045): look up the original a
// remix came from, so its credit is taken from the original's own row and
// never from the client. The client only ever sends the original's id.
//
// The original is looked up by id whether or not it is still live or still
// shared: a remix keeps its credit after the original is deleted or unshared.
// Ids are 128-bit random and reach a browser only through a route that already
// showed the item, so this reveals nothing a guess could reach. The author is
// first name + last initial (ownerLabel), never an email. An id the caller owns
// is not a remix of someone else's work and gives null.

import { ownerLabel } from './libraryShare';
import {
  PROVENANCE_COLUMNS,
  choiceOf,
  provenanceFromRow,
  provenanceOf,
  type Provenance,
  type ProvenanceRow,
  type ShareChoice,
} from '../../lib/share-choice';

export interface Original {
  /** The original's own choice, now. */
  choice: ShareChoice;
  /** The provenance a remix of it records. */
  provenance: Provenance;
}

type ParentRow = ProvenanceRow & {
  id: string;
  title: string;
  owner_email: string;
  share_choice: string | null;
  first_name: string | null;
  last_name: string | null;
};

async function lookUp(db: D1Database, sql: string, id: string, callerEmail: string): Promise<Original | null> {
  const row = await db.prepare(sql).bind(id).first<ParentRow>();
  if (!row || row.owner_email === callerEmail) return null;
  const choice = choiceOf(row.share_choice);
  return {
    choice,
    provenance: provenanceOf({
      id: row.id,
      title: row.title,
      author: ownerLabel(row.first_name, row.last_name),
      choice,
      provenance: provenanceFromRow(row),
    }),
  };
}

/** The game `id` a remix came from, or null (unknown id, or the caller's own game). */
export function originalGame(db: D1Database, id: string, callerEmail: string): Promise<Original | null> {
  return lookUp(db,
    `SELECT g.id, g.title, g.owner_email, g.share_choice, ${PROVENANCE_COLUMNS.split(', ').map((c) => 'g.' + c).join(', ')},
            st.first_name, st.last_name
       FROM library_games g LEFT JOIN students st ON st.email = g.owner_email
      WHERE g.id = ?`, id, callerEmail);
}

/** The picture or sound `id` a copy came from, or null (unknown id, or the caller's own item). */
export function originalItem(db: D1Database, id: string, callerEmail: string): Promise<Original | null> {
  return lookUp(db,
    `SELECT i.id, i.name AS title, i.owner_email, i.share_choice, ${PROVENANCE_COLUMNS.split(', ').map((c) => 'i.' + c).join(', ')},
            st.first_name, st.last_name
       FROM library_items i LEFT JOIN students st ON st.email = i.owner_email
      WHERE i.id = ?`, id, callerEmail);
}

/** Choice and provenance of many library items at once, by id (for the class library list). */
export async function itemChoices(db: D1Database, ids: string[]): Promise<Map<string, { choice: ShareChoice; remixedFrom: Provenance | null }>> {
  const out = new Map<string, { choice: ShareChoice; remixedFrom: Provenance | null }>();
  // D1 caps bound parameters at 100 per statement.
  for (let i = 0; i < ids.length; i += 90) {
    const part = ids.slice(i, i + 90);
    const r = await db.prepare(
      `SELECT id, share_choice, ${PROVENANCE_COLUMNS} FROM library_items WHERE id IN (${part.map(() => '?').join(',')})`,
    ).bind(...part).all<ProvenanceRow & { id: string; share_choice: string | null }>();
    for (const row of r.results ?? []) out.set(row.id, { choice: choiceOf(row.share_choice), remixedFrom: provenanceFromRow(row) });
  }
  return out;
}
