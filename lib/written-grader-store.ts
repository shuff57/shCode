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

// ---------------------------------------------------------------------------
// Streaming grade reader.
//
// Calls POST /api/grade-written?stream=1 and reports each stage as it lands, so
// Submit shows movement instead of a motionless spinner. Resolves with the same
// shape the non-streaming endpoint returns, so callers keep one success path.
//
// Falls back to the plain JSON endpoint when the response is not NDJSON --
// an older deploy, or a proxy that rewrote the content type. The fallback is
// what makes this safe to ship before the Function is deployed everywhere.

import {
  DEFAULT_GRADER,
  isGraderId,
  type GradeStage,
  type GradeStreamEvent,
  type GraderId,
  type GraderListResponse,
  type GraderOption,
} from './grade-written-core';

export interface StreamGradeResult {
  ok: boolean;
  status: number;
  /** Parsed body: the grade on success, or {error, offline} on failure. */
  data: any;
}

export async function streamGrade(
  body: unknown,
  onStage: (stage: GradeStage, chars?: number) => void,
): Promise<StreamGradeResult> {
  const res = await fetch('/api/grade-written?stream=1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  });

  const ctype = res.headers.get('Content-Type') || '';

  // Every pre-flight refusal (429, 503, 400, locked) still arrives as plain
  // JSON with a real status -- the Function deliberately runs those checks
  // before writing a byte. Hand them back untouched.
  if (!res.body || !ctype.includes('ndjson')) {
    const text = await res.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      return { ok: false, status: res.status, data: null };
    }
    return { ok: res.ok && !!data?.ok, status: res.status, data };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let terminal: any = null;

  const handle = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let evt: GradeStreamEvent;
    try {
      evt = JSON.parse(trimmed);
    } catch {
      return;
    }
    if ('stage' in evt) {
      onStage(evt.stage, evt.chars);
    } else if ('result' in evt) {
      terminal = evt.result;
    } else if ('error' in evt) {
      terminal = { ok: false, error: evt.error, offline: evt.offline, raw: evt.raw };
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) handle(line);
  }
  if (buf) handle(buf);

  // A stream that ended with no terminal line means the connection dropped
  // mid-grade. Surface that as a retryable failure rather than a silent
  // success with an empty result.
  if (!terminal) {
    return {
      ok: false,
      status: res.status,
      data: { ok: false, error: 'The grader disconnected before finishing. Try again.' },
    };
  }
  return { ok: terminal.ok !== false, status: res.status, data: terminal };
}

// ---------------------------------------------------------------------------
// Which grader to use
//
// The menu comes from the server, because only the server knows which targets
// this deploy configured. Asking rather than hardcoding is what stops the
// picker offering a classroom grader to a site that has none.

export async function fetchGraders(): Promise<GraderOption[]> {
  try {
    const res = await fetch('/api/grade-written', { credentials: 'same-origin' });
    if (!res.ok) return [];
    const data = (await res.json()) as GraderListResponse;
    return Array.isArray(data?.graders) ? data.graders : [];
  } catch {
    // An older deploy has no GET here. Returning nothing makes the picker hide
    // itself and everything falls through to the default -- which is exactly
    // what happened before the picker existed.
    return [];
  }
}

// The choice is a per-browser preference, not progress: it says where a student
// is sitting right now, so it has no business syncing to another device.
const GRADER_PREF_KEY = 'shCode:grader';

export function loadGraderPref(): GraderId {
  try {
    const v = localStorage.getItem(GRADER_PREF_KEY);
    if (isGraderId(v)) return v;
  } catch {}
  return DEFAULT_GRADER;
}

export function saveGraderPref(id: GraderId): void {
  try {
    localStorage.setItem(GRADER_PREF_KEY, id);
  } catch {}
}
