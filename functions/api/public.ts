// GET /api/public  (migration 0058; spec codehs-review/ASSET-AUDIENCE-SPEC.md)
//
// Library -> "Everyone": the pictures, sounds, fonts and games students made public, newest first. Only a VETTED viewer
// gets it (a student in a live class, a teacher, an admin: functions/_shared/publicShare.ts viewerVetted); anyone else
// gets 403, because signup is open and "any signed-in account" would be the open web. Pulled items and items whose owner
// is blocked (left every class, or a class switched Everyone off) are not listed. Owners are first name + last initial,
// never an email. Same shapes as /api/library/shared and /api/games/shared so the Library can draw them the same way.

import { json, type SessionData } from '../_shared/games';
import { itemChoices } from '../_shared/shareChoice';
import { ownerLabel } from '../_shared/libraryShare';
import { publicGames, publicItems, viewerVetted } from '../_shared/publicShare';
import { starsFor } from '../_shared/gameStars';
import { modeLabel, type GameMode } from '../../lib/games-core';
import { canRemix, choiceOf, provenanceFromRow } from '../../lib/share-choice';

interface Env {
  DB: D1Database;
}
type Ctx = EventContext<Env, string, SessionData>;

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }: Ctx) => {
  if (!(await viewerVetted(env.DB, data))) {
    return json({ error: 'Everyone is for people in a class. Join a class to see what students shared.', vetted: false }, 403);
  }
  const [items, games] = await Promise.all([publicItems(env.DB), publicGames(env.DB)]);

  const choices = await itemChoices(env.DB, items.map((i) => i.id));
  const { counts, mine } = await starsFor(env.DB, games.map((g) => g.id), data.email);
  return json({
    vetted: true,
    items: items.map((r) => {
      const c = choices.get(r.id);
      const choice = c?.choice ?? choiceOf(r.share_choice);
      const isMine = r.owner_email === data.email;
      return {
        id: r.id, kind: r.kind, name: r.name, bytes: r.bytes, owner: ownerLabel(r.first_name, r.last_name, r.alias), mine: isMine,
        classId: '', className: 'Everyone', sharedAt: r.shared_at, hidden: false,
        choice, remixedFrom: c?.remixedFrom ?? null, canCopy: isMine || canRemix(choice),
      };
    }),
    games: games.map((r) => ({
      id: r.id, title: r.title, mode: r.mode, players: r.players, modeLabel: modeLabel(r.mode as GameMode, r.players), bytes: r.bytes,
      owner: ownerLabel(r.first_name, r.last_name, r.alias), mine: r.owner_email === data.email,
      classId: '', className: 'Everyone', sharedAt: r.shared_at, updatedAt: r.updated_at, hidden: false,
      choice: choiceOf(r.share_choice), remixedFrom: provenanceFromRow(r),
      stars: counts.get(r.id) ?? 0, starred: mine.has(r.id),
    })),
  });
};
