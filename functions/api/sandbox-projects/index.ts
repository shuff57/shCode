// GET  /api/sandbox-projects -> { projects, deleted, max }
// POST /api/sandbox-projects { id, mode, name } -> 201 { project } (200 when it already exists)
//
// The signed-in student's sandbox projects (migration 0049). Only the list lives
// here; a project's code is the lesson-sync row and Cloud history under its
// lesson id (lib/sandbox-projects-core.ts). Every query is scoped to the session
// email.
//
// The first GET an account ever makes seeds the sandboxes it had before
// projects existed: one project per `sandbox-<mode>` lesson-sync row, or the
// moSHion sandbox when there is none, so the list is never empty on arrival
// and nobody's saved code goes missing. A sandbox only this browser has a draft
// of is added by the browser with a POST of its old id.
//
// The id is made by the browser (a new project opens at once, before this
// answers) and checked here. A POST of an id that already exists returns it
// unchanged, so a retry cannot make two; one that was deleted is refused, so a
// stale tab cannot bring back a project the student deleted elsewhere.

import {
  LEGACY_NAMES,
  MAX_PROJECTS,
  MODE_IDS,
  cleanName,
  isModeId,
  isProjectId,
  limitText,
} from '../../../lib/sandbox-projects-core';
import { json, toProject, type ProjectRow } from '../../_shared/sandboxProjects';

interface Env {
  DB: D1Database;
}
type SessionData = { email: string; role: 'admin' | 'teacher' | 'student' };

async function allRows(db: D1Database, email: string): Promise<ProjectRow[]> {
  const r = await db.prepare(
    'SELECT id, mode, name, created_at, updated_at, deleted_at FROM sandbox_projects WHERE student_email = ?',
  ).bind(email).all<ProjectRow>();
  return r.results ?? [];
}

async function seed(db: D1Database, email: string): Promise<void> {
  const saved = await db.prepare(
    `SELECT lesson_id FROM lesson_sync WHERE student_email = ? AND lesson_id IN (${MODE_IDS.map(() => '?').join(',')})`,
  ).bind(email, ...MODE_IDS.map((m) => `sandbox-${m}`)).all<{ lesson_id: string }>();
  const modes = MODE_IDS.filter((m) => (saved.results ?? []).some((r) => r.lesson_id === `sandbox-${m}`));
  if (modes.length === 0) modes.push('moshion');
  const now = Date.now();
  await db.batch(modes.map((m, i) => db.prepare(
    `INSERT OR IGNORE INTO sandbox_projects (student_email, id, mode, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  // A millisecond apart, so the list has a stable order (moSHion, the old default, comes first when present).
  ).bind(email, m, m, LEGACY_NAMES[m], now - (m === 'moshion' ? 0 : i + 1), now - (m === 'moshion' ? 0 : i + 1))));
}

export const onRequestGet: PagesFunction<Env, string, SessionData> = async ({ env, data }) => {
  let rows = await allRows(env.DB, data.email);
  if (rows.length === 0) {
    await seed(env.DB, data.email);
    rows = await allRows(env.DB, data.email);
  }
  return json({
    projects: rows.filter((r) => r.deleted_at == null).map(toProject),
    deleted: rows.filter((r) => r.deleted_at != null).map((r) => ({ id: r.id, mode: r.mode })),
    max: MAX_PROJECTS,
  });
};

export const onRequestPost: PagesFunction<Env, string, SessionData> = async ({ request, env, data }) => {
  let body: { id?: unknown; mode?: unknown; name?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }
  if (!isModeId(body?.mode)) return json({ error: 'Pick a type for the project.' }, 400);
  const mode = body.mode;
  if (!isProjectId(body.id, mode)) return json({ error: 'That is not a project id.' }, 400);
  const id = body.id;
  const name = cleanName(body.name);
  if (!name) return json({ error: 'Give the project a name.' }, 400);

  const existing = await env.DB.prepare(
    'SELECT id, mode, name, created_at, updated_at, deleted_at FROM sandbox_projects WHERE student_email = ? AND id = ?',
  ).bind(data.email, id).first<ProjectRow>();
  if (existing) {
    if (existing.deleted_at != null) return json({ error: 'That project was deleted.', deleted: true }, 409);
    if (existing.mode !== mode) return json({ error: 'That is not a project id.' }, 400);
    return json({ project: toProject(existing) });
  }

  const live = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM sandbox_projects WHERE student_email = ? AND deleted_at IS NULL',
  ).bind(data.email).first<{ n: number }>();
  if ((live?.n ?? 0) >= MAX_PROJECTS) return json({ error: limitText(), limit: true }, 409);

  const now = Date.now();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO sandbox_projects (student_email, id, mode, name, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(data.email, id, mode, name, now, now).run();
  return json({ project: { id, mode, name, createdAt: now, updatedAt: now } }, 201);
};
