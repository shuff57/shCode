// GET /api/games/shared  — games shared into the caller's classes
//
// Games classmates (or the caller) shared into a class the caller is in. A
// student never sees hidden ones; a teacher of the class sees them, marked.
// One entry per game even when it is shared into two of the caller's classes.
// No code here (GET /api/games/[id] has it) and no emails: the publisher shows
// as first name + last initial.

import { callerClasses, gamesSharedInto, json, type SessionData } from '../../../_shared/games';
import { ownerLabel } from '../../../_shared/libraryShare';
import { modeLabel, type GameMode } from '../../../../lib/games-core';
import { choiceOf, provenanceFromRow } from '../../../../lib/share-choice';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, string, SessionData>;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }: Ctx) => {
  const { all, teaches } = await callerClasses(env.DB, data);
  const rows = await gamesSharedInto(env.DB, all);
  const seen = new Map<string, Record<string, unknown>>();
  for (const r of rows) {
    const canModerate = teaches.has(r.class_id) || data.role === 'admin';
    if (r.hidden_at != null && !canModerate) continue;
    const prev = seen.get(r.id);
    // A game visible in one class and hidden in another is visible.
    if (prev) { if (prev.hidden && r.hidden_at == null) prev.hidden = false; continue; }
    seen.set(r.id, {
      id: r.id, title: r.title, mode: r.mode, players: r.players,
      modeLabel: modeLabel(r.mode as GameMode, r.players), bytes: r.bytes,
      owner: ownerLabel(r.first_name, r.last_name),
      mine: r.owner_email === data.email,
      classId: r.class_id, className: r.class_name,
      sharedAt: r.shared_at, updatedAt: r.updated_at, hidden: r.hidden_at != null,
      choice: choiceOf(r.share_choice), remixedFrom: provenanceFromRow(r),
    });
  }
  return json({ games: [...seen.values()] });
};
