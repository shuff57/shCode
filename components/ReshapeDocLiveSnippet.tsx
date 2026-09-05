'use client';

import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import CodeMirrorPane from './CodeMirrorPane';
import ReshapeScriptPreview from './ReshapeScriptPreview';

interface Props {
  initialCode: string;
  fileKey: string;
}

// Editor + 3D preview pair for reSHape Script snippets in the docs drawer.
// Same shape as MoshionDocLiveSnippet, but the preview runs the script
// through the B-rep kernel (components/ReshapeScriptPreview.tsx) — moSHion
// source cannot execute here and vice versa, so each docs set keeps its own
// snippet component.
export default function ReshapeDocLiveSnippet({ initialCode, fileKey }: Props) {
  const [code, setCode] = useState(initialCode);
  const [runCode, setRunCode] = useState('');
  const [runKey, setRunKey] = useState(0);
  const dirty = code !== initialCode;

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
    border: '1px solid #44475a',
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative' as const,
  };

  return (
    <div style={{ margin: '8px 0 4px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ ...paneStyle, height: 180 }}>
        <CodeMirrorPane value={code} onChange={setCode} fileKey={fileKey} />
      </div>
      <div style={{ ...paneStyle, background: '#111', height: 220 }}>
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
            Click <strong style={{ color: '#50fa7b', margin: '0 4px' }}>Run</strong> to build the model
          </div>
        ) : (
          <ReshapeScriptPreview code={runCode} runKey={runKey} />
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
