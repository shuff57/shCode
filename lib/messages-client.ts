// The page's side of messages (migration 0053): the calls the mailbox (components/Mailbox.tsx) and the
// bell's count make. The unread count is kept here so the bell and the mailbox agree, and a change is
// announced with MESSAGES_CHANGED so the bell recounts without asking the server again.

import { errorText } from './http-error';
import type { PeopleClass, ThreadSummary, ThreadView } from './messages-core';

export const MESSAGES_CHANGED = 'shcode:messages-changed';

let unread = 0;
export function messageUnread(): number { return unread; }
function setUnread(n: number): void {
  if (n === unread) return;
  unread = n;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(MESSAGES_CHANGED));
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

async function ask<T>(url: string, init?: RequestInit): Promise<Result<T>> {
  let res: Response;
  try {
    res = await fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init });
  } catch {
    return { ok: false, error: 'Could not reach shCode. Check your connection and try again.', status: 0 };
  }
  if (!res.ok) return { ok: false, error: await errorText(res), status: res.status };
  return { ok: true, value: (await res.json()) as T };
}

/** Asks how many conversations have something unread; keeps the last answer if it cannot. */
export async function refreshMessageCount(): Promise<number> {
  const r = await ask<{ unread: number }>('/api/messages?count=1');
  if (r.ok) setUnread(r.value.unread);
  return unread;
}

export async function fetchThreads(): Promise<Result<ThreadSummary[]>> {
  const r = await ask<{ threads: ThreadSummary[]; unread: number }>('/api/messages');
  if (!r.ok) return r;
  setUnread(r.value.unread);
  return { ok: true, value: r.value.threads };
}

export async function fetchThread(id: string): Promise<Result<ThreadView>> {
  const r = await ask<ThreadView>(`/api/messages/${encodeURIComponent(id)}`);
  // Opening it marked it read on the server.
  if (r.ok) void refreshMessageCount();
  return r;
}

export async function fetchPeople(): Promise<Result<PeopleClass[]>> {
  const r = await ask<{ classes: PeopleClass[] }>('/api/messages?people=1');
  return r.ok ? { ok: true, value: r.value.classes } : r;
}

const post = (body: unknown): RequestInit => ({
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});

export function sendNew(classId: string, to: string, body: string): Promise<Result<ThreadView>> {
  return ask<ThreadView>('/api/messages', post({ classId, to, body }));
}

export function sendReply(threadId: string, body: string): Promise<Result<ThreadView>> {
  return ask<ThreadView>(`/api/messages/${encodeURIComponent(threadId)}`, post({ body }));
}
