'use client';

// The problem picker for a lesson whose starter is worded per problem (3.9.1).
//
// The lesson gives the pair the shape of the plan, and the shape is worded per
// problem ("set meet to ______" vs "set stock to ______"), so the editor should
// open onto the skeleton for the problem the pair actually picked. Choosing
// here writes that starter over the graded file and remembers the pick, which
// is what makes Reset restore the pair's own skeleton rather than the first
// problem's (lib/starter-variants.ts, lib/store.ts).
//
// A pick only overwrites work when the file still holds a starter; anything
// typed is confirmed first, in plain words about what is lost.

import { useEffect, useState } from 'react';
import type { Lesson } from '../lib/types';
import { useLessonStore } from '../lib/store';
import {
  isUntouchedStarter,
  rememberedStarter,
  rememberStarter,
  starterFile,
} from '../lib/starter-variants';

export default function StarterPicker({ lesson }: { lesson: Lesson }) {
  const files = useLessonStore((s) => s.fileContents);
  const updateFile = useLessonStore((s) => s.updateFile);
  const selectFile = useLessonStore((s) => s.selectFile);
  const variants = lesson.starterVariants ?? [];
  const [picked, setPicked] = useState(variants[0]?.id ?? '');
  const [note, setNote] = useState<string | null>(null);

  // The remembered pick is read after mount so the prerendered markup matches.
  useEffect(() => {
    const r = rememberedStarter(lesson);
    if (r) setPicked(r.id);
  }, [lesson]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 3000);
    return () => clearTimeout(t);
  }, [note]);

  if (variants.length < 2) return null;

  function choose(id: string) {
    const v = variants.find((x) => x.id === id);
    if (!v || v.id === picked) return;
    const file = starterFile(v);
    const text = files[file] ?? '';
    if (
      !isUntouchedStarter(lesson, text) &&
      !window.confirm(
        `Load the ${v.label} starter? It replaces what ${file} holds now, and that cannot be undone.`
      )
    ) {
      return;
    }
    updateFile(file, v.text);
    rememberStarter(lesson.id, v.id);
    setPicked(v.id);
    if (file in files) selectFile(file);
    setNote(`Loaded the ${v.label} starter.`);
  }

  return (
    <div
      role="group"
      aria-label="Your problem"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        background: '#282a36',
        border: '1px solid #44475a',
        borderRadius: 6,
        padding: '8px 12px',
        marginBottom: 12,
      }}
    >
      <span style={{ color: '#8393c4', fontSize: 13, fontWeight: 600, marginRight: 4 }}>
        Your problem:
      </span>
      {variants.map((v) => {
        const on = v.id === picked;
        return (
          <button
            key={v.id}
            type="button"
            aria-pressed={on}
            onClick={() => choose(v.id)}
            style={{
              padding: '4px 12px',
              minHeight: 30,
              borderRadius: 6,
              border: `1px solid ${on ? '#bd93f9' : '#44475a'}`,
              background: on ? '#bd93f9' : '#282a36',
              color: on ? '#282a36' : '#f8f8f2',
              fontSize: 13,
              fontWeight: 600,
              cursor: on ? 'default' : 'pointer',
            }}
          >
            {v.label}
          </button>
        );
      })}
      <span role="status" aria-live="polite" style={{ color: '#50fa7b', fontSize: 13, marginLeft: 4 }}>
        {note ?? ''}
      </span>
    </div>
  );
}
