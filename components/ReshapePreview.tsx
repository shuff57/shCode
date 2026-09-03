'use client';

import { forwardRef, useCallback, useEffect, useRef } from 'react';
import type { MutableRefObject } from 'react';
import { encodeCode } from './MoshionPreview';

interface Props {
  code: string;
  runKey: number;
  // Which engine draws this frame. Defaults to the JSCAD runner every lesson
  // and the sandbox has always used; 'brep' is opt-in through ?engine=brep
  // (see SandboxWorkspace.tsx) and points at the OpenCascade runner instead.
  engine?: 'jscad' | 'brep';
}

const ReshapePreview = forwardRef<HTMLIFrameElement, Props>(function ReshapePreview(
  { code, runKey, engine = 'jscad' },
  ref
) {
  const brep = engine === 'brep';

  // Local handle to the iframe DOM node, kept in step with whatever ref the
  // parent forwarded (SandboxWorkspace passes a plain useRef, but forwardRef
  // callers are not required to). The postMessage effect below needs a
  // reliable node to talk to regardless of what shape `ref` is.
  const localRef = useRef<HTMLIFrameElement | null>(null);
  const setRefs = useCallback(
    (node: HTMLIFrameElement | null) => {
      localRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as MutableRefObject<HTMLIFrameElement | null>).current = node;
    },
    [ref]
  );

  // THE B-REP FRAME IS PERSISTENT. JSCAD remounts on every Run (key={runKey}
  // below) because a 240 KB library reparses in milliseconds; the OpenCascade
  // kernel is a 22.9 MB wasm module that costs ~400ms-2s to initialise even
  // with the byte handoff runner-brep.html does (see its file header), so
  // three Runs the JSCAD way would cost that same wait three times for
  // nothing. So for brep the iframe is created ONCE -- on the run that first
  // has code to show -- and never again: `mountedRunKey` freezes the moment
  // that happens, and every later Run pushes its new source into the SAME
  // living frame with `reshape-set-code` instead of changing `src` (which
  // would navigate it and reinitialise the kernel).
  //
  // This is computed during render, not in an effect, so the very first
  // render that has something to show already carries the right `src` --
  // deferring it to an effect would mount the iframe with an empty src first
  // and navigate it a second time once the effect ran.
  const mountedRunKey = useRef<number | null>(null);
  const brepSrc = useRef<string>('');
  if (brep && runKey > 0 && mountedRunKey.current === null) {
    mountedRunKey.current = runKey;
    brepSrc.current = `/reshape/kernel/runner-brep.html?code=${encodeCode(code)}&r=${runKey}`;
  }
  if (!brep) mountedRunKey.current = null; // switching engines: allow a fresh mount if brep returns

  // Every run AFTER the one baked into brepSrc is pushed live. The runner
  // queues a code push that arrives before its kernel has finished loading
  // and applies the latest one once ready -- see its comment on
  // __occtCodeQueue -- so this does not need to wait for a ready signal.
  useEffect(() => {
    if (!brep || mountedRunKey.current === null || runKey === mountedRunKey.current) return;
    localRef.current?.contentWindow?.postMessage({ source: 'reshape-set-code', code }, '*');
  }, [brep, code, runKey]);

  if (runKey === 0 || !code.trim()) {
    return (
      <div className="reshape-empty">
        <p>Write JSCAD code and click <strong>Run</strong> to see your 3D model.</p>
      </div>
    );
  }

  const src = brep
    ? brepSrc.current
    : `/reshape/runner.html?code=${encodeCode(code)}&r=${runKey}`;

  return (
    <iframe
      ref={setRefs}
      // brep: a constant key, so React reconciles the SAME iframe on every
      // re-render instead of recreating it -- that identity is the whole
      // point above. jscad: unchanged, a fresh runKey still remounts.
      key={brep ? 'brep' : runKey}
      id="preview"
      className="reshape-frame"
      // allow-same-origin is deliberately ABSENT. The runner executes student
      // code with document.createElement('script'), so without this the frame
      // shares the app's origin and that code can call /api/* with the user's
      // session cookie attached. Omitting the token puts it in an opaque
      // origin instead. allow-downloads is needed for Save STL/3MF/OBJ.
      // Nothing here reads localStorage or contentDocument, and the parent
      // filters messages by event.source rather than event.origin, so the
      // opaque origin costs nothing.
      sandbox="allow-scripts allow-downloads"
      allow="fullscreen"
      src={src}
    />
  );
});

export default ReshapePreview;
