// Who may open a program sent in a message (migration 0054): exactly the people who may read the message it came
// with (threadAccess: two people, a group's people, a channel's class, and the class's teachers for everything between
// students). Once a teacher removed the message, only the class's teachers; once its author deleted it (0056), only the
// class's teachers and an admin. Used by GET /api/shares/[id] and POST /api/shares/[id]/assets, so the two cannot drift.

import { threadAccess, type SessionData, type ShareRow } from './messages';
import { isShareId } from '../../lib/messages-core';

export type OpenedShare = { row: ShareRow; access: NonNullable<Awaited<ReturnType<typeof threadAccess>>> };

/** The share and the caller's access to its conversation, or null for anyone who may not open it (and a bad id). */
export async function openShare(db: D1Database, data: SessionData, id: string): Promise<OpenedShare | null> {
  if (!isShareId(id)) return null;
  const row = await db.prepare(`SELECT * FROM message_shares WHERE id = ?`).bind(id).first<ShareRow>();
  if (!row) return null;
  const a = await threadAccess(db, data, row.thread_id);
  const msg = await db.prepare(`SELECT deleted_at, retracted_at FROM messages WHERE id = ?`).bind(row.message_id)
    .first<{ deleted_at: number | null; retracted_at: number | null }>();
  if (!a || !a.read || !msg) return null;
  if (msg.deleted_at != null && !a.moderate) return null;
  if (msg.retracted_at != null && !(a.role === 'teacher' || data.role === 'admin')) return null;
  return { row, access: a };
}
