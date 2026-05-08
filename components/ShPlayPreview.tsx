'use client';

import { forwardRef, useEffect, useRef } from 'react';
import { encodeCode } from '../lib/encode-code';

interface Props {
  code: string;
  runKey: number;
}

// ShPlayPreview renders the shPlay 3D runner in an iframe.
// Mirrors Q5PlayPreview's structure but points to /shplay/runner.html.
//
// Dispose contract: on unmount we post { source: 'shplay-host', type: 'dispose' }
// to the iframe. The runner.html listener calls renderer.dispose() + scene.clear()
// + cancelAnimationFrame, freeing the WebGL context immediately rather than waiting
// for GC. This prevents Chrome's ~16-context cap during fast lesson navigation.
const ShPlayPreview = forwardRef<HTMLIFrameElement, Props>(function ShPlayPreview(
  { code, runKey },
  ref,
) {
  const localRef = useRef<HTMLIFrameElement | null>(null);

  // Dispose WebGL context on unmount.
  useEffect(() => {
    return () => {
      try {
        localRef.current?.contentWindow?.postMessage(
          { source: 'shplay-host', type: 'dispose' },
          '*',
        );
      } catch {
        // iframe may already be gone — ignore
      }
    };
  }, []);

  if (runKey === 0 || !code.trim()) {
    return (
      <div className="jscad-empty">
        <p>
          Click <strong>Run</strong> to execute your shPlay sketch.
        </p>
      </div>
    );
  }

  const src = `/shplay/runner.html?code=${encodeCode(code)}&r=${runKey}`;

  return (
    <iframe
      ref={(el) => {
        localRef.current = el;
        if (typeof ref === 'function') ref(el);
        else if (ref) ref.current = el;
      }}
      key={runKey}
      id="preview"
      className="jscad-frame"
      allow="autoplay; fullscreen; gamepad; clipboard-write"
      src={src}
    />
  );
});

export default ShPlayPreview;
