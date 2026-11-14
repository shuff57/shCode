// The page's side of messages (migration 0053): the calls the mailbox (components/Mailbox.tsx) and the
// bell's count make. The unread count is kept here so the bell and the mailbox agree, and a change is
// announced with MESSAGES_CHANGED so the bell recounts without asking the server again.

import { errorText } from './http-error';
import type { PeopleClass, ShareKind, ShareLang, ShareView, ThreadSummary, ThreadView } from './messages-core';

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

/** A sandbox program to send with a message (migration 0054). */
export type OutgoingShare =
  | { kind: Extract<ShareKind, 'copy'>; lang: ShareLang; title: string; code: string }
  | { kind: Extract<ShareKind, 'together' | 'watch'>; lang: ShareLang; title: string; room: string };

export function sendNew(classId: string, to: string, body: string, share?: OutgoingShare): Promise<Result<ThreadView>> {
  return ask<ThreadView>('/api/messages', post({ classId, to, body, share }));
}

export function sendReply(threadId: string, body: string, share?: OutgoingShare): Promise<Result<ThreadView>> {
  return ask<ThreadView>(`/api/messages/${encodeURIComponent(threadId)}`, post({ body, share }));
}

export function fetchShare(id: string): Promise<Result<ShareView>> {
  return ask<ShareView>(`/api/shares/${encodeURIComponent(id)}`);
}

/** Where a program's card leads: the copy's own page, or the sandbox ready to join the session. */
export function shareHref(card: { id: string; kind: ShareKind; lang: ShareLang; room?: string }): string {
  // A watch invitation opens on /shared, where the program is shown read-only as it is typed.
  if (card.kind === 'together') return card.room ? `/sandbox/?join=${encodeURIComponent(card.room)}&lang=${card.lang}` : `/shared/?id=${card.id}`;
  return `/shared/?id=${card.id}`;
}
