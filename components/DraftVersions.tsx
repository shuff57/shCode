'use client';

// A written answer or a flowchart that was changed on this computer AND on another one
// (lib/draft-sync.ts). Text is never merged: this computer's version stays open and the student
// chooses. The version not chosen is stored on this computer FIRST; if that cannot be done
// nothing changes and the notice says so. Afterwards a quiet line offers each kept version back
// until the student removes it; a later choice ADDS to them and never replaces one.

import { useEffect, useState, type CSSProperties } from 'react';
import { whenText } from '../lib/outbox';
import {
  dismissKept, keepMineText, loadKeptList, onKeptChange, swapWithKept, useOtherText,
  type ChoiceResult, type KeptText, type TextKind,
} from '../lib/draft-sync';
import { useUploadStatus } from './UploadStatus';

const bar: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 10,
  margin: '8px 0',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid var(--c-orange)',
  background: 'var(--card)',
  color: 'var(--text)',
  fontFamily: 'var(--font-prose)',
  fontSize: 14,
  lineHeight: 1.45,
};
const primary: CSSProperties = {
  background: 'var(--brand)',
  color: 'var(--on-brand)',
  border: 'none',
  borderRadius: 6,
  padding: '6px 12px',
  fontSize: 13,
  fontFamily: 'var(--font-prose)',
  cursor: 'pointer',
};
const secondary: CSSProperties = { ...primary, background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)' };

const FAILED: Record<Exclude<ChoiceResult, { ok: true }>['why'], string> = {
  none: 'Nothing was changed. Reload the page and try again.',
  'not-kept': 'Nothing was changed: this computer could not keep the other version first.',
  'not-written': 'Nothing was changed: this computer could not save the choice.',
};

interface Props {
  kind: TextKind;
  lessonId: string;
  /** "answer" or "chart". */
  noun: string;
  enabled: boolean;
  /** What is open now (stored before it is swapped out). */
  current: string;
  /** Put this text in the editor (the chosen version). */
  onUse: (text: string) => void;
}

/** The choice, and after it the line that offers the other version back. */
export default function DraftVersions({ kind, lessonId, noun, enabled, current, onUse }: Props) {
  const status = useUploadStatus(lessonId, enabled, kind);
  const [note, setNote] = useState<string | null>(null);
  const [kept, setKept] = useState<KeptText[]>([]);
  const [asking, setAsking] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) { setKept([]); return; }
    const read = () => setKept(loadKeptList(kind, lessonId));
    read();
    return onKeptChange(read);
  }, [kind, lessonId, enabled]);
  useEffect(() => { if (status.state !== 'conflict') setNote(null); }, [status.state]);
  if (!enabled) return null;

  const done = (r: ChoiceResult, use: boolean) => {
    if (!r.ok) { setNote(FAILED[r.why]); return; }
    setNote(null);
    if (use) onUse(r.text);
  };

  if (status.state === 'conflict') {
    const when = status.other?.updatedAt ? whenText(status.other.updatedAt) : null;
    return (
      <div role="alert" data-two-versions={kind} style={bar}>
        <span style={{ flex: '1 1 280px' }}>
          <strong>This {noun} was also changed on another computer{when ? ` (${when})` : ''}.</strong>{' '}
          Yours from this computer is open here. Nothing uploads until you choose. The one you do not choose is kept on this computer.
          {note && <span style={{ display: 'block', color: 'var(--c-orange)', marginTop: 4 }}>{note}</span>}
        </span>
        <span style={{ display: 'flex', gap: 8 }}>
          <button type="button" style={primary} onClick={() => done(keepMineText(kind, lessonId), false)}>Keep mine</button>
          <button type="button" style={secondary} onClick={() => done(useOtherText(kind, lessonId), true)}>Use the other one</button>
        </span>
      </div>
    );
  }

  if (kept.length === 0) return null;
  return (
    <div role="status" data-kept-version={kind} style={{ ...bar, borderColor: 'var(--border)', fontSize: 13, display: 'grid', gap: 8 }}>
      {kept.map((k) => {
        const article = /^[aeiou]/i.test(noun) ? 'An' : 'A';
        const whose = k.which === 'mine' ? `${article} ${noun} you had on this computer` : `${article} ${noun} from another computer`;
        const preview = kind === 'written' ? k.text.replace(/\s+/g, ' ').trim().slice(0, 60) : '';
        return (
          <div key={k.text} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: '1 1 260px' }}>
              {whose} is kept here{k.at ? ` (${whenText(k.at)})` : ''}.
              {preview ? <span style={{ display: 'block', color: 'var(--c-meta)' }}>&ldquo;{preview}{k.text.length > 60 ? '...' : ''}&rdquo;</span> : null}
            </span>
            <span style={{ display: 'flex', gap: 8 }}>
              {asking === k.text ? (
                <>
                  <button type="button" style={secondary} onClick={() => { setAsking(null); dismissKept(kind, lessonId, k.text); }}>Yes, remove it</button>
                  <button type="button" style={primary} onClick={() => setAsking(null)}>Keep it</button>
                </>
              ) : (
                <>
                  <button type="button" style={secondary} onClick={() => done(swapWithKept(kind, lessonId, current, k.text), true)}>Switch to it</button>
                  <button type="button" style={secondary} onClick={() => setAsking(k.text)}>Remove it</button>
                </>
              )}
            </span>
          </div>
        );
      })}
      {note && <span style={{ color: 'var(--c-orange)' }}>{note}</span>}
    </div>
  );
}
