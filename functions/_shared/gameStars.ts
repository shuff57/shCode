// Stars on class games (migration 0052), GitHub's starring in plain words: a
// toggle that says "I like this" and keeps the game in your Starred list. The
// reads the star route and the game lists share. No email ever leaves here.

/** How many stars each game in `ids` has, and which of them `email` starred. */
export async function starsFor(db: D1Database, ids: string[], email: string): Promise<{ counts: Map<string, number>; mine: Set<string> }> {
  const counts = new Map<string, number>();
  const mine = new Set<string>();
  // D1 caps bound parameters per statement.
  for (let i = 0; i < ids.length; i += 90) {
    const chunk = ids.slice(i, i + 90);
    const marks = chunk.map(() => '?').join(',');
    const rows = (await db.prepare(
      `SELECT game_id, COUNT(*) AS n, MAX(from_email = ?) AS me FROM game_stars WHERE game_id IN (${marks}) GROUP BY game_id`,
    ).bind(email, ...chunk).all<{ game_id: string; n: number; me: number }>()).results ?? [];
    for (const r of rows) {
      counts.set(r.game_id, r.n);
      if (r.me) mine.add(r.game_id);
    }
  }
  return { counts, mine };
}
