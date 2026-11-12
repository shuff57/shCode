'use client';

// Mounted once in the root layout. Starts the outbox (lib/outbox.ts, lib/outbox-page.ts): work
// kept on this computer that has not reached the account uploads by itself when the page loads,
// when the connection comes back, when the tab comes back, 30 s after the last change, and as
// the tab closes. Renders nothing and delays nothing: the senders are loaded after the page has
// rendered (and again later if that failed), and a signed-out ("guest") page never uploads.

import { useEffect } from 'react';
import { startOutboxForPage } from '../lib/outbox-page';

export default function OutboxRunner() {
  useEffect(() => startOutboxForPage(), []);
  return null;
}
