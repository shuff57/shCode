'use client';

import { useRef, useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import CodeMirrorPane from './CodeMirrorPane';
import { encodeCode } from './MoshionPreview';
import { useMoshionStorage } from '../lib/moshion-storage';

interface Props {
  initialCode: string;
  fileKey: string;
}

// Editor + preview pair for moSHion snippets in the docs sidebar. Editor and
// preview are stacked vertically, both square. Preview snapshots the code at
// Run-click time — typing does not re-render the iframe.
export default function MoshionDocLiveSnippet({ initialCode, fileKey }: Props) {
  const [code, setCode] = useState(initialCode);
  const [runCode, setRunCode] = useState('');
  const [runKey, setRunKey] = useState(0);
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const dirty = code !== initialCode;

  // storeItem/getItem cannot reach localStorage from inside the sandbox; the
  // host page keeps the store. See lib/moshion-storage.ts.
  useMoshionStorage(frameRef);

  const handleRun = () => {
    setRunCode(code);
    setRunKey((k) => k + 1);
  };

  const handleReset = () => {
    setCode(initialCode);
    setRunCode('');
    setRunKey(0);
  };

  const paneStyle = {
    width: '100%',
    aspectRatio: '1 / 1',
    border: '1px solid #44475a',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative' as const,
  };

  return (
    <div style={{ margin: '8px 0 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={paneStyle}>
        <CodeMirrorPane value={code} onChange={setCode} fileKey={fileKey} />
      </div>
      <div style={{ ...paneStyle, background: '#111' }}>
        {runKey === 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: '#6272a4',
              fontSize: '0.8rem',
              padding: 8,
              textAlign: 'center',
            }}
          >
            Click <strong style={{ color: '#50fa7b', margin: '0 4px' }}>Run</strong> to preview
          </div>
        ) : (
          <iframe
            ref={frameRef}
            key={runKey}
            title="moSHion preview"
            src={`/moshion/runner.html?code=${encodeCode(runCode)}&r=${runKey}`}
            // See ReshapePreview: allow-same-origin is deliberately absent.
            sandbox="allow-scripts allow-downloads"
            allow="autoplay; gamepad"
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        )}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          type="button"
          onClick={handleRun}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: '#50fa7b',
            color: '#21222c',
            border: 'none',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Play size={12} /> Run
        </button>
        <button
          type="button"
          disabled={!dirty && runKey === 0}
          onClick={handleReset}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            background: 'transparent',
            color: dirty || runKey > 0 ? '#bd93f9' : '#6272a4',
            border: '1px solid #44475a',
            borderRadius: 4,
            padding: '4px 10px',
            fontSize: '0.75rem',
            fontWeight: 600,
            cursor: dirty || runKey > 0 ? 'pointer' : 'default',
          }}
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>
    </div>
  );
}
