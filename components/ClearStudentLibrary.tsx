'use client';

// "Clear Library…" in a student's row menu on the class page's Students tab:
// deletes every picture, sound, uploaded image and published game of that
// student (POST /api/classes/[id]/clear-library). The teacher types the
// student's first name to confirm, and the toast says what went.

import { useCallback } from 'react';
import { errorText } from '../lib/http-error';
import { clearLibraryConfirm, clearedSentence, type ClearCounts } from '../lib/library-delete-words';
import { useFeedback } from './FeedbackProvider';

/** Returns the action for the row menu. Must be used under the teacher page's FeedbackProvider. */
export function useClearStudentLibrary(classId: string) {
  const { confirm, toast } = useFeedback();
  return useCallback(async (email: string, firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.trim() || null;
    const last = lastName?.trim() || '';
    const label = first ? (last ? `${first} ${last[0].toUpperCase()}.` : first) : email;
    const words = clearLibraryConfirm(label, first);
    const ok = await confirm({
      ...words,
      confirmLabel: 'Clear Library',
      danger: true,
      requireText: first ?? email,
    });
    if (!ok) return;
    const res = await fetch(`/api/classes/${encodeURIComponent(classId)}/clear-library`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).catch(() => null);
    if (!res) { toast(`Could not clear ${label}'s Library: network error. Try again.`, { kind: 'error' }); return; }
    if (!res.ok) { toast(`Could not clear ${label}'s Library: ${await errorText(res)}`, { kind: 'error' }); return; }
    toast(clearedSentence(label, (await res.json()) as ClearCounts));
  }, [classId, confirm, toast]);
}
