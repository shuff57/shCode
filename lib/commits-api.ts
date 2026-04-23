// Fetch wrappers around the Cloudflare Pages Functions commit API.
// All requests are same-origin; the Cloudflare Access CF_Authorization
// cookie is sent automatically.

import type { Commit } from './types';

interface ApiCommit {
  id: string;
  lessonId: string;
  message: string;
  files: Record<string, string>;
  changedFileIds: string[];
  createdAt: number;
  authoredByEmail?: string;
}

function toClientCommit(api: ApiCommit): Commit {
  return {
    id: api.id,
    message: api.message,
    timestamp: api.createdAt,
    changedFileIds: api.changedFileIds,
    fileContentsSnapshot: api.files,
    authoredByEmail: api.authoredByEmail,
  };
}

export class ApiError extends Error {
  constructor(public status: number, public body: string) {
    super(`${status}: ${body}`);
  }
}

async function readText(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return '';
  }
}

export async function listCommits(lessonId: string): Promise<Commit[]> {
  const res = await fetch(`/api/commits?lessonId=${encodeURIComponent(lessonId)}`, {
    credentials: 'same-origin',
  });
  if (!res.ok) throw new ApiError(res.status, await readText(res));
  const data = (await res.json()) as { commits: ApiCommit[] };
  return (data.commits ?? []).map(toClientCommit);
}

export async function createCommit(
  lessonId: string,
  commit: Commit,
): Promise<Commit> {
  const res = await fetch('/api/commits', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: commit.id,
      lessonId,
      message: commit.message,
      files: commit.fileContentsSnapshot,
      changedFileIds: commit.changedFileIds,
    }),
  });
  if (!res.ok) throw new ApiError(res.status, await readText(res));
  const data = (await res.json()) as { commit: ApiCommit };
  return toClientCommit(data.commit);
}

export async function deleteCommit(id: string): Promise<void> {
  const res = await fetch(`/api/commits/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    credentials: 'same-origin',
  });
  if (!res.ok) throw new ApiError(res.status, await readText(res));
}
