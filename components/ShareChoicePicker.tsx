'use client';

// "Who can do what with it": the four sharing choices (lib/share-choice.ts) as
// a radio group, with the one-line open-source teaching sentence above it and a
// plain line under each choice. Used by Publish game (PublishGameButton), the
// Library's "Share with class" on a game (GamesLibrary) and on a picture or
// sound (ShareToggle). When the item is a remix of a "keep remixes open" one,
// every choice but that one is disabled and the reason is said in a sentence.
//
// RemixCredit, also here, is the "Remixed from <title> by <name>" line for a
// remixed game, picture or sound.

import { useEffect, useState } from 'react';
import { getCurrentUser } from '../lib/auth';
import {
  CHOICE_TEXT,
  JUST_PLAY_NOTE,
  OPEN_SOURCE_LINE,
  SHARE_CHOICES,
  creditLine,
  keepOpenReason,
  readLastChoice,
  requiredChoice,
  writeLastChoice,
  type Provenance,
  type ShareChoice,
  type ShareThing,
} from '../lib/share-choice';

/**
 * The student's last choice for `thing` in this browser (the chooser's default),
 * and a function to remember a new one. Starts at 'credit' until the account is known.
 */
export function useLastChoice(thing: ShareThing): [ShareChoice, (c: ShareChoice) => void] {
  const [email, setEmail] = useState<string | null>(null);
  const [choice, setChoice] = useState<ShareChoice>(() => readLastChoice(thing, null));
  useEffect(() => {
    let live = true;
    void getCurrentUser().then((u) => {
      if (!live || !u) return;
      setEmail(u.email);
      setChoice(readLastChoice(thing, u.email));
    });
    return () => { live = false; };
  }, [thing]);
  return [choice, (c: ShareChoice) => { setChoice(c); writeLastChoice(thing, email, c); }];
}

/** The choice to show for an item: the one a remix is held to, else `wanted`. */
export function lockedChoice(from: Provenance | null | undefined, wanted: ShareChoice): ShareChoice {
  return (from && requiredChoice(from.choice)) || wanted;
}

export default function ShareChoicePicker({ thing, value, onChange, from, idPrefix, compact = false }: {
  thing: ShareThing;
  value: ShareChoice;
  onChange: (c: ShareChoice) => void;
  /** Where this item was remixed from; a "keep remixes open" original locks the choice. */
  from?: Provenance | null;
  /** Unique per mounted picker: names the radio group. */
  idPrefix: string;
  /** Smaller type, for a popover. */
  compact?: boolean;
}) {
  const locked = from ? requiredChoice(from.choice) : null;
  const text = CHOICE_TEXT[thing];
  const size = compact ? 12 : 13;
  return (
    <fieldset style={{ border: '1px solid var(--c-line)', borderRadius: 4, padding: '6px 10px 8px', margin: '0 0 10px', minWidth: 0 }}>
      <legend style={{ fontSize: size, padding: '0 4px', color: 'var(--c-fg)' }}>Who can do what with it</legend>
      <p style={{ margin: '0 0 6px', fontSize: size - 1, color: 'var(--c-dim)', lineHeight: 1.45 }}>{OPEN_SOURCE_LINE[thing]}</p>
      {locked && from && (
        <p style={{ margin: '0 0 6px', fontSize: size - 1, color: 'var(--c-orange)', lineHeight: 1.45 }}>{keepOpenReason(from)}</p>
      )}
      <div role="radiogroup" aria-label="Who can do what with it" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SHARE_CHOICES.map((c) => {
          const disabled = !!locked && c !== locked;
          const id = `${idPrefix}-${c}`;
          return (
            <label key={c} htmlFor={id} style={{
              display: 'flex', gap: 6, alignItems: 'flex-start', cursor: disabled ? 'default' : 'pointer',
              opacity: disabled ? 0.5 : 1, fontSize: size, lineHeight: 1.4,
            }}>
              <input
                id={id}
                type="radio"
                name={`${idPrefix}-choice`}
                value={c}
                checked={value === c}
                disabled={disabled}
                onChange={() => onChange(c)}
                style={{ marginTop: 3 }}
              />
              <span style={{ minWidth: 0 }}>
                <strong style={{ color: 'var(--c-fg)', fontWeight: 600 }}>{text[c].label}</strong>
                <span style={{ display: 'block', color: 'var(--c-dim)', fontSize: size - 1 }}>{text[c].line}</span>
                {thing === 'game' && c === 'play' && (
                  <span style={{ display: 'block', color: 'var(--c-dim)', fontSize: size - 1 }}>{JUST_PLAY_NOTE}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** "Remixed from Plane by Sam W." for a remixed game, picture or sound; nothing for the student's own work. */
export function RemixCreditLine({ from, style }: { from: Provenance | null | undefined; style?: React.CSSProperties }) {
  if (!from) return null;
  return (
    <span style={{ display: 'block', fontSize: 11, color: 'var(--c-dim)', overflowWrap: 'anywhere', ...style }}>
      {creditLine(from)}
    </span>
  );
}
