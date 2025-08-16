'use client';

export default function LivePreview({ srcDoc }: { srcDoc: string }) {
  return (
    <iframe id="preview" sandbox="allow-scripts allow-same-origin" srcDoc={srcDoc} />
  );
}
