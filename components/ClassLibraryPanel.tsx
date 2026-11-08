'use client';

// The Library tab (and /library): your own saved textures and sounds, each with
// Share with class, then everything shared into your classes, with Copy to mine.
// The shared lists also sit inside the Textures and Sounds tabs; this is the one
// place a student (or teacher) finds both without knowing where to look.

import { useState } from 'react';
import ClassLibrary from './ClassLibrary';
import MyLibrary from './MyLibrary';

export default function ClassLibraryPanel() {
  const [counts, setCounts] = useState<{ texture?: number | null; sound?: number | null }>({});
  const [message, setMessage] = useState<{ text: string; bad: boolean } | null>(null);
  const loaded = counts.texture !== undefined && counts.sound !== undefined;
  const signedOut = loaded && counts.texture === null && counts.sound === null;
  const empty = loaded && !signedOut && !counts.texture && !counts.sound;

  return (
    <div style={{ padding: '4px 2px', color: 'var(--c-fg)' }}>
      <h2 style={{ fontSize: 16, margin: '0 0 4px' }}>Library</h2>
      <p style={{ fontSize: 13, color: 'var(--c-dim)', margin: '0 0 6px', lineHeight: 1.5 }}>
        Your textures and sounds, and the ones your class shared. <strong style={{ color: 'var(--c-fg)' }}>Copy to mine</strong> saves
        a copy into your own, so <code>sprite.texture = &apos;name&apos;</code> or{' '}
        <code>loadSound(&apos;name&apos;)</code> works in your sketches.
      </p>
      {message && (
        <div role="status" style={{ fontSize: 12, margin: '0 0 8px', color: message.bad ? 'var(--c-red)' : 'var(--c-green)' }}>
          {message.text}
        </div>
      )}
      <MyLibrary onMessage={(text, bad) => setMessage({ text, bad })} />
      <h3 style={{ fontSize: 14, margin: '18px 0 0', color: 'var(--c-fg)' }}>Shared with your class</h3>
      {signedOut && (
        <p style={{ fontSize: 13, color: 'var(--c-dim)' }}>Sign in to see what your class has shared.</p>
      )}
      {empty && (
        <p style={{ fontSize: 13, color: 'var(--c-dim)', lineHeight: 1.5 }}>
          Nothing shared yet. Press <strong style={{ color: 'var(--c-fg)' }}>Share with class</strong> on one of yours above
          and it shows up here for everyone in your class.
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
