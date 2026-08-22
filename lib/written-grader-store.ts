'use client';

// Server-backed persistence for WrittenGrader. The draft is a single
// latest-text row per (student, lesson); submissions are append-only.
// All mutations short-circuit when the caller is unauthed — the
// component still has localStorage as a fast-path draft cache.

export interface SubmissionRecord {
  id: string;
  lessonId: string;
  response: string;
  gradeJson: unknown | null;
  score: number | null;
  possible: number | null;
  submittedAt: number;
}

interface DraftPayload {
  response: string;
  updatedAt: number;
}

export async function fetchDraft(lessonId: string): Promise<DraftPayload | null> {
  try {
    const res = await fetch(`/api/lesson-drafts/${encodeURIComponent(lessonId)}`, {
      credentials: 'include',
    });
    if (res.status === 404 || res.status === 401) return null;
    if (!res.ok) return null;
    return (await res.json()) as DraftPayload;
  } catch {
    return null;
  }
}

export async function saveDraft(lessonId: string, response: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/lesson-drafts/${encodeURIComponent(lessonId)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchSubmissions(lessonId: string): Promise<SubmissionRecord[]> {
  try {
    const res = await fetch(`/api/lesson-submissions?lessonId=${encodeURIComponent(lessonId)}`, {
      credentials: 'include',
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { submissions?: SubmissionRecord[] };
    return data.submissions ?? [];
  } catch {
    return [];
  }
}

/** score/possible are omitted for an ungraded attempt — a submission recorded
 *  because grading failed. The endpoint stores NULL for both, and the teacher
 *  queue treats a row with no score as one that still needs marking. */
export async function recordSubmission(input: {
  lessonId: string;
  response: string;
  gradeJson: unknown;
  score?: number;
  possible?: number;
}): Promise<boolean> {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now()) + Math.random().toString(36).slice(2, 10);
  try {
    const res = await fetch('/api/lesson-submissions', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...input }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
