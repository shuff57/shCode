'use client';

// The Class tab (and /library): every texture and sound shared into the
// student's classes, in one place, with Copy to mine. The same lists also sit
// inside the Textures and Sounds tabs; this is the one place a student finds
// them without knowing where to look, and it says how to share when the class
// has not shared anything yet.

import { useState } from 'react';
import ClassLibrary from './ClassLibrary';

export default function ClassLibraryPanel() {
  const [counts, setCounts] = useState<{ texture?: number | null; sound?: number | null }>({});
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const loaded = counts.texture !== undefined && counts.sound !== undefined;
  const signedOut = loaded && counts.texture === null && counts.sound === null;
  const empty = loaded && !signedOut && !counts.texture && !counts.sound;

  return (
    <div style={{ padding: '4px 2px', color: 'var(--c-fg)' }}>
      <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Class library</h2>
      <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 10px', lineHeight: 1.5 }}>
        Textures and sounds your classmates shared. <strong style={{ color: 'var(--c-fg)' }}>Copy to mine</strong> saves
        a copy into your own library, so <code>sprite.texture = &apos;name&apos;</code> or{' '}
        <code>loadSound(&apos;name&apos;)</code> works in your sketches.
      </p>
      {message && (
        <div role="status" style={{ fontSize: 12, margin: '0 0 8px', color: message.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
          {message.text}
        </div>
      )}
      {signedOut && (
        <p style={{ fontSize: 13, color: 'var(--c-dim)' }}>Sign in to see what your class has shared.</p>
      )}
      {empty && (
        <p style={{ fontSize: 13, color: 'var(--c-dim)', lineHeight: 1.5 }}>
          Nothing shared yet. To share one of yours: open <strong style={{ color: 'var(--c-fg)' }}>Textures</strong> (press
          Load to see your saved textures) or <strong style={{ color: 'var(--c-fg)' }}>Sounds</strong>, and press{' '}
          <strong style={{ color: 'var(--c-fg)' }}>share</strong> on something you saved. It shows up here for everyone in
          your class.
        </p>
      )}
      <ClassLibrary
        kind="texture"
        title="Textures"
        onLoaded={(n) => setCounts((c) => ({ ...c, texture: n }))}
        onMessage={(text, bad) => setMessage({ text, bad })}
      />
      <ClassLibrary
        kind="sound"
        title="Sounds"
        onLoaded={(n) => setCounts((c) => ({ ...c, sound: n }))}
        onMessage={(text, bad) => setMessage({ text, bad })}
      />
    </div>
  );
}
