'use client';

export default function LivePreview({ srcDoc }: { srcDoc: string }) {
  return (
    <iframe
      className="w-full h-full border"
      sandbox="allow-scripts allow-same-origin"
      srcDoc={srcDoc}
    />
  );
}
