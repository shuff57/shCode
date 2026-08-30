// POST /api/issue-reports/[id]/vote — thumbs up/down one report.
//
// Any signed-in user, students included. Body {vote: 1 | -1 | 0}. 1 and -1
// UPSERT the caller's row on the composite PK (report_id, voter_email) —
// changing your mind replaces the vote, it never stacks a second row. 0
// deletes the caller's row outright, which is what "clear my vote" means.
//
// The voter is always `data.email` from the session, never the request body
// — a body-supplied identity would let anyone vote as anyone.

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestPost: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params, request } = context;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Invalid report id' }, 400);

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  // request.json() parses a literal `null` (or a bare number/string/array)
  // without throwing -- only an object has a `.vote` to read off it.
  if (!parsed || typeof parsed !== 'object') {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  const body = parsed as { vote?: unknown };

  const vote = body.vote;
  if (vote !== 1 && vote !== -1 && vote !== 0) {
    return json({ error: 'vote must be one of: 1, -1, 0' }, 400);
  }

  const report = await env.DB.prepare(`SELECT id FROM issue_reports WHERE id = ?`)
    .bind(id)
    .first<{ id: number }>();
  if (!report) return json({ error: 'Report not found' }, 404);

  if (vote === 0) {
    await env.DB.prepare(
      `DELETE FROM issue_report_votes WHERE report_id = ? AND voter_email = ?`,
    )
      .bind(id, data.email)
      .run();
  } else {
    await env.DB.prepare(
      `INSERT INTO issue_report_votes (report_id, voter_email, vote, created_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(report_id, voter_email) DO UPDATE SET vote = excluded.vote, created_at = excluded.created_at`,
    )
      .bind(id, data.email, vote, Date.now())
      .run();
  }

  // Fresh tally, so the caller never has to guess what its own vote did to
  // the score — same reasoning as the {ok, id, status} shape on ../status.ts.
  const tally = await env.DB.prepare(
    `SELECT
        SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS up,
        SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS down
       FROM issue_report_votes
      WHERE report_id = ?`,
  )
    .bind(id)
    .first<{ up: number | null; down: number | null }>();

  const up = tally?.up ?? 0;
  const down = tally?.down ?? 0;

  return json({ ok: true, id, up, down, score: up - down, myVote: vote });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
