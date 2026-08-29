// DELETE /api/issue-reports/[id] — remove one report for good.
//
// Staff only. This exists for the reports that should never have been in the
// queue at all: a duplicate, a misfire, or one of your own filed while
// testing the button. Triage statuses are for real reports that are done;
// this is for reports that were never real. Keeping "fixed" and "was noise"
// as the same state makes the export useless as a handoff document.
//
// A student cannot delete their own report, deliberately. The flood guard in
// index.ts counts open reports, so self-delete would be a way to file
// unlimited reports by clearing the counter, and "I take it back" is what
// the deferred status is for.
//
// The screenshot goes with it. That attachment only ever exists because the
// report exists — the report modal is the only thing that creates one — so
// leaving the image behind would quietly hold bytes against the reporter's
// upload quota forever, with nothing left in the UI pointing at it.

import { isUploadId } from '../../../_shared/uploads';

interface Env {
  DB: D1Database;
  UPLOADS: R2Bucket;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };
type Ctx = EventContext<Env, 'id', SessionData>;

export const onRequestDelete: PagesFunction<Env, 'id', SessionData> = async (context: Ctx) => {
  const { env, data, params } = context;

  if (data.role === 'student') return json({ error: 'Staff only' }, 403);

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Invalid report id' }, 400);

  // Read the attachment id BEFORE the row is gone — after the DELETE there is
  // nothing left to tell us which upload belonged to it.
  const row = await env.DB.prepare(
    `SELECT screenshot_id FROM issue_reports WHERE id = ?`,
  )
    .bind(id)
    .first<{ screenshot_id: string | null }>();

  if (!row) return json({ error: 'Report not found' }, 404);

  const result = await env.DB.prepare(`DELETE FROM issue_reports WHERE id = ?`).bind(id).run();
  if (result.meta.changes === 0) return json({ error: 'Report not found' }, 404);

  // The report is gone either way; a failure to clean up the image must not
  // turn into a 500 that makes the caller retry a delete that already
  // happened. Worst case is an orphaned object, which is invisible and costs
  // a few KB -- the same tradeoff functions/api/uploads/index.ts documents.
  let screenshotDeleted = false;
  const shot = row.screenshot_id;
  if (shot && isUploadId(shot)) {
    try {
      // Paranoia, cheap: never pull an image out from under a different
      // report that somehow points at the same upload.
      const stillUsed = await env.DB.prepare(
        `SELECT id FROM issue_reports WHERE screenshot_id = ? LIMIT 1`,
      )
        .bind(shot)
        .first<{ id: number }>();

      if (!stillUsed) {
        await env.DB.prepare(`DELETE FROM uploads WHERE id = ?`).bind(shot).run();
        if (env.UPLOADS) await env.UPLOADS.delete(shot);
        screenshotDeleted = true;
      }
    } catch {
      /* orphan left behind; the report delete still stands */
    }
  }

  return json({ deleted: id, screenshotDeleted });
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
