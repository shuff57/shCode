'use client';

import { forwardRef } from 'react';
import { encodeCode } from '../lib/encode-code';

export { encodeCode };

interface Props {
  code: string;
  runKey: number;
}

const Q5PlayPreview = forwardRef<HTMLIFrameElement, Props>(function Q5PlayPreview(
  { code, runKey },
  ref
) {
  if (runKey === 0 || !code.trim()) {
    return (
      <div className="jscad-empty">
        <p>Click <strong>Run</strong> to execute your q5play sketch.</p>
      </div>
    );
  }
  const src = `/q5play/runner.html?code=${encodeCode(code)}&r=${runKey}`;
  return (
    <iframe
      ref={ref}
      key={runKey}
      id="preview"
      className="jscad-frame"
      allow="autoplay; fullscreen; gamepad; clipboard-write"
      src={src}
    />
  );
});

export default Q5PlayPreview;
