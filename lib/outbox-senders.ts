// What the outbox (lib/outbox.ts) knows how to send, installed by lib/outbox-page.ts.
//
//  * lab and sandbox code (`progress:<lessonId>`): lib/lesson-sync.ts `labSender`, through the
//    existing PUT /api/lesson-sync/[id] with `auto: true`.
//  * written answers (`written:<lessonId>`) and flowchart drafts (`diagram:<lessonId>`): POST
//    /api/lesson-drafts/[id] with `baseUpdatedAt`, so a late upload cannot overwrite a newer row.
//    Both are lib/draft-sync.ts. (Quiz picks are not uploaded: see lib/outbox.ts.)
//
// Installing is a function call, never an import side effect.

import { registerSender } from './outbox';
import { labSender } from './lesson-sync';
import { diagramSender, writtenSender } from './draft-sync';

/** Register every sender. Returns the undo. */
export function installOutboxSenders(): () => void {
  const offs = [
    registerSender('lab', labSender),
    registerSender('written', writtenSender),
    registerSender('diagram', diagramSender),
  ];
  return () => { for (const off of offs) off(); };
}
