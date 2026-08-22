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
      allow="fullscreen"
      src={src}
    />
  );
});

export default JscadPreview;
