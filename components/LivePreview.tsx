'use client';

// sandbox="allow-scripts" WITHOUT allow-same-origin, deliberately.
//
// srcDoc here is built by lib/preview-builder.ts from student-authored
// lesson files, so the framed document must not get this page's origin:
// with allow-scripts + allow-same-origin together, the sandbox is void and
// student code could reach parent DOM, cookies, and localStorage. Dropping
// allow-same-origin makes the frame an opaque origin instead.
//
// What this frame needs still works:
//   - the console/error reporter posts to window.parent with postMessage(.., '*')
//     (lib/preview-builder.ts), which is allowed from an opaque origin;
//   - every external <script src>/<link href> is inlined by buildPreviewHtml
//     before this frame renders, so there are no same-origin fetches;
//   - the localStorage labs run in console mode inside a Worker with its own
//     in-memory localStorage shim (lib/js-runner-source.ts), not in this frame.
// If a future lesson mode needs real storage here, give it a postMessage
// bridge to the parent, not allow-same-origin.
export default function LivePreview({ srcDoc }: { srcDoc: string }) {
  return (
    <iframe id="preview" sandbox="allow-scripts allow-downloads allow-modals" srcDoc={srcDoc} />
  );
}