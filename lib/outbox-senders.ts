// What the outbox (lib/outbox.ts) knows how to send, installed by lib/outbox-page.ts.
//
//  * lab and sandbox code (`progress:<lessonId>`): lib/lesson-sync.ts `labSender`, through the
//    existing PUT /api/lesson-sync/[id] with `auto: true`.
//
// Flowchart drafts are NOT here: a retried POST /api/lesson-drafts/[id] cannot tell whether
// the server's copy is newer (the route has no `baseUpdatedAt` yet), so a late retry could
// overwrite work from another computer. Their retry waits for stage 3.
//
// Installing is a function call, never an import side effect.

import { registerSender } from './outbox';
import { labSender } from './lesson-sync';

/** Register every sender. Returns the undo. */
export function installOutboxSenders(): () => void {
  const offs = [registerSender('lab', labSender)];
  return () => { for (const off of offs) off(); };
}
