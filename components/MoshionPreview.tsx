'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useMoshionStorage } from '../lib/moshion-storage';
import { useMoshionOnline } from '../lib/moshion-online';
import MoshionLobby from './MoshionLobby';
import type { GameAsset } from '../lib/game-assets';

// Base64-url-safe encoder for UTF-8 strings.
export function encodeCode(code: string): string {
  const utf8 = unescape(encodeURIComponent(code));
  const b64 = typeof window === 'undefined' ? '' : window.btoa(utf8);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface Props {
  code: string;
  runKey: number;
  /**
   * The game this preview's online rooms belong to: the lobby bar (a sketch
   * that calls multiplayer('versus' | 'coop', n)) makes rooms with this key and
   * lists only rooms with the same key, so you never join a different game.
   * LessonWorkspace passes the lesson id, SandboxWorkspace 'sandbox', the Games
   * library's play page 'game-<id>'. Omitted, it is 'sandbox'. Fitted to the
   * server's rule (48 of a-z, 0-9, dash) by roomGameKey in lib/moshion-online.ts.
   */
  gameKey?: string;
  /**
   * A published game's own pictures and sounds (/play, from
   * GET /api/games/[id]/assets), laid over the store the sketch sees for this
   * run only and never saved into the player's library. The game's item wins
   * over a same-named one of the player's, unless `assetsOwnWins` (the
   * publisher playing their own game: their store on this computer wins).
   */
  assets?: readonly GameAsset[];
  assetsOwnWins?: boolean;
}

const MoshionPreview = forwardRef<HTMLIFrameElement, Props>(function MoshionPreview(
  { code, runKey, gameKey, assets, assetsOwnWins },
  ref
) {
  // An internal ref as well as the forwarded one: the storage bridge has to
  // check that a message came from THIS frame, and callers (LiveConsole posts
  // preview-eval) still need the node, so the forwarded ref is satisfied from
  // the same node rather than replaced.
  const innerRef = useRef<HTMLIFrameElement | null>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLIFrameElement, [runKey]);
  useMoshionStorage(innerRef, { assets, ownWins: assetsOwnWins });
  const online = useMoshionOnline(innerRef, gameKey);
  const lobby = online.lobby;

  if (runKey === 0 || !code.trim()) {
    return (
      <div className="reshape-empty">
        <p>Click <strong>Run</strong> to execute your moSHion sketch.</p>
      </div>
    );
  }
  const src = `/moshion/runner.html?code=${encodeCode(code)}&r=${runKey}`;
  // The wrapper is always there so the iframe is never remounted when the
  // lobby appears (that would rerun the sketch). With no lobby it is
  // display: contents, so the layout is exactly what it was before.
  return (
    <div
      className="moshion-preview-wrap"
      style={lobby ? { display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0 } : { display: 'contents' }}
    >
      {lobby ? <MoshionLobby view={lobby} actions={online.actions} gameKey={online.gameKey} device={online.device} /> : null}
      <iframe
        ref={innerRef}
        key={runKey}
        id="preview"
        className="reshape-frame"
        // See ReshapePreview for the reasoning: allow-same-origin is deliberately
        // absent so student code cannot reach /api/* with the session cookie.
        // Saves therefore go through the parent -- see lib/moshion-storage.ts.
        // allow-modals lets a student's prompt()/alert() work (a game-mode pick);
        // it adds no access to the parent's origin, cookies or API.
        sandbox="allow-scripts allow-downloads allow-modals"
        allow="autoplay; fullscreen; gamepad; clipboard-write"
        src={src}
        style={lobby ? { flex: '1 1 0', height: 'auto', minHeight: 0 } : undefined}
      />
    </div>
  );
});

export default MoshionPreview;
