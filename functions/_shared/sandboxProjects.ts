// Shared by functions/api/sandbox-projects/* (migration 0049). Rules: lib/sandbox-projects-core.ts.

export interface ProjectRow {
  id: string;
  mode: string;
  name: string;
  created_at: number;
  updated_at: number;
  deleted_at: number | null;
}

export function toProject(r: ProjectRow) {
  return { id: r.id, mode: r.mode, name: r.name, createdAt: r.created_at, updatedAt: r.updated_at };
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
