'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play } from 'lucide-react';
import { createSoundPreview, type SoundPreview, type SoundPreviewSource, type SoundPreviewState } from '../lib/sound-preview';

/** Preview controls retain their position when paused and stop when removed. */
export default function SoundPreviewButton({ source, sourceKey, label, volume = 1, rate = 1, style }: {
  source: SoundPreviewSource; sourceKey?: string; label: string; volume?: number; rate?: number; style?: CSSProperties;
}) {
  const [state, setState] = useState<SoundPreviewState>('idle');
  const controller = useRef<SoundPreview | null>(null);
  const latest = useRef({ source, volume, rate });
  latest.current = { source, volume, rate };
  const identity = typeof source === 'string' ? source : sourceKey;
  useEffect(() => {
    setState('idle');
    const player = createSoundPreview({
      source: () => { const value = latest.current.source; return typeof value === 'function' ? value() : value; },
      settings: () => latest.current,
      onState: setState,
    });
    controller.current = player;
    return () => { player.dispose(); controller.current = null; };
  }, [identity]);
  const action = state === 'playing' ? 'Pause' : state === 'paused' ? 'Resume' : state === 'loading' ? 'Cancel' : 'Play';
  const Icon = state === 'playing' ? Pause : Play;
  return <>
    <button type="button" aria-label={`${action} ${label}`} aria-pressed={state === 'playing'}
      onClick={() => void controller.current?.toggle()}
      style={{ background: 'transparent', color: 'var(--c-fg)', border: '1px solid var(--c-line)', borderRadius: 4, cursor: 'pointer', padding: '4px 8px', ...style, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <Icon size={13} aria-hidden="true" />{state === 'loading' ? 'Cancel loading' : action}
    </button>
    {state === 'error' && <span role="status" style={{ fontSize: 11, color: 'var(--c-orange)' }}>Could not play {label}. Try again.</span>}
  </>;
}
