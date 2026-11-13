// How a page starts the outbox (lib/outbox.ts): the senders come in by dynamic import, after
// the page has rendered, and the account is asked fresh from GET /api/me. Both are tried again
// on `online` and when the tab becomes visible, so a page opened offline still uploads once the
// connection is back. components/OutboxRunner.tsx calls this from an effect; the tests call it
// the same way. Nothing runs at import.

import { refreshCurrentUser } from './auth';
import { pageIsAccount } from './owned-storage';
import { startOutbox, type StartOptions } from './outbox';

export function startOutboxForPage(overrides: Partial<StartOptions> = {}): () => void {
  if (!pageIsAccount()) return () => {};
  return startOutbox({
    me: refreshCurrentUser,
    loadSenders: () => import('./outbox-senders').then((m) => m.installOutboxSenders()),
    ...overrides,
  });
}
