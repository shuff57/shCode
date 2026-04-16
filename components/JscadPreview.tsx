'use client';

export default function JscadPreview({ srcDoc }: { srcDoc: string }) {
  if (!srcDoc) {
    return (
      <div className="jscad-empty">
        <p>Write JSCAD code and click <strong>Run</strong> to see your 3D model.</p>
      </div>
    );
  }
  return (
    <iframe
      id="preview"
      className="jscad-frame"
      sandbox="allow-scripts allow-same-origin"
      srcDoc={srcDoc}
    />
  );
}
