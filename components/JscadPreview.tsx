'use client';

import { forwardRef } from 'react';
import { encodeCode } from './ShPlayPreview';

interface Props {
  code: string;
  runKey: number;
}

const JscadPreview = forwardRef<HTMLIFrameElement, Props>(function JscadPreview(
  { code, runKey },
  ref
) {
  if (runKey === 0 || !code.trim()) {
    return (
      <div className="jscad-empty">
        <p>Write JSCAD code and click <strong>Run</strong> to see your 3D model.</p>
      </div>
    );
  }
  const src = `/jscad/runner.html?code=${encodeCode(code)}&r=${runKey}`;
  return (
    <iframe
      ref={ref}
      key={runKey}
      id="preview"
      className="jscad-frame"
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

export default JscadPreview;
