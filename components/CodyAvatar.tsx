'use client';

// CODY's face in the tutor panel (#88). Five states: idle (ready), thinking (an answer is
// streaming), answered (an answer is on screen), oops (getting an answer failed) and sleepy
// (this computer is offline). The art is our own robot (scripts/make-cody-faces.py writes
// public/cody/*.svg; it also draws excited, proud, curious, confused, surprised, wink and
// focused, ready for later) until the student who asked for this sends their drawings: put
// theirs in public/cody/ and change the paths below. Nothing else needs to change.

export type CodyState = 'idle' | 'thinking' | 'answered' | 'oops' | 'sleepy';

const CODY_ART: Record<CodyState, string> = {
  idle: '/cody/idle.svg',
  thinking: '/cody/thinking.svg',
  answered: '/cody/answered.svg',
  oops: '/cody/oops.svg',
  sleepy: '/cody/sleepy.svg',
};

export const CODY_CAPTION: Record<CodyState, string> = {
  idle: 'Ready when you are',
  thinking: 'Thinking…',
  answered: 'Here is what I found',
  oops: 'Oops, I could not answer that one',
  sleepy: 'Offline. I will be back when you are connected.',
};

export function codyState(s: { busy: boolean; hasAnswer: boolean; failed?: boolean; offline?: boolean }): CodyState {
  if (s.busy) return 'thinking';
  if (s.offline) return 'sleepy';
  if (s.failed) return 'oops';
  return s.hasAnswer ? 'answered' : 'idle';
}

export default function CodyAvatar({ state, size = 40 }: { state: CodyState; size?: number }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, flex: 'none', display: 'inline-block' }}>
      {/* Every face stays mounted so switching never waits on a download; `key` on the shown one
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
