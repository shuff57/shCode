'use client';

// CODY's face in the tutor panel (#88). Three states: idle (ready), thinking (an answer is
// streaming), answered (an answer is on screen). The art is our own placeholder SVGs in
// public/cody/ until the student who asked for this sends their PNGs: drop them in
// public/cody/ and change the three paths below. Nothing else needs to change.

export type CodyState = 'idle' | 'thinking' | 'answered';

const CODY_ART: Record<CodyState, string> = {
  idle: '/cody/idle.svg',
  thinking: '/cody/thinking.svg',
  answered: '/cody/answered.svg',
};

export const CODY_CAPTION: Record<CodyState, string> = {
  idle: 'Ready when you are',
  thinking: 'Thinking…',
  answered: 'Here is what I found',
};

export function codyState(s: { busy: boolean; hasAnswer: boolean }): CodyState {
  if (s.busy) return 'thinking';
  return s.hasAnswer ? 'answered' : 'idle';
}

export default function CodyAvatar({ state, size = 40 }: { state: CodyState; size?: number }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, flex: 'none', display: 'inline-block' }}>
      {/* All three stay mounted so switching never waits on a download; `key` on the shown one
          remounts it so the answered smile draws in again on every new answer. */}
      {(Object.keys(CODY_ART) as CodyState[]).map((s) => (
        <img
          key={s === state ? `${s}-on` : s}
          src={CODY_ART[s]}
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          style={{ position: 'absolute', inset: 0, opacity: s === state ? 1 : 0, transition: 'opacity 150ms ease-out' }}
        />
      ))}
    </span>
  );
}
