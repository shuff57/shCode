'use client';

import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useMoshionStorage } from '../lib/moshion-storage';

// Base64-url-safe encoder for UTF-8 strings.
export function encodeCode(code: string): string {
  const utf8 = unescape(encodeURIComponent(code));
  const b64 = typeof window === 'undefined' ? '' : window.btoa(utf8);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface Props {
  code: string;
  runKey: number;
}

const MoshionPreview = forwardRef<HTMLIFrameElement, Props>(function MoshionPreview(
  { code, runKey },
  ref
) {
  // An internal ref as well as the forwarded one: the storage bridge has to
  // check that a message came from THIS frame, and callers (LiveConsole posts
  // preview-eval) still need the node, so the forwarded ref is satisfied from
  // the same node rather than replaced.
  const innerRef = useRef<HTMLIFrameElement | null>(null);
  useImperativeHandle(ref, () => innerRef.current as HTMLIFrameElement, [runKey]);
  useMoshionStorage(innerRef);

  if (runKey === 0 || !code.trim()) {
    return (
      <div className="jscad-empty">
        <p>Click <strong>Run</strong> to execute your moSHion sketch.</p>
      </div>
    );
  }
  const src = `/moshion/runner.html?code=${encodeCode(code)}&r=${runKey}`;
  return (
    <iframe
      ref={innerRef}
      key={runKey}
      id="preview"
      className="jscad-frame"
      // See JscadPreview for the reasoning: allow-same-origin is deliberately
      // absent so student code cannot reach /api/* with the session cookie.
      // Saves therefore go through the parent -- see lib/moshion-storage.ts.
      sandbox="allow-scripts allow-downloads"
      allow="autoplay; fullscreen; gamepad; clipboard-write"
      src={src}
    />
  );
});

export default MoshionPreview;
